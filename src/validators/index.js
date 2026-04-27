import { z } from 'zod'

// ─── AUTH ──────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(3).max(120),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Precisa de letra maiúscula').regex(/[0-9]/, 'Precisa de número'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  phone: z.string().optional(),
  birthdate: z.string().datetime().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── EVENTS ────────────────────────────────────────────────
export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  venueName: z.string().min(2),
  venueAddress: z.string().min(5),
  venueCity: z.string().min(2),
  venueState: z.string().length(2),
  venueLat: z.number().optional(),
  venueLng: z.number().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  registrationDeadline: z.string().datetime(),
  maxAthletes: z.number().int().positive().optional(),
  platformFeeOverride: z.number().int().nonnegative().optional(),
  rules: z.string().optional(),
})

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ONGOING', 'FINISHED', 'CANCELLED']).optional(),
})

// ─── CATEGORIES ────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(3).max(100),
  gender: z.enum(['MALE', 'FEMALE']),
  belt: z.enum(['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK']),
  weightMin: z.number().optional(),
  weightMax: z.number().optional(),
  isAbsolute: z.boolean().default(false),
  price: z.number().int().positive(),
  maxSlots: z.number().int().positive().optional(),
})

// ─── REGISTRATIONS ─────────────────────────────────────────
export const createRegistrationSchema = z.object({
  eventId: z.string().uuid(),
  categoryId: z.string().uuid(),
  teamName: z.string().min(2).max(100),
  notes: z.string().max(500).optional(),
})

// ─── FIGHTS ────────────────────────────────────────────────
export const updateScoreSchema = z.object({
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  advantagesA: z.number().int().min(0),
  advantagesB: z.number().int().min(0),
  penaltiesA: z.number().int().min(0),
  penaltiesB: z.number().int().min(0),
})

export const finishFightSchema = z.object({
  winnerId: z.string().uuid(),
  durationSeconds: z.number().int().positive(),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  advantagesA: z.number().int().min(0).default(0),
  advantagesB: z.number().int().min(0).default(0),
  penaltiesA: z.number().int().min(0).default(0),
  penaltiesB: z.number().int().min(0).default(0),
})

// ─── PAYMENTS ──────────────────────────────────────────────
export const rejectPaymentSchema = z.object({
  reason: z.string().min(5).max(300),
})

// ─── HIGHLIGHTS ────────────────────────────────────────────
export const createHighlightSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(['TICKER', 'NOBLE_AREA', 'BOTH']),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  priceCents: z.number().int().positive(),
})

// ─── NEWS ──────────────────────────────────────────────────
export const createNewsSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  authorName: z.string().min(2),
  published: z.boolean().default(false),
})

// ─── PRODUCTS ──────────────────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  category: z.enum(['APPAREL', 'EQUIPMENT', 'ACCESSORIES']),
  price: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
})

// ─── ORDERS ────────────────────────────────────────────────
export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
})