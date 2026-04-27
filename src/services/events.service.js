import prisma from '../config/database.js'
import { parsePage, skip } from '../utils/pagination.js'

const slugify = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const listEvents = async (query) => {
  const { page, perPage } = parsePage(query)
  const where = {}
  if (query.status) where.status = query.status
  if (query.city) where.venueCity = { contains: query.city, mode: 'insensitive' }
  if (query.state) where.venueState = query.state.toUpperCase()
  if (query.search) where.title = { contains: query.search, mode: 'insensitive' }

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where, skip: skip(page, perPage), take: perPage,
      orderBy: { startDate: 'asc' },
      include: { organizer: { select: { id: true, name: true } }, _count: { select: { registrations: true } } },
    }),
    prisma.event.count({ where }),
  ])
  return { events, total, page, perPage }
}

export const getEvent = async (idOrSlug) => {
  const event = await prisma.event.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { organizer: { select: { id: true, name: true } }, categories: true, _count: { select: { registrations: true } } },
  })
  if (!event) throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404 })
  return event
}

export const createEvent = async (data, organizerId) => {
  const slug = slugify(data.title)
  const exists = await prisma.event.findUnique({ where: { slug } })
  const finalSlug = exists ? `${slug}-${Date.now()}` : slug

  return prisma.event.create({
    data: { ...data, slug: finalSlug, organizerId, startDate: new Date(data.startDate), endDate: new Date(data.endDate), registrationDeadline: new Date(data.registrationDeadline) },
  })
}

export const updateEvent = async (id, data, user) => {
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404 })
  if (user.role !== 'ADMIN' && event.organizerId !== user.sub) throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })

  const updates = { ...data }
  if (data.startDate) updates.startDate = new Date(data.startDate)
  if (data.endDate) updates.endDate = new Date(data.endDate)
  if (data.registrationDeadline) updates.registrationDeadline = new Date(data.registrationDeadline)

  return prisma.event.update({ where: { id }, data: updates })
}

export const uploadBanner = async (id, fileUrl, user) => {
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404 })
  if (user.role !== 'ADMIN' && event.organizerId !== user.sub) throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })
  return prisma.event.update({ where: { id }, data: { bannerUrl: fileUrl } })
}

export const listHighlightedEvents = async () => {
  const now = new Date()
  return prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      highlights: { some: { active: true, paid: true, startsAt: { lte: now }, endsAt: { gte: now } } },
    },
    include: { highlights: { where: { active: true, paid: true } } },
    take: 10,
  })
}