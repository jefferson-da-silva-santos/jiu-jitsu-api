import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env.js'
import { badRequest } from '../utils/response.js'

const ensure = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const buildStorage = (subdir) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(env.UPLOAD_DIR, subdir)
      ensure(dir)
      cb(null, dir)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      cb(null, name)
    },
  })

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (allowed.includes(file.mimetype)) return cb(null, true)
  cb(Object.assign(new Error('Formato inválido. Use JPG, PNG, WEBP ou PDF.'), { statusCode: 415 }))
}

const maxSize = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024

const wrap = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) return next(err)
    next()
  })
}

export const uploadReceipt = wrap(multer({ storage: buildStorage('receipts'), fileFilter: imageFilter, limits: { fileSize: maxSize } }).single('receipt'))
export const uploadBanner = wrap(multer({ storage: buildStorage('banners'), fileFilter: imageFilter, limits: { fileSize: maxSize } }).single('banner'))
export const uploadCover = wrap(multer({ storage: buildStorage('covers'), fileFilter: imageFilter, limits: { fileSize: maxSize } }).single('cover'))
export const uploadProduct = wrap(multer({ storage: buildStorage('products'), fileFilter: imageFilter, limits: { fileSize: maxSize } }).single('image'))

/**
 * Resolve a URL final de uma imagem.
 * Prioridade: arquivo multipart > campo URL no body.
 * Injeta req.resolvedImageUrl para uso nos controllers.
 */
export const resolveImageUrl = (subdir, bodyField = 'imageUrl') =>
  (req, res, next) => {
    if (req.file) {
      req.resolvedImageUrl = `/uploads/${subdir}/${req.file.filename}`
    } else if (req.body?.[bodyField]) {
      try {
        new URL(req.body[bodyField])
        req.resolvedImageUrl = req.body[bodyField]
      } catch {
        return badRequest(res, `Campo '${bodyField}' deve ser uma URL válida.`)
      }
    } else {
      req.resolvedImageUrl = null
    }
    next()
  }