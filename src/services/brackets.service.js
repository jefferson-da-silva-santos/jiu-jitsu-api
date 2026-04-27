import prisma from '../config/database.js'
import { generateBracket } from '../utils/bracket.js'

export const generateCategoryBracket = async (eventId, categoryId) => {
  const approvedRegs = await prisma.registration.findMany({
    where: { eventId, categoryId, status: 'APPROVED' },
    include: { athlete: { select: { id: true, name: true } } },
  })

  if (approvedRegs.length < 2) throw Object.assign(new Error('Mínimo 2 inscrições aprovadas para gerar chaveamento.'), { statusCode: 400 })

  const athletes = approvedRegs.map(r => ({ id: r.athleteId, teamName: r.teamName }))
  const fights = generateBracket(athletes)

  const bracket = await prisma.bracket.upsert({
    where: { eventId_categoryId: { eventId, categoryId } },
    update: { generated: true, updatedAt: new Date() },
    create: { eventId, categoryId, generated: true },
  })

  // Remove lutas antigas e cria as novas
  await prisma.fight.deleteMany({ where: { bracketId: bracket.id } })
  await prisma.fight.createMany({
    data: fights.map(f => ({ ...f, bracketId: bracket.id, categoryId })),
  })

  return getBracket(eventId, categoryId)
}

export const getBracket = async (eventId, categoryId) => {
  const bracket = await prisma.bracket.findUnique({
    where: { eventId_categoryId: { eventId, categoryId } },
    include: {
      fights: {
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
        include: {
          fighterA: { select: { id: true, name: true } },
          fighterB: { select: { id: true, name: true } },
          winner: { select: { id: true, name: true } },
        },
      },
      category: true,
    },
  })
  if (!bracket) throw Object.assign(new Error('Chaveamento não gerado ainda.'), { statusCode: 404 })
  return bracket
}

export const listEventBrackets = async (eventId) => {
  return prisma.bracket.findMany({
    where: { eventId },
    include: { category: true, _count: { select: { fights: true } } },
  })
}