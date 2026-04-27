import dotenv from 'dotenv'
dotenv.config()

const required = (key) => {
  const val = process.env[key]
  if (!val) throw new Error(`❌ Variável obrigatória não definida: ${key}`)
  return val
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3333', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api/v1',

  DATABASE_URL: required('DATABASE_URL'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '15m',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '10', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? './uploads',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),

  PLATFORM_FEE_CENTS: parseInt(process.env.PLATFORM_FEE_CENTS ?? '250', 10),
  CASHBACK_PERCENT: parseInt(process.env.CASHBACK_PERCENT ?? '10', 10),
}

export const isDev = env.NODE_ENV === 'development'
export const isProd = env.NODE_ENV === 'production'