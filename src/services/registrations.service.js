import prisma from '../config/database.js'
import { env } from '../config/env.js'
import { parsePage, skip } from '../utils/pagination.js'

/**
 * Cria uma inscrição para o atleta autenticado.
 * Valida: prazo, vagas, duplicidade, e cria o Payment inicial.
 */
export const createRegistration = async ({ eventId, categoryId, teamName, notes }, athleteId) => {
  // 1. Carrega evento e categoria juntos para validação
  const [event, category] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.eventCategory.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED', 'REJECTED'] } } } } } },
    }),
  ])

  if (!event) throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404 })
  if (!category) throw Object.assign(new Error('Categoria não encontrada.'), { statusCode: 404 })
  if (category.eventId !== eventId)
    throw Object.assign(new Error('Categoria não pertence a este evento.'), { statusCode: 400 })

  // 2. Valida status do evento
  if (!['PUBLISHED', 'ONGOING'].includes(event.status))
    throw Object.assign(new Error('Inscrições encerradas: evento não está publicado.'), { statusCode: 400 })

  // 3. Valida prazo de inscrição
  if (new Date() > new Date(event.registrationDeadline))
    throw Object.assign(new Error('Prazo de inscrições encerrado.'), { statusCode: 400 })

  // 4. Valida vagas da categoria
  if (category.maxSlots !== null && category._count.registrations >= category.maxSlots)
    throw Object.assign(new Error('Categoria sem vagas disponíveis.'), { statusCode: 400 })

  // 5. Valida vagas totais do evento
  if (event.maxAthletes !== null) {
    const totalRegs = await prisma.registration.count({
      where: { eventId, status: { notIn: ['CANCELLED', 'REJECTED'] } },
    })
    if (totalRegs >= event.maxAthletes)
      throw Object.assign(new Error('Evento sem vagas disponíveis.'), { statusCode: 400 })
  }

  // 6. Verifica duplicidade: atleta já inscrito nesta categoria
  const duplicate = await prisma.registration.findUnique({
    where: { eventId_categoryId_athleteId: { eventId, categoryId, athleteId } },
  })
  if (duplicate && duplicate.status !== 'CANCELLED')
    throw Object.assign(new Error('Você já está inscrito nesta categoria.'), { statusCode: 409 })

  // 7. Calcula valor: preço da categoria + taxa da plataforma
  const feeCents = event.platformFeeOverride ?? env.PLATFORM_FEE_CENTS
  const amountCents = category.price + feeCents

  // 8. Cria inscrição + payment em transação atômica
  const registration = await prisma.$transaction(async (tx) => {
    const reg = await tx.registration.create({
      data: { eventId, categoryId, athleteId, teamName, notes, status: 'PENDING' },
    })

    await tx.payment.create({
      data: {
        registrationId: reg.id,
        amountCents,
        platformFeeCents: feeCents,
        status: 'PENDING',
      },
    })

    return reg
  })

  return prisma.registration.findUnique({
    where: { id: registration.id },
    include: {
      event: { select: { id: true, title: true, startDate: true } },
      category: { select: { id: true, name: true, belt: true, price: true } },
      payment: { select: { amountCents: true, platformFeeCents: true, status: true } },
    },
  })
}

/**
 * Lista inscrições com filtros.
 * - ADMIN/ORGANIZER: vê todas (pode filtrar por eventId, athleteId, status)
 * - ATHLETE: vê apenas as próprias
 */
export const listRegistrations = async (query, requester) => {
  const { page, perPage } = parsePage(query)
  const where = {}

  if (requester.role === 'ATHLETE') {
    where.athleteId = requester.sub
  } else {
    if (query.athleteId) where.athleteId = query.athleteId
  }

  if (query.eventId) where.eventId = query.eventId
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.status) where.status = query.status
  if (query.teamName) where.teamName = { contains: query.teamName, mode: 'insensitive' }

  const [registrations, total] = await prisma.$transaction([
    prisma.registration.findMany({
      where,
      skip: skip(page, perPage),
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        athlete: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true, startDate: true, venueCity: true } },
        category: { select: { id: true, name: true, belt: true, gender: true } },
        payment: { select: { amountCents: true, platformFeeCents: true, status: true, receiptUrl: true } },
      },
    }),
    prisma.registration.count({ where }),
  ])

  return { registrations, total, page, perPage }
}

