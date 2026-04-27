import prisma from '../config/database.js'
import { broadcast } from '../websocket/fights.ws.js'

export const getFight = async (fightId) => {
  const fight = await prisma.fight.findUnique({
    where: { id: fightId },
    include: {
      fighterA: { select: { id: true, name: true } },
      fighterB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
      category: true,
    },
  })
  if (!fight) throw Object.assign(new Error('Luta não encontrada.'), { statusCode: 404 })
  return fight
}

export const listByBracket = async (bracketId) => {
  return prisma.fight.findMany({
    where: { bracketId },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
    include: {
      fighterA: { select: { id: true, name: true } },
      fighterB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
    },
  })
}

export const listLive = async () => {
  return prisma.fight.findMany({
    where: { status: 'ONGOING' },
    include: {
      fighterA: { select: { id: true, name: true } },
      fighterB: { select: { id: true, name: true } },
      category: { select: { name: true, belt: true, gender: true } },
      bracket: { include: { event: { select: { id: true, title: true, venueCity: true } } } },
    },
    orderBy: { startedAt: 'desc' },
  })
}

export const startFight = async (fightId) => {
  const fight = await prisma.fight.findUnique({ where: { id: fightId } })
  if (!fight) throw Object.assign(new Error('Luta não encontrada.'), { statusCode: 404 })
  if (fight.status !== 'SCHEDULED')
    throw Object.assign(new Error('Luta não está agendada.'), { statusCode: 400 })
  if (!fight.fighterAId || !fight.fighterBId)
    throw Object.assign(new Error('Luta sem dois adversários definidos.'), { statusCode: 400 })

  const updated = await prisma.fight.update({
    where: { id: fightId },
    data: { status: 'ONGOING', startedAt: new Date() },
    include: {
      fighterA: { select: { id: true, name: true } },
      fighterB: { select: { id: true, name: true } },
    },
  })

  broadcast(fightId, { type: 'FIGHT_STARTED', fight: updated })
  return updated
}

export const updateScore = async (fightId, scoreData) => {
  const fight = await prisma.fight.findUnique({ where: { id: fightId } })
  if (!fight) throw Object.assign(new Error('Luta não encontrada.'), { statusCode: 404 })
  if (fight.status !== 'ONGOING')
    throw Object.assign(new Error('Luta não está em andamento.'), { statusCode: 400 })

  const updated = await prisma.fight.update({
    where: { id: fightId },
    data: scoreData,
    include: {
      fighterA: { select: { id: true, name: true } },
      fighterB: { select: { id: true, name: true } },
    },
  })

  broadcast(fightId, { type: 'SCORE_UPDATE', fight: updated })
  return updated
}

export const finishFight = async (fightId, { winnerId, durationSeconds, ...scores }) => {
  const fight = await prisma.fight.findUnique({ where: { id: fightId }, include: { bracket: true } })
  if (!fight) throw Object.assign(new Error('Luta não encontrada.'), { statusCode: 404 })
  if (fight.status === 'FINISHED')
    throw Object.assign(new Error('Luta já finalizada.'), { statusCode: 400 })
  if (winnerId !== fight.fighterAId && winnerId !== fight.fighterBId)
    throw Object.assign(new Error('Vencedor inválido.'), { statusCode: 400 })

  const updated = await prisma.fight.update({
    where: { id: fightId },
    data: { status: 'FINISHED', winnerId, durationSeconds, finishedAt: new Date(), ...scores },
    include: {
      fighterA: { select: { id: true, name: true } },
      fighterB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
    },
  })

  await advanceWinner(fight, winnerId)
  broadcast(fightId, { type: 'FIGHT_FINISHED', fight: updated })
  return updated
}

export const assignMat = async (fightId, matNumber) => {
  const fight = await prisma.fight.findUnique({ where: { id: fightId } })
  if (!fight) throw Object.assign(new Error('Luta não encontrada.'), { statusCode: 404 })
  return prisma.fight.update({ where: { id: fightId }, data: { matNumber } })
}

export const scheduleFight = async (fightId, scheduledAt) => {
  const fight = await prisma.fight.findUnique({ where: { id: fightId } })
  if (!fight) throw Object.assign(new Error('Luta não encontrada.'), { statusCode: 404 })
  return prisma.fight.update({ where: { id: fightId }, data: { scheduledAt: new Date(scheduledAt) } })
}

async function advanceWinner(fight, winnerId) {
  const nextRound = fight.round + 1
  const nextPosition = Math.floor(fight.position / 2)
  const isSlotA = fight.position % 2 === 0

  const nextFight = await prisma.fight.findFirst({
    where: { bracketId: fight.bracketId, round: nextRound, position: nextPosition },
  })
  if (!nextFight) return

  await prisma.fight.update({
    where: { id: nextFight.id },
    data: isSlotA ? { fighterAId: winnerId } : { fighterBId: winnerId },
  })
}