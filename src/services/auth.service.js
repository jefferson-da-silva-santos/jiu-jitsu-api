import bcrypt from 'bcryptjs'
import prisma from '../config/database.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { env } from '../config/env.js'

export const register = async ({ name, email, password, cpf, phone, birthdate }) => {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { cpf }] } })
  if (exists) throw Object.assign(new Error('E-mail ou CPF já cadastrado.'), { statusCode: 409 })

  const hash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hash, cpf, phone, birthdate: birthdate ? new Date(birthdate) : undefined },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return user
}

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) throw Object.assign(new Error('Credenciais inválidas.'), { statusCode: 401 })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw Object.assign(new Error('Credenciais inválidas.'), { statusCode: 401 })

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role })
  const refreshToken = signRefreshToken({ id: user.id })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } })

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

export const refresh = async (token) => {
  let payload
  try { payload = verifyRefreshToken(token) } catch {
    throw Object.assign(new Error('Refresh token inválido.'), { statusCode: 401 })
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token expirado ou inválido.'), { statusCode: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.active) throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 401 })

  // Rotate: remove o antigo, cria novo
  await prisma.refreshToken.delete({ where: { token } })
  const newRefresh = signRefreshToken({ id: user.id })
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token: newRefresh, userId: user.id, expiresAt } })

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role })
  return { accessToken, refreshToken: newRefresh }
}

export const logout = async (token) => {
  await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => { })
}

export const me = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, cpf: true, phone: true, birthdate: true, role: true, createdAt: true },
  })
}