import bcrypt from 'bcryptjs'
import prisma from '../config/database.js'
import { parsePage, skip } from '../utils/pagination.js'

/**
 * Lista todos os usuários (somente ADMIN).
 * Suporta filtros por role, busca por nome/email e paginação.
 */
export const listUsers = async (query) => {
  const { page, perPage } = parsePage(query)
  const where = { active: true }

  if (query.role) where.role = query.role
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: skip(page, perPage),
      take: perPage,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        birthdate: true,
        role: true,
        active: true,
        createdAt: true,
        _count: { select: { registrations: true, organizedEvents: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, page, perPage }
}

/**
 * Busca um usuário por ID.
 * Atleta só pode ver o próprio perfil; admin/org veem qualquer um.
 */
export const getUser = async (targetId, requester) => {
  if (requester.role === 'ATHLETE' && requester.sub !== targetId) {
    throw Object.assign(new Error('Sem permissão para acessar este perfil.'), { statusCode: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phone: true,
      birthdate: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { registrations: true, organizedEvents: true } },
    },
  })

  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 404 })
  return user
}

/**
 * Atualiza dados de um usuário.
 * Atleta só pode editar o próprio perfil e não pode alterar role.
 * Admin pode alterar qualquer campo, inclusive role.
 */
export const updateUser = async (targetId, data, requester) => {
  if (requester.role === 'ATHLETE' && requester.sub !== targetId) {
    throw Object.assign(new Error('Sem permissão para editar este perfil.'), { statusCode: 403 })
  }

  const exists = await prisma.user.findUnique({ where: { id: targetId } })
  if (!exists) throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 404 })

  // Atleta não pode promover/rebaixar roles
  const updates = { ...data }
  if (requester.role !== 'ADMIN') delete updates.role

  // Se vai mudar email ou CPF, verifica unicidade
  if (updates.email && updates.email !== exists.email) {
    const dup = await prisma.user.findUnique({ where: { email: updates.email } })
    if (dup) throw Object.assign(new Error('E-mail já cadastrado.'), { statusCode: 409 })
  }
  if (updates.cpf && updates.cpf !== exists.cpf) {
    const dup = await prisma.user.findUnique({ where: { cpf: updates.cpf } })
    if (dup) throw Object.assign(new Error('CPF já cadastrado.'), { statusCode: 409 })
  }

  if (updates.birthdate) updates.birthdate = new Date(updates.birthdate)

  return prisma.user.update({
    where: { id: targetId },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      cpf: true,
      phone: true,
      birthdate: true,
      role: true,
      updatedAt: true,
    },
  })
}

/**
 * Altera a senha do próprio usuário.
 * Requer a senha atual para confirmação.
 */
export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 404 })

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw Object.assign(new Error('Senha atual incorreta.'), { statusCode: 400 })

  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { password: hash } })
  // Invalida todos os refresh tokens ao trocar senha
  await prisma.refreshToken.deleteMany({ where: { userId } })
  return { message: 'Senha alterada com sucesso. Faça login novamente.' }
}

/**
 * Desativa (soft delete) um usuário. Apenas ADMIN.
 */
export const deactivateUser = async (targetId) => {
  const user = await prisma.user.findUnique({ where: { id: targetId } })
  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 404 })
  if (!user.active) throw Object.assign(new Error('Usuário já desativado.'), { statusCode: 400 })

  await prisma.refreshToken.deleteMany({ where: { userId: targetId } })
  return prisma.user.update({
    where: { id: targetId },
    data: { active: false },
    select: { id: true, name: true, active: true },
  })
}

/**
 * Reativa um usuário desativado. Apenas ADMIN.
 */
export const reactivateUser = async (targetId) => {
  const user = await prisma.user.findUnique({ where: { id: targetId } })
  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 404 })
  if (user.active) throw Object.assign(new Error('Usuário já está ativo.'), { statusCode: 400 })

  return prisma.user.update({
    where: { id: targetId },
    data: { active: true },
    select: { id: true, name: true, active: true },
  })
}

/**
 * Retorna o dashboard de um atleta: inscrições, cashbacks e histórico de lutas.
 */
export const getAthleteDashboard = async (athleteId, requester) => {
  if (requester.role === 'ATHLETE' && requester.sub !== athleteId) {
    throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })
  }

  const [registrations, cashbacks, fightStats] = await prisma.$transaction([
    prisma.registration.findMany({
      where: { athleteId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        event: { select: { id: true, title: true, startDate: true, venueCity: true } },
        category: { select: { name: true, belt: true } },
        payment: { select: { status: true, amountCents: true } },
      },
    }),
    prisma.cashback.findMany({
      where: { userId: athleteId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amountCents: true, percentUsed: true, granted: true, createdAt: true },
    }),
    prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE winner_id = ${athleteId}::uuid) AS wins,
        COUNT(*) FILTER (WHERE (fighter_a_id = ${athleteId}::uuid OR fighter_b_id = ${athleteId}::uuid) AND status = 'FINISHED') AS total_fights
      FROM fights
    `,
  ])

  const totalCashbackCents = cashbacks.reduce((acc, c) => acc + c.amountCents, 0)
  const stats = fightStats[0] ?? { wins: 0, total_fights: 0 }

  return {
    registrations,
    cashbacks: { list: cashbacks, totalCents: totalCashbackCents },
    fightStats: {
      wins: Number(stats.wins ?? 0),
      totalFights: Number(stats.total_fights ?? 0),
    },
  }
}