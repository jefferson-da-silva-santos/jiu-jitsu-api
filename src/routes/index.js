import { Router } from 'express'
import { authenticate, isAdmin, isAdminOrOrganizer, isAuthenticated } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  uploadReceipt, uploadBanner, uploadCover, uploadProduct, resolveImageUrl,
} from '../middlewares/upload.middleware.js'
import {
  authController, usersController, eventsController, categoriesController,
  registrationsController, paymentsController, bracketsController,
  fightsController, highlightsController, newsController,
  productsController, ordersController,
} from '../controllers/index.js'
import {
  registerSchema, loginSchema, refreshSchema,
  createEventSchema, updateEventSchema,
  createCategorySchema,
  createRegistrationSchema,
  rejectPaymentSchema,
  updateScoreSchema, finishFightSchema,
  createHighlightSchema,
  createNewsSchema,
  createProductSchema,
  createOrderSchema,
} from '../validators/index.js'

const router = Router()

// ─── AUTH ──────────────────────────────────────────────────────────────────
router.post('/auth/register', validate(registerSchema), authController.register)
router.post('/auth/login', validate(loginSchema), authController.login)
router.post('/auth/refresh', validate(refreshSchema), authController.refresh)
router.post('/auth/logout', authController.logout)
router.get('/auth/me', ...isAuthenticated, authController.me)

// ─── USERS ─────────────────────────────────────────────────────────────────
router.get('/users', ...isAdmin, usersController.list)
router.get('/users/:id', ...isAuthenticated, usersController.get)
router.put('/users/:id', ...isAuthenticated, usersController.update)
router.patch('/users/me/password', ...isAuthenticated, usersController.changePassword)
router.delete('/users/:id', ...isAdmin, usersController.deactivate)
router.patch('/users/:id/reactivate', ...isAdmin, usersController.reactivate)
router.get('/users/:id/dashboard', ...isAuthenticated, usersController.dashboard)

// ─── EVENTS ────────────────────────────────────────────────────────────────
router.get('/events', eventsController.list)
router.get('/events/highlights', eventsController.highlights)
router.get('/events/:id', eventsController.get)
router.get('/events/:id/stats', ...isAdminOrOrganizer, eventsController.stats)
router.post('/events', ...isAdminOrOrganizer, validate(createEventSchema), eventsController.create)
router.put('/events/:id', ...isAdminOrOrganizer, validate(updateEventSchema), eventsController.update)
// Banner: aceita multipart OU { imageUrl: "https://..." } no body
router.post('/events/:id/banner', ...isAdminOrOrganizer, uploadBanner, resolveImageUrl('banners', 'imageUrl'), eventsController.uploadBanner)

// ─── CATEGORIES ────────────────────────────────────────────────────────────
router.get('/events/:eventId/categories', categoriesController.listByEvent)
router.get('/categories/:id', categoriesController.get)
router.post('/events/:eventId/categories', ...isAdminOrOrganizer, validate(createCategorySchema), categoriesController.create)
router.put('/categories/:id', ...isAdminOrOrganizer, categoriesController.update)
router.delete('/categories/:id', ...isAdminOrOrganizer, categoriesController.delete)

// ─── REGISTRATIONS ─────────────────────────────────────────────────────────
router.get('/registrations', ...isAuthenticated, registrationsController.list)
router.get('/registrations/:id', ...isAuthenticated, registrationsController.get)
router.post('/registrations', ...isAuthenticated, validate(createRegistrationSchema), registrationsController.create)
router.patch('/registrations/:id/cancel', ...isAuthenticated, registrationsController.cancel)
router.get('/events/:eventId/athletes', ...isAdminOrOrganizer, registrationsController.checkAthletes)

