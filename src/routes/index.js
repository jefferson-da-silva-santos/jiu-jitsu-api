import { Router } from 'express'
import { authenticate, isAdmin, isAdminOrOrganizer, isAuthenticated } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { uploadReceipt, uploadBanner } from '../middlewares/upload.middleware.js'
import {
  authController, eventsController, registrationsController,
  paymentsController, bracketsController, fightsController,
} from '../controllers/index.js'
import {
  registerSchema, loginSchema, refreshSchema,
  createEventSchema, updateEventSchema,
  createRegistrationSchema, rejectPaymentSchema,
  updateScoreSchema, finishFightSchema,
} from '../validators/index.js'

const router = Router()

// ─── AUTH ─────────────────────────────────────────────────────────────────
router.post('/auth/register', validate(registerSchema), authController.register)
router.post('/auth/login', validate(loginSchema), authController.login)
router.post('/auth/refresh', validate(refreshSchema), authController.refresh)
router.post('/auth/logout', authController.logout)
router.get('/auth/me', ...isAuthenticated, authController.me)

// ─── EVENTS ───────────────────────────────────────────────────────────────
router.get('/events', eventsController.list)
router.get('/events/highlights', eventsController.highlights)
router.get('/events/:id', eventsController.get)
router.post('/events', ...isAdminOrOrganizer, validate(createEventSchema), eventsController.create)
router.put('/events/:id', ...isAdminOrOrganizer, validate(updateEventSchema), eventsController.update)
router.post('/events/:id/banner', ...isAdminOrOrganizer, uploadBanner, eventsController.uploadBanner)

// ─── REGISTRATIONS ────────────────────────────────────────────────────────
router.get('/registrations', ...isAuthenticated, registrationsController.list)
router.get('/registrations/:id', ...isAuthenticated, registrationsController.get)
router.post('/registrations', ...isAuthenticated, validate(createRegistrationSchema), registrationsController.create)
router.patch('/registrations/:id/cancel', ...isAuthenticated, registrationsController.cancel)
router.get('/events/:eventId/athletes', ...isAdminOrOrganizer, registrationsController.checkAthletes)

// ─── PAYMENTS ─────────────────────────────────────────────────────────────
router.post('/payments/:registrationId/receipt', ...isAuthenticated, uploadReceipt, paymentsController.submitReceipt)
router.patch('/payments/:registrationId/approve', ...isAdminOrOrganizer, paymentsController.approve)
router.patch('/payments/:registrationId/reject', ...isAdminOrOrganizer, validate(rejectPaymentSchema), paymentsController.reject)
router.get('/payments/pending', ...isAdminOrOrganizer, paymentsController.listPending)

// ─── BRACKETS ─────────────────────────────────────────────────────────────
router.get('/events/:eventId/brackets', bracketsController.listByEvent)
router.get('/events/:eventId/brackets/:categoryId', bracketsController.get)
router.post('/events/:eventId/brackets/:categoryId/generate', ...isAdminOrOrganizer, bracketsController.generate)

// ─── FIGHTS ───────────────────────────────────────────────────────────────
router.get('/fights/:id', fightsController.get)
router.patch('/fights/:id/start', ...isAdminOrOrganizer, fightsController.start)
router.patch('/fights/:id/score', ...isAdminOrOrganizer, validate(updateScoreSchema), fightsController.updateScore)
router.patch('/fights/:id/finish', ...isAdminOrOrganizer, validate(finishFightSchema), fightsController.finish)

export default router