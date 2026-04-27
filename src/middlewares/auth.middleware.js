import { verifyAccessToken } from '../utils/jwt.js'
import { unauthorized, forbidden } from '../utils/response.js'

/** Verifica JWT Bearer e injeta req.user */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return unauthorized(res)

  try {
    req.user = verifyAccessToken(header.slice(7))
    next()
  } catch {
    unauthorized(res, 'Token inválido ou expirado')
  }
}

/** Autoriza por roles — sempre use após authenticate */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res)
  if (!roles.includes(req.user.role)) return forbidden(res, `Restrito a: ${roles.join(', ')}`)
  next()
}

// Atalhos prontos para usar nas rotas
export const isAdmin = [authenticate, authorize('ADMIN')]
export const isAdminOrOrganizer = [authenticate, authorize('ADMIN', 'ORGANIZER')]
export const isAuthenticated = [authenticate, authorize('ADMIN', 'ORGANIZER', 'ATHLETE')]