// ─── PAYMENTS ──────────────────────────────────────────────────────────────
// Comprovante: aceita multipart OU { imageUrl: "https://..." } no body
router.post('/payments/:registrationId/receipt', ...isAuthenticated, uploadReceipt, resolveImageUrl('receipts', 'imageUrl'), paymentsController.submitReceipt)
router.patch('/payments/:registrationId/approve', ...isAdminOrOrganizer, paymentsController.approve)
router.patch('/payments/:registrationId/reject', ...isAdminOrOrganizer, validate(rejectPaymentSchema), paymentsController.reject)
router.get('/payments/pending', ...isAdminOrOrganizer, paymentsController.listPending)

// ─── BRACKETS ──────────────────────────────────────────────────────────────
router.get('/events/:eventId/brackets', bracketsController.listByEvent)
router.get('/events/:eventId/brackets/:categoryId', bracketsController.get)
router.post('/events/:eventId/brackets/:categoryId/generate', ...isAdminOrOrganizer, bracketsController.generate)

// ─── FIGHTS ────────────────────────────────────────────────────────────────
router.get('/fights/live', fightsController.listLive)
router.get('/fights/:id', fightsController.get)
router.get('/brackets/:bracketId/fights', fightsController.listByBracket)
router.patch('/fights/:id/start', ...isAdminOrOrganizer, fightsController.start)
router.patch('/fights/:id/score', ...isAdminOrOrganizer, validate(updateScoreSchema), fightsController.updateScore)
router.patch('/fights/:id/finish', ...isAdminOrOrganizer, validate(finishFightSchema), fightsController.finish)
router.patch('/fights/:id/mat', ...isAdminOrOrganizer, fightsController.assignMat)

// ─── HIGHLIGHTS ────────────────────────────────────────────────────────────
router.get('/highlights', highlightsController.list)
router.get('/highlights/active', highlightsController.active)
router.post('/highlights', ...isAdminOrOrganizer, validate(createHighlightSchema), highlightsController.create)
router.patch('/highlights/:id/confirm', ...isAdmin, highlightsController.confirmPayment)
router.patch('/highlights/:id/deactivate', ...isAdmin, highlightsController.deactivate)

// ─── NEWS ──────────────────────────────────────────────────────────────────
router.get('/news', newsController.list)
router.get('/news/:id', newsController.get)
router.post('/news', ...isAdmin, validate(createNewsSchema), newsController.create)
router.put('/news/:id', ...isAdmin, newsController.update)
// Capa: aceita multipart OU { imageUrl: "https://..." } no body
router.post('/news/:id/cover', ...isAdmin, uploadCover, resolveImageUrl('covers', 'imageUrl'), newsController.uploadCover)
router.patch('/news/:id/publish', ...isAdmin, newsController.publish)
router.patch('/news/:id/unpublish', ...isAdmin, newsController.unpublish)
router.delete('/news/:id', ...isAdmin, newsController.delete)

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
router.get('/products', productsController.list)
router.get('/products/:id', productsController.get)
router.post('/products', ...isAdmin, validate(createProductSchema), productsController.create)
router.put('/products/:id', ...isAdmin, productsController.update)
// Imagem: aceita multipart OU { imageUrl: "https://..." } no body
router.post('/products/:id/image', ...isAdmin, uploadProduct, resolveImageUrl('products', 'imageUrl'), productsController.uploadImage)
router.patch('/products/:id/stock', ...isAdmin, productsController.adjustStock)
router.patch('/products/:id/deactivate', ...isAdmin, productsController.deactivate)
router.patch('/products/:id/reactivate', ...isAdmin, productsController.reactivate)

// ─── ORDERS ────────────────────────────────────────────────────────────────
router.get('/orders', ...isAuthenticated, ordersController.list)
router.get('/orders/stats', ...isAdmin, ordersController.stats)
router.get('/orders/:id', ...isAuthenticated, ordersController.get)
router.post('/orders', ...isAuthenticated, validate(createOrderSchema), ordersController.create)
router.patch('/orders/:id/status', ...isAdmin, ordersController.updateStatus)
router.patch('/orders/:id/cancel', ...isAuthenticated, ordersController.cancel)

export default router