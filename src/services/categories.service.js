import prisma from '../config/database.js'

export const listByEvent = async (eventId) => {
  return prisma.eventCategory.findMany({
    where: { eventId },
    orderBy: [{ belt: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { registrations: true } } },
  })
}

export const getCategory = async (id) => {
  const cat = await prisma.eventCategory.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  })
  if (!cat) throw Object.assign(new Error('Categoria não encontrada.'), { statusCode: 404 })
  return cat
}

export const createCategory = async (eventId, data, user) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw Object.assign(new Error('Evento não encontrado.'), { statusCode: 404 })
  if (user.role !== 'ADMIN' && event.organizerId !== user.sub)
    throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })

  return prisma.eventCategory.create({ data: { ...data, eventId } })
}

export const updateCategory = async (id, data, user) => {
  const cat = await prisma.eventCategory.findUnique({ where: { id }, include: { event: true } })
  if (!cat) throw Object.assign(new Error('Categoria não encontrada.'), { statusCode: 404 })
  if (user.role !== 'ADMIN' && cat.event.organizerId !== user.sub)
    throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })

  return prisma.eventCategory.update({ where: { id }, data })
}

export const deleteCategory = async (id, user) => {
  const cat = await prisma.eventCategory.findUnique({ where: { id }, include: { event: true, _count: { select: { registrations: true } } } })
  if (!cat) throw Object.assign(new Error('Categoria não encontrada.'), { statusCode: 404 })
  if (user.role !== 'ADMIN' && cat.event.organizerId !== user.sub)
    throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })
  if (cat._count.registrations > 0)
    throw Object.assign(new Error('Não é possível excluir categoria com inscrições.'), { statusCode: 400 })

  await prisma.eventCategory.delete({ where: { id } })
}