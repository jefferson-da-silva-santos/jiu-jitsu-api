import prisma from '../config/database.js'
import { parsePage, skip } from '../utils/pagination.js'

/**
 * Cria um novo pedido para o usuário autenticado.
 * Valida estoque de todos os itens antes de debitar — tudo em uma transação atômica.
 *
 * @param {{ items: Array<{ productId: string, quantity: number }> }} data
 * @param {string} userId
 */
export const createOrder = async ({ items }, userId) => {
  // 1. Carrega todos os produtos solicitados de uma vez
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  })

  // 2. Mapeia para lookup rápido
  const productMap = new Map(products.map((p) => [p.id, p]))

  // 3. Valida existência e estoque de cada item
  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product)
      throw Object.assign(new Error(`Produto ${item.productId} não encontrado ou inativo.`), { statusCode: 404 })
    if (product.stock < item.quantity)
      throw Object.assign(
        new Error(`Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`),
        { statusCode: 400 }
      )
  }

  // 4. Calcula total
  const totalCents = items.reduce((acc, item) => {
    const product = productMap.get(item.productId)
    return acc + product.price * item.quantity
  }, 0)

  // 5. Cria pedido, itens e debita estoque em transação atômica
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        totalCents,
        status: 'PENDING',
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCents: productMap.get(item.productId).price,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
      },
    })

    // Debita estoque de cada produto
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    return order
  })
}

/**
 * Lista pedidos com filtros.
 * - ATHLETE: vê apenas os próprios
 * - ADMIN/ORGANIZER: vê todos (pode filtrar por userId, status)
 */
export const listOrders = async (query, requester) => {
  const { page, perPage } = parsePage(query)
  const where = {}

  if (requester.role === 'ATHLETE') {
    where.userId = requester.sub
  } else {
    if (query.userId) where.userId = query.userId
  }

  if (query.status) where.status = query.status

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip: skip(page, perPage),
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, category: true, imageUrl: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ])

  return { orders, total, page, perPage }
}

/**
 * Retorna um pedido pelo ID.
 * Atleta só pode ver o próprio.
 */
export const getOrder = async (id, requester) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, category: true, imageUrl: true, price: true } },
        },
      },
    },
  })

  if (!order) throw Object.assign(new Error('Pedido não encontrado.'), { statusCode: 404 })
  if (requester.role === 'ATHLETE' && order.userId !== requester.sub)
    throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })

  return order
}

/**
 * Atualiza o status de um pedido. Apenas ADMIN.
 * Statuses válidos: PENDING | PAID | SHIPPED | DELIVERED | CANCELLED
 */
export const updateOrderStatus = async (id, status) => {
  const validStatuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
  if (!validStatuses.includes(status))
    throw Object.assign(new Error(`Status inválido. Use: ${validStatuses.join(', ')}`), { statusCode: 400 })

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw Object.assign(new Error('Pedido não encontrado.'), { statusCode: 404 })

  return prisma.order.update({ where: { id }, data: { status } })
}

/**
 * Cancela um pedido e devolve o estoque dos itens.
 * Atleta só cancela o próprio e apenas se PENDING.
 * Admin pode cancelar qualquer status.
 */
export const cancelOrder = async (id, requester) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!order) throw Object.assign(new Error('Pedido não encontrado.'), { statusCode: 404 })

  if (requester.role === 'ATHLETE') {
    if (order.userId !== requester.sub)
      throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })
    if (order.status !== 'PENDING')
      throw Object.assign(new Error('Não é possível cancelar um pedido que já está em andamento.'), { statusCode: 400 })
  }

  if (order.status === 'CANCELLED')
    throw Object.assign(new Error('Pedido já cancelado.'), { statusCode: 400 })

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.update({ where: { id }, data: { status: 'CANCELLED' } })

    // Devolve estoque
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }

    return cancelled
  })
}

/**
 * Resumo de vendas para o dashboard admin.
 */
export const getOrderStats = async () => {
  const [total, byStatus, revenue, topProducts] = await prisma.$transaction([
    prisma.order.count(),
    prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.order.aggregate({
      where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
      _sum: { totalCents: true },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ])

  const statusMap = byStatus.reduce((acc, s) => {
    acc[s.status] = s._count.status
    return acc
  }, {})

  // Enriquece top produtos com nome
  const topProductIds = topProducts.map((p) => p.productId)
  const productNames = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(productNames.map((p) => [p.id, p.name]))

  return {
    total,
    byStatus: statusMap,
    revenue: { totalCents: revenue._sum.totalCents ?? 0 },
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: nameMap.get(p.productId) ?? 'Desconhecido',
      totalSold: p._sum.quantity,
    })),
  }
}