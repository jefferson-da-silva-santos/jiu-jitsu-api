import { PrismaClient } from '@prisma/client'
import { isDev, isProd } from './env.js'

const globalForPrisma = globalThis

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  })

if (!isProd) {
  globalForPrisma.prisma = prisma
}

export default prisma