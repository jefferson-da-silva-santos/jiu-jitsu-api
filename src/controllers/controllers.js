// ─── AUTH ──────────────────────────────────────────────────────────────────
import * as authService from '../services/auth.service.js'
import * as eventsService from '../services/events.service.js'
import * as registrationsService from '../services/registrations.service.js'
import * as paymentsService from '../services/payments.service.js'
import * as bracketsService from '../services/brackets.service.js'
import * as fightsService from '../services/fights.service.js'
import { created, ok, noContent, badRequest } from '../utils/response.js'
import { paginate } from '../utils/response.js'
import { env } from '../config/env.js'

// ── Auth ───────────────────────────────────────────────────────────────────
export const authController = {
  register: async (req, res, next) => {
    try { created(res, await authService.register(req.body), 'Conta criada com sucesso!') }
    catch (e) { next(e) }
  },
  login: async (req, res, next) => {
    try { ok(res, await authService.login(req.body)) }
    catch (e) { next(e) }
  },
  refresh: async (req, res, next) => {
    try { ok(res, await authService.refresh(req.body.refreshToken)) }
    catch (e) { next(e) }
  },
  logout: async (req, res, next) => {
    try { await authService.logout(req.body.refreshToken); noContent(res) }
    catch (e) { next(e) }
  },
  me: async (req, res, next) => {
    try { ok(res, await authService.me(req.user.sub)) }
    catch (e) { next(e) }
  },
}

// ── Events ─────────────────────────────────────────────────────────────────
export const eventsController = {
  list: async (req, res, next) => {
    try {
      const { events, total, page, perPage } = await eventsService.listEvents(req.query)
      paginate(res, events, total, page, perPage)
    } catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await eventsService.getEvent(req.params.id)) }
    catch (e) { next(e) }
  },
  create: async (req, res, next) => {
    try { created(res, await eventsService.createEvent(req.body, req.user.sub)) }
    catch (e) { next(e) }
  },
  update: async (req, res, next) => {
    try { ok(res, await eventsService.updateEvent(req.params.id, req.body, req.user)) }
    catch (e) { next(e) }
  },
  uploadBanner: async (req, res, next) => {
    try {
      if (!req.file) return badRequest(res, 'Arquivo de banner não enviado.')
      const url = `/uploads/banners/${req.file.filename}`
      ok(res, await eventsService.uploadBanner(req.params.id, url, req.user))
    } catch (e) { next(e) }
  },
  highlights: async (req, res, next) => {
    try { ok(res, await eventsService.listHighlightedEvents()) }
    catch (e) { next(e) }
  },
}

// ── Registrations ──────────────────────────────────────────────────────────
export const registrationsController = {
  create: async (req, res, next) => {
    try { created(res, await registrationsService.createRegistration(req.body, req.user.sub)) }
    catch (e) { next(e) }
  },
  list: async (req, res, next) => {
    try {
      const { registrations, total, page, perPage } = await registrationsService.listRegistrations(req.query, req.user)
      paginate(res, registrations, total, page, perPage)
    } catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await registrationsService.getRegistration(req.params.id, req.user)) }
    catch (e) { next(e) }
  },
  cancel: async (req, res, next) => {
    try { ok(res, await registrationsService.cancelRegistration(req.params.id, req.user)) }
    catch (e) { next(e) }
  },
  checkAthletes: async (req, res, next) => {
    try { ok(res, await registrationsService.checkAthletes(req.params.eventId, req.query)) }
    catch (e) { next(e) }
  },
}

// ── Payments ───────────────────────────────────────────────────────────────
export const paymentsController = {
  submitReceipt: async (req, res, next) => {
    try {
      if (!req.file) return badRequest(res, 'Comprovante não enviado.')
      const url = `/uploads/receipts/${req.file.filename}`
      ok(res, await paymentsService.submitReceipt(req.params.registrationId, url, req.user))
    } catch (e) { next(e) }
  },
  approve: async (req, res, next) => {
    try { ok(res, await paymentsService.approvePayment(req.params.registrationId), 'Pagamento aprovado!') }
    catch (e) { next(e) }
  },
  reject: async (req, res, next) => {
    try { ok(res, await paymentsService.rejectPayment(req.params.registrationId, req.body.reason), 'Pagamento rejeitado.') }
    catch (e) { next(e) }
  },
  listPending: async (req, res, next) => {
    try {
      const { payments, total, page, perPage } = await paymentsService.listPendingPayments(req.query)
      paginate(res, payments, total, page, perPage)
    } catch (e) { next(e) }
  },
}

// ── Brackets ───────────────────────────────────────────────────────────────
export const bracketsController = {
  generate: async (req, res, next) => {
    try { created(res, await bracketsService.generateCategoryBracket(req.params.eventId, req.params.categoryId), 'Chaveamento gerado!') }
    catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await bracketsService.getBracket(req.params.eventId, req.params.categoryId)) }
    catch (e) { next(e) }
  },
  listByEvent: async (req, res, next) => {
    try { ok(res, await bracketsService.listEventBrackets(req.params.eventId)) }
    catch (e) { next(e) }
  },
}

// ── Fights ─────────────────────────────────────────────────────────────────
export const fightsController = {
  get: async (req, res, next) => {
    try { ok(res, await fightsService.getFight(req.params.id)) }
    catch (e) { next(e) }
  },
  start: async (req, res, next) => {
    try { ok(res, await fightsService.startFight(req.params.id), 'Luta iniciada!') }
    catch (e) { next(e) }
  },
  updateScore: async (req, res, next) => {
    try { ok(res, await fightsService.updateScore(req.params.id, req.body)) }
    catch (e) { next(e) }
  },
  finish: async (req, res, next) => {
    try { ok(res, await fightsService.finishFight(req.params.id, req.body), 'Luta finalizada!') }
    catch (e) { next(e) }
  },
}