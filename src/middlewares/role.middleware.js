import { unauthorized, forbidden } from '../utils/response.js'

/**
 * Middleware de autorização por role.
 *
 * Deve ser sempre usado DEPOIS do middleware de autenticação (authenticate),
 * que injeta req.user com { sub, email, role }.
 *
 * @param {...string} roles - roles permitidas, ex: 'ADMIN', 'ORGANIZER', 'ATHLETE'
 * @returns Express middleware
 *
 * @example
 * // Apenas admin
 * router.delete('/users/:id', authenticate, authorize('ADMIN'), usersController.deactivate)
 *
 * // Admin ou organizador
 * router.post('/events', authenticate, authorize('ADMIN', 'ORGANIZER'), eventsController.create)
 */
export const authorize = (...roles) =>
  (req, res, next) => {
    if (!req.user) return unauthorized(res, 'Autenticação necessária.')
    if (!roles.includes(req.user.role))
      return forbidden(res, `Acesso restrito. Perfil necessário: ${roles.join(' ou ')}.`)
    next()
  }

// ─── Atalhos prontos para usar nas rotas ──────────────────────────────────────

/**
 * Apenas ADMIN.
 * Usar sempre APÓS authenticate:
 * router.delete('/:id', ...isAdmin, controller.delete)
 */
export const isAdmin = [authorize('ADMIN')]

/**
 * ADMIN ou ORGANIZER.
 */
export const isAdminOrOrganizer = [authorize('ADMIN', 'ORGANIZER')]

/**
 * Qualquer usuário autenticado (ADMIN, ORGANIZER ou ATHLETE).
 */
export const isAnyRole = [authorize('ADMIN', 'ORGANIZER', 'ATHLETE')]

/**
 * Apenas ATHLETE.
 */
export const isAthlete = [authorize('ATHLETE')]

/**
 * ORGANIZER (sem admin) — útil se quiser restringir ação apenas ao perfil organizador.
 */
export const isOrganizer = [authorize('ORGANIZER')]