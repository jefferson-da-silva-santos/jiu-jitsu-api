import { isDev } from '../config/env.js'

export const errorHandler = (err, _req, res, _next) => {
  if (isDev) console.error('[ERROR]', err)

  // Erro de unicidade do Prisma
  if (err?.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'Registro duplicado.' })
  }
  // Registro não encontrado no Prisma
  if (err?.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Registro não encontrado.' })
  }
  // Erro de upload
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: `Arquivo muito grande. Máximo: ${process.env.UPLOAD_MAX_SIZE_MB ?? 10}MB` })
  }

  const status = err.statusCode ?? err.status ?? 500
  const message = isDev ? err.message : 'Erro interno do servidor'
  res.status(status).json({ success: false, error: message })
}

export const notFoundHandler = (_req, res) =>
  res.status(404).json({ success: false, error: 'Rota não encontrada' })