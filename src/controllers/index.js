import * as authService from '../services/auth.service.js'
import * as eventsService from '../services/events.service.js'
import * as categoriesService from '../services/categories.service.js'
import * as registrationsService from '../services/registrations.service.js'
import * as paymentsService from '../services/payments.service.js'
import * as bracketsService from '../services/brackets.service.js'
import * as fightsService from '../services/fights.service.js'
import * as highlightsService from '../services/highlights.service.js'
import * as newsService from '../services/news.service.js'
import * as productsService from '../services/products.service.js'
import * as ordersService from '../services/orders.service.js'
import * as usersService from '../services/users.service.js'
import { created, ok, noContent, badRequest } from '../utils/response.js'
import { paginate } from '../utils/response.js'

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

// ── Users ──────────────────────────────────────────────────────────────────
export const usersController = {
  list: async (req, res, next) => {
    try {
      const { users, total, page, perPage } = await usersService.listUsers(req.query)
      paginate(res, users, total, page, perPage)
    } catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await usersService.getUser(req.params.id, req.user)) }
    catch (e) { next(e) }
  },
  update: async (req, res, next) => {
    try { ok(res, await usersService.updateUser(req.params.id, req.body, req.user)) }
    catch (e) { next(e) }
  },
  changePassword: async (req, res, next) => {
    try { ok(res, await usersService.changePassword(req.user.sub, req.body)) }
    catch (e) { next(e) }
  },
  deactivate: async (req, res, next) => {
    try { ok(res, await usersService.deactivateUser(req.params.id), 'Usuário desativado.') }
    catch (e) { next(e) }
  },
  reactivate: async (req, res, next) => {
    try { ok(res, await usersService.reactivateUser(req.params.id), 'Usuário reativado.') }
    catch (e) { next(e) }
  },
  dashboard: async (req, res, next) => {
    try { ok(res, await usersService.getAthleteDashboard(req.params.id, req.user)) }
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
  // Aceita arquivo multipart OU imageUrl no body (via resolveImageUrl middleware)
  uploadBanner: async (req, res, next) => {
    try {
      if (!req.resolvedImageUrl) return badRequest(res, 'Envie um arquivo ou uma URL válida no campo imageUrl.')
      ok(res, await eventsService.uploadBanner(req.params.id, req.resolvedImageUrl, req.user))
    } catch (e) { next(e) }
  },
  highlights: async (req, res, next) => {
    try { ok(res, await eventsService.listHighlightedEvents()) }
    catch (e) { next(e) }
  },
  stats: async (req, res, next) => {
    try { ok(res, await registrationsService.getEventRegistrationStats(req.params.id)) }
    catch (e) { next(e) }
  },
}

