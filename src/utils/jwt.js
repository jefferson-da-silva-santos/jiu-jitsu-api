import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const signAccessToken = ({ id, email, role }) =>
  jwt.sign({ sub: id, email, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })

export const signRefreshToken = ({ id }) =>
  jwt.sign({ sub: id }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN })

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET)
export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET)