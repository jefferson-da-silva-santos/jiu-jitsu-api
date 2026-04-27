import { PrismaClient } from '@prisma/client'
import { isDev, isProd } from './env.js'

const prisma = global.__prisma ?? new PrismaClient({
  log: isDev ? ['query', 'error', 'warn'] : ['error'],
})

if (!isProd) global.__prisma = prisma

export default prisma