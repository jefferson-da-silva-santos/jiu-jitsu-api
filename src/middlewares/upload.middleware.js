import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env.js'

const ensure = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }

const storage = (subdir) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(env.UPLOAD_DIR, subdir)
    ensure(dir)
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, name)
  },
})

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Formato não permitido. Use JPG, PNG, WEBP ou PDF.'))
}

const maxSize = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024

export const uploadReceipt = multer({ storage: storage('receipts'), fileFilter: imageFilter, limits: { fileSize: maxSize } }).single('receipt')
export const uploadBanner = multer({ storage: storage('banners'), fileFilter: imageFilter, limits: { fileSize: maxSize } }).single('banner')