/**
 * Retorna uma inscrição pelo ID.
 * Atleta só pode ver a própria.
 */
export const getRegistration = async (id, requester) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      athlete: { select: { id: true, name: true, email: true, phone: true } },
      event: { select: { id: true, title: true, startDate: true, venueName: true, venueAddress: true, venueCity: true, venueState: true } },
      category: { select: { id: true, name: true, belt: true, gender: true, weightMin: true, weightMax: true, isAbsolute: true } },
      payment: true,
      cashback: true,
    },
  })

  if (!reg) throw Object.assign(new Error('Inscrição não encontrada.'), { statusCode: 404 })
  if (requester.role === 'ATHLETE' && reg.athleteId !== requester.sub)
    throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })

  return reg
}

/**
 * Cancela uma inscrição.
 * - Atleta só cancela a própria e apenas se status PENDING ou PAYMENT_SENT
 * - ADMIN/ORGANIZER podem cancelar qualquer uma
 */
export const cancelRegistration = async (id, requester) => {
  const reg = await prisma.registration.findUnique({ where: { id }, include: { payment: true } })
  if (!reg) throw Object.assign(new Error('Inscrição não encontrada.'), { statusCode: 404 })

  if (requester.role === 'ATHLETE') {
    if (reg.athleteId !== requester.sub)
      throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })
    if (!['PENDING', 'PAYMENT_SENT'].includes(reg.status))
      throw Object.assign(new Error('Não é possível cancelar inscrição com pagamento já aprovado.'), { statusCode: 400 })
  }

  if (reg.status === 'CANCELLED')
    throw Object.assign(new Error('Inscrição já cancelada.'), { statusCode: 400 })

  return prisma.$transaction(async (tx) => {
    const updated = await tx.registration.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    if (reg.payment) {
      await tx.payment.update({ where: { registrationId: id }, data: { status: 'REJECTED' } })
    }
    return updated
  })
}

/**
 * Checagem de atletas de um evento.
 * Permite filtrar por equipe, categoria e se é absoluto.
 * Retorna lista agrupada por categoria.
 * Apenas ADMIN/ORGANIZER.
 */
export const checkAthletes = async (eventId, query) => {
  const where = {
    eventId,
    status: { notIn: ['CANCELLED'] },
  }

  if (query.teamName) where.teamName = { contains: query.teamName, mode: 'insensitive' }
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.status) where.status = query.status

  const registrations = await prisma.registration.findMany({
    where,
    orderBy: [{ category: { belt: 'asc' } }, { teamName: 'asc' }, { athlete: { name: 'asc' } }],
    include: {
      athlete: { select: { id: true, name: true, email: true, phone: true } },
      category: { select: { id: true, name: true, belt: true, gender: true, weightMin: true, weightMax: true, isAbsolute: true } },
      payment: { select: { status: true, amountCents: true } },
    },
  })

  // Agrupa por categoria para facilitar a exibição no frontend
  const grouped = registrations.reduce((acc, reg) => {
    const key = reg.categoryId
    if (!acc[key]) {
      acc[key] = { category: reg.category, athletes: [], count: 0 }
    }
    acc[key].athletes.push({
      registrationId: reg.id,
      registrationStatus: reg.status,
      teamName: reg.teamName,
      notes: reg.notes,
      paymentStatus: reg.payment?.status ?? null,
      athlete: reg.athlete,
    })
    acc[key].count++
    return acc
  }, {})

  return {
    eventId,
    totalRegistrations: registrations.length,
    categories: Object.values(grouped),
  }
}

/**
 * Estatísticas de inscrições de um evento (para o dashboard admin).
 */
export const getEventRegistrationStats = async (eventId) => {
  const [total, byStatus, revenue] = await prisma.$transaction([
    prisma.registration.count({ where: { eventId } }),
    prisma.registration.groupBy({
      by: ['status'],
      where: { eventId },
      _count: { status: true },
    }),
    prisma.payment.aggregate({
      where: { registration: { eventId }, status: 'APPROVED' },
      _sum: { amountCents: true, platformFeeCents: true },
    }),
  ])

  const statusMap = byStatus.reduce((acc, s) => {
    acc[s.status] = s._count.status
    return acc
  }, {})

  return {
    eventId,
    total,
    byStatus: statusMap,
    revenue: {
      totalCents: revenue._sum.amountCents ?? 0,
      platformFeeCents: revenue._sum.platformFeeCents ?? 0,
    },
  }
}