// ── Categories ─────────────────────────────────────────────────────────────
export const categoriesController = {
  listByEvent: async (req, res, next) => {
    try { ok(res, await categoriesService.listByEvent(req.params.eventId)) }
    catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await categoriesService.getCategory(req.params.id)) }
    catch (e) { next(e) }
  },
  create: async (req, res, next) => {
    try { created(res, await categoriesService.createCategory(req.params.eventId, req.body, req.user)) }
    catch (e) { next(e) }
  },
  update: async (req, res, next) => {
    try { ok(res, await categoriesService.updateCategory(req.params.id, req.body, req.user)) }
    catch (e) { next(e) }
  },
  delete: async (req, res, next) => {
    try { await categoriesService.deleteCategory(req.params.id, req.user); noContent(res) }
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
    try { ok(res, await registrationsService.cancelRegistration(req.params.id, req.user), 'Inscrição cancelada.') }
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
      if (!req.resolvedImageUrl) return badRequest(res, 'Envie o comprovante como arquivo ou URL no campo imageUrl.')
      ok(res, await paymentsService.submitReceipt(req.params.registrationId, req.resolvedImageUrl, req.user))
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
  listLive: async (req, res, next) => {
    try { ok(res, await fightsService.listLive()) }
    catch (e) { next(e) }
  },
  listByBracket: async (req, res, next) => {
    try { ok(res, await fightsService.listByBracket(req.params.bracketId)) }
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
  assignMat: async (req, res, next) => {
    try { ok(res, await fightsService.assignMat(req.params.id, req.body.matNumber)) }
    catch (e) { next(e) }
  },
}

// ── Highlights ─────────────────────────────────────────────────────────────
export const highlightsController = {
  list: async (req, res, next) => {
    try {
      const { highlights, total, page, perPage } = await highlightsService.listHighlights(req.query)
      paginate(res, highlights, total, page, perPage)
    } catch (e) { next(e) }
  },
  active: async (req, res, next) => {
    try { ok(res, await highlightsService.getActiveHighlights()) }
    catch (e) { next(e) }
  },
  create: async (req, res, next) => {
    try { created(res, await highlightsService.createHighlight(req.body)) }
    catch (e) { next(e) }
  },
  confirmPayment: async (req, res, next) => {
    try { ok(res, await highlightsService.confirmPayment(req.params.id), 'Destaque ativado!') }
    catch (e) { next(e) }
  },
  deactivate: async (req, res, next) => {
    try { ok(res, await highlightsService.deactivateHighlight(req.params.id), 'Destaque desativado.') }
    catch (e) { next(e) }
  },
}

// ── News ───────────────────────────────────────────────────────────────────
export const newsController = {
  list: async (req, res, next) => {
    try {
      const { news, total, page, perPage } = await newsService.listNews(req.query, req.user ?? null)
      paginate(res, news, total, page, perPage)
    } catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await newsService.getNews(req.params.id, req.user ?? null)) }
    catch (e) { next(e) }
  },
  create: async (req, res, next) => {
    try { created(res, await newsService.createNews(req.body)) }
    catch (e) { next(e) }
  },
  update: async (req, res, next) => {
    try { ok(res, await newsService.updateNews(req.params.id, req.body)) }
    catch (e) { next(e) }
  },
  uploadCover: async (req, res, next) => {
    try {
      if (!req.resolvedImageUrl) return badRequest(res, 'Envie uma imagem ou URL válida no campo imageUrl.')
      ok(res, await newsService.uploadCover(req.params.id, req.resolvedImageUrl))
    } catch (e) { next(e) }
  },
  publish: async (req, res, next) => {
    try { ok(res, await newsService.publishNews(req.params.id), 'Notícia publicada!') }
    catch (e) { next(e) }
  },
  unpublish: async (req, res, next) => {
    try { ok(res, await newsService.unpublishNews(req.params.id), 'Notícia despublicada.') }
    catch (e) { next(e) }
  },
  delete: async (req, res, next) => {
    try { await newsService.deleteNews(req.params.id); noContent(res) }
    catch (e) { next(e) }
  },
}

// ── Products ───────────────────────────────────────────────────────────────
export const productsController = {
  list: async (req, res, next) => {
    try {
      const { products, total, page, perPage } = await productsService.listProducts(req.query, req.user ?? null)
      paginate(res, products, total, page, perPage)
    } catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await productsService.getProduct(req.params.id, req.user ?? null)) }
    catch (e) { next(e) }
  },
  create: async (req, res, next) => {
    try { created(res, await productsService.createProduct(req.body)) }
    catch (e) { next(e) }
  },
  update: async (req, res, next) => {
    try { ok(res, await productsService.updateProduct(req.params.id, req.body)) }
    catch (e) { next(e) }
  },
  uploadImage: async (req, res, next) => {
    try {
      if (!req.resolvedImageUrl) return badRequest(res, 'Envie uma imagem ou URL válida no campo imageUrl.')
      ok(res, await productsService.uploadProductImage(req.params.id, req.resolvedImageUrl))
    } catch (e) { next(e) }
  },
  adjustStock: async (req, res, next) => {
    try { ok(res, await productsService.adjustStock(req.params.id, req.body.delta)) }
    catch (e) { next(e) }
  },
  deactivate: async (req, res, next) => {
    try { ok(res, await productsService.deactivateProduct(req.params.id), 'Produto desativado.') }
    catch (e) { next(e) }
  },
  reactivate: async (req, res, next) => {
    try { ok(res, await productsService.reactivateProduct(req.params.id), 'Produto reativado.') }
    catch (e) { next(e) }
  },
}

// ── Orders ─────────────────────────────────────────────────────────────────
export const ordersController = {
  create: async (req, res, next) => {
    try { created(res, await ordersService.createOrder(req.body, req.user.sub)) }
    catch (e) { next(e) }
  },
  list: async (req, res, next) => {
    try {
      const { orders, total, page, perPage } = await ordersService.listOrders(req.query, req.user)
      paginate(res, orders, total, page, perPage)
    } catch (e) { next(e) }
  },
  get: async (req, res, next) => {
    try { ok(res, await ordersService.getOrder(req.params.id, req.user)) }
    catch (e) { next(e) }
  },
  updateStatus: async (req, res, next) => {
    try { ok(res, await ordersService.updateOrderStatus(req.params.id, req.body.status)) }
    catch (e) { next(e) }
  },
  cancel: async (req, res, next) => {
    try { ok(res, await ordersService.cancelOrder(req.params.id, req.user), 'Pedido cancelado.') }
    catch (e) { next(e) }
  },
  stats: async (req, res, next) => {
    try { ok(res, await ordersService.getOrderStats()) }
    catch (e) { next(e) }
  },
}