import prisma from '../config/database.js'
import { parsePage, skip } from '../utils/pagination.js'

/**
 * Lista produtos com filtros de categoria, busca e paginação.
 * Público: apenas ativos. Admin: todos.
 */
export const listProducts = async (query, requester = null) => {
  const { page, perPage } = parsePage(query)
  const where = {}

  // Não-admin vê apenas produtos ativos
  if (!requester || requester.role !== 'ADMIN') {
    where.active = true
  }

  if (query.category) where.category = query.category
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }
  if (query.inStock === 'true') where.stock = { gt: 0 }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: skip(page, perPage),
      take: perPage,
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, page, perPage }
}

/**
 * Retorna um produto pelo ID.
 */
export const getProduct = async (id, requester = null) => {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 })

  if (!product.active && (!requester || requester.role !== 'ADMIN'))
    throw Object.assign(new Error('Produto não disponível.'), { statusCode: 404 })

  return product
}

/**
 * Cria um novo produto. Apenas ADMIN.
 */
export const createProduct = async (data) => {
  return prisma.product.create({ data })
}

/**
 * Atualiza um produto. Apenas ADMIN.
 */
export const updateProduct = async (id, data) => {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 })
  return prisma.product.update({ where: { id }, data })
}

/**
 * Ajusta o estoque de um produto (delta positivo ou negativo). Apenas ADMIN.
 * Ex: adjustStock(id, +10) adiciona; adjustStock(id, -5) remove.
 */
export const adjustStock = async (id, delta) => {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 })

  const newStock = product.stock + delta
  if (newStock < 0) throw Object.assign(new Error(`Estoque insuficiente. Disponível: ${product.stock}`), { statusCode: 400 })

  return prisma.product.update({
    where: { id },
    data: { stock: newStock },
  })
}

/**
 * Desativa um produto (soft delete). Não remove dados de pedidos históricos.
 */
export const deactivateProduct = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 })
  return prisma.product.update({ where: { id }, data: { active: false } })
}

/**
 * Reativa um produto desativado.
 */
export const reactivateProduct = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 })
  return prisma.product.update({ where: { id }, data: { active: true } })
}

/**
 * Faz upload de imagem do produto (atualiza imageUrl).
 */
export const uploadProductImage = async (id, imageUrl) => {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Produto não encontrado.'), { statusCode: 404 })
  return prisma.product.update({ where: { id }, data: { imageUrl } })
}