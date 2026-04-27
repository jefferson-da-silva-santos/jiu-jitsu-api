import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'

import { env, isDev } from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// ─── Segurança ────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ─── Rate limiting ────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente novamente em instantes.' },
}))

// ─── Parsing & Compressão ─────────────────────────────────────────────────
app.use(compression())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Logs ─────────────────────────────────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'))

// ─── Arquivos estáticos (uploads) ─────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', env.UPLOAD_DIR)))

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── Rotas da API ─────────────────────────────────────────────────────────
app.use(env.API_PREFIX, routes)

// ─── 404 + Error handler ──────────────────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

export default app