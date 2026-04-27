import prisma from '../config/database.js'
import { parsePage, skip } from '../utils/pagination.js'

export const createHighlight = async (data) => {
  const event = await prisma.event.findUnique({ where: { id: data.eventId } })
  if (!event) throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404 })

  return prisma.eventHighlight.create({
    data: {
      ...data,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
    },
    include: { event: { select: { id: true, title: true } } },
  })
}

export const listHighlights = async (query) => {
  const { page, perPage } = parsePage(query)
  const where = {}
  if (query.eventId) where.eventId = query.eventId
  if (query.active !== undefined) where.active = query.active === 'true'
  if (query.type) where.type = query.type

  const [highlights, total] = await prisma.$transaction([
    prisma.eventHighlight.findMany({
      where,
      skip: skip(page, perPage),
      take: perPage,
      orderBy: { startsAt: 'desc' },
      include: { event: { select: { id: true, title: true, venueCity: true } } },
    }),
    prisma.eventHighlight.count({ where }),
  ])

  return { highlights, total, page, perPage }
}

export const getActiveHighlights = async () => {
  const now = new Date()
  return prisma.eventHighlight.findMany({
    where: { active: true, paid: true, startsAt: { lte: now }, endsAt: { gte: now } },
    include: { event: { select: { id: true, title: true, slug: true, venueCity: true, venueState: true, startDate: true, bannerUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export const confirmPayment = async (id) => {
  const highlight = await prisma.eventHighlight.findUnique({ where: { id } })
  if (!highlight) throw Object.assign(new Error('Destaque não encontrado.'), { statusCode: 404 })
  return prisma.eventHighlight.update({ where: { id }, data: { paid: true, active: true } })
}

export const deactivateHighlight = async (id) => {
  const highlight = await prisma.eventHighlight.findUnique({ where: { id } })
  if (!highlight) throw Object.assign(new Error('Destaque não encontrado.'), { statusCode: 404 })
  return prisma.eventHighlight.update({ where: { id }, data: { active: false } })
}