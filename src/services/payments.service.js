import prisma from '../config/database.js'
import { env } from '../config/env.js'
import { parsePage, skip } from '../utils/pagination.js'

export const submitReceipt = async (registrationId, receiptUrl, user) => {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId }, include: { payment: true } })
  if (!reg) throw Object.assign(new Error('Inscrição não encontrada.'), { statusCode: 404 })
  if (user.role === 'ATHLETE' && reg.athleteId !== user.sub) throw Object.assign(new Error('Sem permissão.'), { statusCode: 403 })
  if (!reg.payment) throw Object.assign(new Error('Pagamento não encontrado.'), { statusCode: 404 })
  if (reg.payment.status === 'APPROVED') throw Object.assign(new Error('Pagamento já aprovado.'), { statusCode: 400 })

  const [payment] = await prisma.$transaction([
    prisma.payment.update({ where: { registrationId }, data: { receiptUrl, status: 'PENDING' } }),
    prisma.registration.update({ where: { id: registrationId }, data: { status: 'PAYMENT_SENT' } }),
  ])
  return payment
}

export const approvePayment = async (registrationId) => {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId }, include: { payment: true } })
  if (!reg || !reg.payment) throw Object.assign(new Error('Inscrição ou pagamento não encontrado.'), { statusCode: 404 })
  if (reg.payment.status === 'APPROVED') throw Object.assign(new Error('Pagamento já aprovado.'), { statusCode: 400 })

  const cashbackCents = Math.floor(reg.payment.amountCents * (env.CASHBACK_PERCENT / 100))

  const [payment] = await prisma.$transaction([
    prisma.payment.update({ where: { registrationId }, data: { status: 'APPROVED', approvedAt: new Date() } }),
    prisma.registration.update({ where: { id: registrationId }, data: { status: 'APPROVED' } }),
    prisma.cashback.create({ data: { registrationId, userId: reg.athleteId, amountCents: cashbackCents, percentUsed: env.CASHBACK_PERCENT } }),
  ])
  return payment
}

export const rejectPayment = async (registrationId, reason) => {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId }, include: { payment: true } })
  if (!reg || !reg.payment) throw Object.assign(new Error('Inscrição ou pagamento não encontrado.'), { statusCode: 404 })

  const [payment] = await prisma.$transaction([
    prisma.payment.update({ where: { registrationId }, data: { status: 'REJECTED', rejectedAt: new Date(), rejectedReason: reason } }),
    prisma.registration.update({ where: { id: registrationId }, data: { status: 'REJECTED' } }),
  ])
  return payment
}

export const listPendingPayments = async (query) => {
  const { page, perPage } = parsePage(query)
  const where = { status: 'PENDING', receiptUrl: { not: null } }
  if (query.eventId) where.registration = { eventId: query.eventId }

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where, skip: skip(page, perPage), take: perPage,
      orderBy: { createdAt: 'asc' },
      include: { registration: { include: { athlete: { select: { id: true, name: true, email: true } }, event: { select: { id: true, title: true } }, category: true } } },
    }),
    prisma.payment.count({ where }),
  ])
  return { payments, total, page, perPage }
}