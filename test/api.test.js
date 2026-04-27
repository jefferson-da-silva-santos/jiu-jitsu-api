import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { jest } from '@jest/globals'
// ─── Mocks globais ─────────────────────────────────────────────────────────

// Mock do Prisma — substitui todas as chamadas ao banco
const mockPrisma = {
  user:             { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  refreshToken:     { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  event:            { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  eventCategory:    { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
  registration:     { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  payment:          { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
  cashback:         { create: jest.fn(), findMany: jest.fn() },
  bracket:          { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
  fight:            { findUnique: jest.fn(), findFirst: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  eventHighlight:   { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  newsPost:         { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  product:          { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  order:            { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
  orderItem:        { groupBy: jest.fn() },
  $transaction:     jest.fn(),
  $connect:         jest.fn(),
  $disconnect:      jest.fn(),
  $queryRaw:        jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({ default: mockPrisma }))
jest.unstable_mockModule('../src/websocket/fights.ws.js', () => ({
  setupWebSocket: jest.fn(),
  broadcast: jest.fn(),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {}
  res.status  = jest.fn().mockReturnValue(res)
  res.json    = jest.fn().mockReturnValue(res)
  res.send    = jest.fn().mockReturnValue(res)
  return res
}

const mockReq = (overrides = {}) => ({
  body: {}, query: {}, params: {}, headers: {}, user: null, file: null,
  ...overrides,
})

const next = jest.fn()

const clearAllMocks = () => {
  Object.values(mockPrisma).forEach(m => {
    if (typeof m === 'object' && m !== null) {
      Object.values(m).forEach(fn => typeof fn?.mockClear === 'function' && fn.mockClear())
    }
  })
  next.mockClear()
}

// ══════════════════════════════════════════════════════════════════════════
// 1. UTILS
// ══════════════════════════════════════════════════════════════════════════

describe('Utils — response helpers', () => {
  let response

  beforeEach(async () => {
    response = await import('../src/utils/response.js')
  })

  test('ok() retorna 200 com success:true e data', () => {
    const res = mockRes()
    response.ok(res, { id: 1 }, 'Sucesso')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id: 1 } }))
  })

  test('created() retorna 201', () => {
    const res = mockRes()
    response.created(res, { id: 2 })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }))
  })

  test('badRequest() retorna 400 com success:false', () => {
    const res = mockRes()
    response.badRequest(res, 'Erro de validação')
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Erro de validação' })
  })

  test('unauthorized() retorna 401', () => {
    const res = mockRes()
    response.unauthorized(res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('forbidden() retorna 403', () => {
    const res = mockRes()
    response.forbidden(res, 'Acesso negado')
    expect(res.status).toHaveBeenCalledWith(403)
  })

  test('notFound() retorna 404', () => {
    const res = mockRes()
    response.notFound(res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  test('paginate() inclui meta com totalPages', () => {
    const res = mockRes()
    response.paginate(res, [1, 2], 10, 1, 5)
    const call = res.json.mock.calls[0][0]
    expect(call.meta.totalPages).toBe(2)
    expect(call.meta.total).toBe(10)
  })

  test('noContent() retorna 204', () => {
    const res = mockRes()
    response.noContent(res)
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })
})

describe('Utils — pagination', () => {
  let pagination

  beforeEach(async () => {
    pagination = await import('../src/utils/pagination.js')
  })

  test('parsePage retorna page=1, perPage=20 por padrão', () => {
    expect(pagination.parsePage({})).toEqual({ page: 1, perPage: 20 })
  })

  test('parsePage limita perPage a 100', () => {
    expect(pagination.parsePage({ perPage: '999' }).perPage).toBe(100)
  })

  test('parsePage não deixa page menor que 1', () => {
    expect(pagination.parsePage({ page: '-5' }).page).toBe(1)
  })

  test('skip calcula offset corretamente', () => {
    expect(pagination.skip(3, 20)).toBe(40)
    expect(pagination.skip(1, 10)).toBe(0)
  })
})

describe('Utils — bracket generator', () => {
  let bracketUtils

  beforeEach(async () => {
    bracketUtils = await import('../src/utils/bracket.js')
  })

  const makeAthletes = (n, team = 'TeamA') =>
    Array.from({ length: n }, (_, i) => ({ id: `athlete-${i}`, teamName: team }))

  test('lança erro com menos de 2 atletas', () => {
    expect(() => bracketUtils.generateBracket([makeAthletes(1)[0]])).toThrow()
  })

  test('gera chaveamento com 4 atletas — 3 lutas (4-2-1)', () => {
    const fights = bracketUtils.generateBracket(makeAthletes(4))
    expect(fights.length).toBe(3) // 2 quartas + 1 final
  })

  test('gera chaveamento com 8 atletas — 7 lutas', () => {
    const fights = bracketUtils.generateBracket(makeAthletes(8))
    expect(fights.length).toBe(7)
  })

  test('preenche BYEs quando número não é potência de 2', () => {
    const athletes = makeAthletes(3)
    const fights = bracketUtils.generateBracket(athletes)
    // 4 slots (próxima potência) → 3 lutas
    expect(fights.length).toBe(3)
    // Uma luta da primeira rodada terá fighterB null (BYE)
    const round1 = fights.filter(f => f.round === 1)
    const byes = round1.filter(f => f.fighterBId === null)
    expect(byes.length).toBe(1)
  })

  test('separa atletas da mesma equipe na primeira rodada', () => {
    const athletes = [
      { id: 'a1', teamName: 'Alliance' },
      { id: 'a2', teamName: 'Alliance' },
      { id: 'b1', teamName: 'Gracie Barra' },
      { id: 'b2', teamName: 'Gracie Barra' },
    ]
    const fights = bracketUtils.generateBracket(athletes)
    const round1 = fights.filter(f => f.round === 1)
    // Nenhuma luta da primeira rodada deve ter dois atletas da mesma equipe
    // (ambos de Alliance ou ambos de GB)
    const allianceIds = new Set(['a1', 'a2'])
    const gbIds = new Set(['b1', 'b2'])
    for (const fight of round1) {
      if (fight.fighterAId && fight.fighterBId) {
        expect(
          allianceIds.has(fight.fighterAId) && allianceIds.has(fight.fighterBId)
        ).toBe(false)
        expect(
          gbIds.has(fight.fighterAId) && gbIds.has(fight.fighterBId)
        ).toBe(false)
      }
    }
  })

  test('rounds corretos: rodada 1 tem position 0..n/2-1', () => {
    const fights = bracketUtils.generateBracket(makeAthletes(4))
    const r1 = fights.filter(f => f.round === 1)
    expect(r1.map(f => f.position).sort()).toEqual([0, 1])
  })
})

describe('Utils — JWT', () => {
  let jwtUtils

  beforeAll(() => {
    process.env.JWT_SECRET         = 'test-secret-jwt-combateplus-32chars'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-jwt-combateplus-32chars'
    process.env.JWT_EXPIRES_IN     = '15m'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    process.env.DATABASE_URL       = 'postgresql://test'
  })

  beforeEach(async () => {
    jwtUtils = await import('../src/utils/jwt.js')
  })

  test('signAccessToken gera token verificável', () => {
    const token = jwtUtils.signAccessToken({ id: 'uid1', email: 'test@test.com', role: 'ATHLETE' })
    expect(typeof token).toBe('string')
    const payload = jwtUtils.verifyAccessToken(token)
    expect(payload.sub).toBe('uid1')
    expect(payload.role).toBe('ATHLETE')
  })

  test('signRefreshToken gera token verificável', () => {
    const token = jwtUtils.signRefreshToken({ id: 'uid2' })
    const payload = jwtUtils.verifyRefreshToken(token)
    expect(payload.sub).toBe('uid2')
  })

  test('verifyAccessToken lança erro com token inválido', () => {
    expect(() => jwtUtils.verifyAccessToken('token.invalido.aqui')).toThrow()
  })
})

// ══════════════════════════════════════════════════════════════════════════
// 2. MIDDLEWARES
// ══════════════════════════════════════════════════════════════════════════

describe('Middleware — auth', () => {
  let authMiddleware, jwtUtils

  beforeAll(() => {
    process.env.JWT_SECRET         = 'test-secret-jwt-combateplus-32chars'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-jwt-combateplus-32chars'
    process.env.DATABASE_URL       = 'postgresql://test'
  })

  beforeEach(async () => {
    authMiddleware = await import('../src/middlewares/auth.middleware.js')
    jwtUtils       = await import('../src/utils/jwt.js')
    next.mockClear()
  })

  test('authenticate rejeita requisição sem header Authorization', () => {
    const req = mockReq({ headers: {} })
    const res = mockRes()
    authMiddleware.authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('authenticate rejeita token inválido', () => {
    const req = mockReq({ headers: { authorization: 'Bearer token.invalido' } })
    const res = mockRes()
    authMiddleware.authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('authenticate aceita token válido e injeta req.user', () => {
    const token = jwtUtils.signAccessToken({ id: 'uid1', email: 'a@a.com', role: 'ADMIN' })
    const req   = mockReq({ headers: { authorization: `Bearer ${token}` } })
    const res   = mockRes()
    authMiddleware.authenticate(req, res, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.user.sub).toBe('uid1')
    expect(req.user.role).toBe('ADMIN')
  })

  test('authorize bloqueia role não permitida', () => {
    const req = mockReq({ user: { sub: 'uid1', role: 'ATHLETE' } })
    const res = mockRes()
    authMiddleware.authorize('ADMIN')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('authorize permite role correta', () => {
    const req = mockReq({ user: { sub: 'uid1', role: 'ADMIN' } })
    const res = mockRes()
    authMiddleware.authorize('ADMIN', 'ORGANIZER')(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test('authorize bloqueia sem req.user', () => {
    const req = mockReq({ user: null })
    const res = mockRes()
    authMiddleware.authorize('ADMIN')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

describe('Middleware — validate', () => {
  let validate

  beforeEach(async () => {
    const mod = await import('../src/middlewares/validate.middleware.js')
    validate = mod.validate
    next.mockClear()
  })

  const schema = z.object({ name: z.string().min(2), age: z.number().int() })

  test('chama next() com dados válidos', () => {
    const req = mockReq({ body: { name: 'Lucas', age: 25 } })
    const res = mockRes()
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test('retorna 422 com dados inválidos', () => {
    const req = mockReq({ body: { name: 'L', age: 'vinte' } })
    const res = mockRes()
    validate(schema)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
  })
})

describe('Middleware — error handler', () => {
  let errorHandler

  beforeEach(async () => {
    const mod = await import('../src/middlewares/error.middleware.js')
    errorHandler = mod.errorHandler
  })

  test('trata P2002 (duplicidade) como 409', () => {
    const err = Object.assign(new Error('Unique'), { code: 'P2002' })
    const res = mockRes()
    errorHandler(err, {}, res, next)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  test('trata P2025 (not found) como 404', () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' })
    const res = mockRes()
    errorHandler(err, {}, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  test('trata LIMIT_FILE_SIZE como 413', () => {
    const err = Object.assign(new Error('Too large'), { code: 'LIMIT_FILE_SIZE' })
    const res = mockRes()
    errorHandler(err, {}, res, next)
    expect(res.status).toHaveBeenCalledWith(413)
  })

  test('usa statusCode customizado do erro', () => {
    const err = Object.assign(new Error('Not found custom'), { statusCode: 404 })
    const res = mockRes()
    errorHandler(err, {}, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  test('fallback para 500 em erro genérico', () => {
    const err = new Error('Erro genérico')
    const res = mockRes()
    errorHandler(err, {}, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('Middleware — resolveImageUrl', () => {
  let resolveImageUrl

  beforeEach(async () => {
    const mod = await import('../src/middlewares/upload.middleware.js')
    resolveImageUrl = mod.resolveImageUrl
    next.mockClear()
  })

  test('usa arquivo enviado quando req.file existe', () => {
    const req = mockReq({ file: { filename: 'foto.jpg' }, body: {} })
    const res = mockRes()
    resolveImageUrl('banners')(req, res, next)
    expect(req.resolvedImageUrl).toBe('/uploads/banners/foto.jpg')
    expect(next).toHaveBeenCalled()
  })

  test('usa URL do body quando não há arquivo', () => {
    const req = mockReq({ file: null, body: { imageUrl: 'https://example.com/banner.jpg' } })
    const res = mockRes()
    resolveImageUrl('banners')(req, res, next)
    expect(req.resolvedImageUrl).toBe('https://example.com/banner.jpg')
    expect(next).toHaveBeenCalled()
  })

  test('retorna 400 com URL inválida no body', () => {
    const req = mockReq({ file: null, body: { imageUrl: 'nao-e-uma-url' } })
    const res = mockRes()
    resolveImageUrl('banners')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('define null quando não há arquivo nem URL', () => {
    const req = mockReq({ file: null, body: {} })
    const res = mockRes()
    resolveImageUrl('banners')(req, res, next)
    expect(req.resolvedImageUrl).toBeNull()
    expect(next).toHaveBeenCalled()
  })

  test('prioriza arquivo sobre URL no body', () => {
    const req = mockReq({
      file: { filename: 'upload.png' },
      body: { imageUrl: 'https://example.com/outro.jpg' },
    })
    const res = mockRes()
    resolveImageUrl('products')(req, res, next)
    expect(req.resolvedImageUrl).toBe('/uploads/products/upload.png')
  })
})

// ══════════════════════════════════════════════════════════════════════════
// 3. SERVICES
// ══════════════════════════════════════════════════════════════════════════

describe('Service — auth', () => {
  let authService

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-jwt-combateplus-32chars'
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-jwt-combateplus-32chars'
    process.env.DATABASE_URL = 'postgresql://test'
  })

  beforeEach(async () => {
    clearAllMocks()
    authService = await import('../src/services/auth.service.js')
  })

  test('login lança 401 com senha incorreta', async () => {
    const hash = await bcrypt.hash('SenhaCorreta@1', 12)

    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@a.com',
      password: hash,
      active: true,
      role: 'ATHLETE',
      name: 'Teste'
    })

    await expect(
      authService.login({ email: 'a@a.com', password: 'SenhaErrada@1' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('Service — events', () => {
  let eventsService

  beforeEach(async () => {
    clearAllMocks()
    eventsService = await import('../src/services/events.service.js')
  })

  test('getEvent lança 404 quando não encontrado', async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null)
    await expect(eventsService.getEvent('id-inexistente')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('getEvent retorna evento existente', async () => {
    const evento = { id: 'ev1', title: 'Copa', organizer: { id: 'o1', name: 'Org' }, categories: [], _count: { registrations: 5 } }
    mockPrisma.event.findFirst.mockResolvedValue(evento)
    const result = await eventsService.getEvent('ev1')
    expect(result.title).toBe('Copa')
  })

  test('createEvent gera slug a partir do título', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null) // slug não existe
    mockPrisma.event.create.mockResolvedValue({ id: 'ev2', slug: 'copa-nordeste-bjj-2025' })
    await eventsService.createEvent({
      title: 'Copa Nordeste BJJ 2025',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      registrationDeadline: new Date().toISOString(),
    }, 'organizer-id')
    const createData = mockPrisma.event.create.mock.calls[0][0].data
    expect(createData.slug).toBe('copa-nordeste-bjj-2025')
  })

  test('createEvent adiciona sufixo ao slug se já existe', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({ id: 'exist' }) // slug já existe
    mockPrisma.event.create.mockResolvedValue({ id: 'ev3' })
    await eventsService.createEvent({
      title: 'Copa Nordeste BJJ 2025',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      registrationDeadline: new Date().toISOString(),
    }, 'org-id')
    const slug = mockPrisma.event.create.mock.calls[0][0].data.slug
    expect(slug).toMatch(/^copa-nordeste-bjj-2025-\d+$/)
  })

  test('updateEvent lança 403 se organizador diferente tenta editar', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev1', organizerId: 'outro-org' })
    await expect(eventsService.updateEvent('ev1', {}, { role: 'ORGANIZER', sub: 'meu-id' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  test('uploadBanner atualiza bannerUrl no evento', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev1', organizerId: 'org1' })
    mockPrisma.event.update.mockResolvedValue({ id: 'ev1', bannerUrl: '/uploads/banners/banner.jpg' })
    const result = await eventsService.uploadBanner('ev1', '/uploads/banners/banner.jpg', { role: 'ADMIN', sub: 'any' })
    expect(result.bannerUrl).toBe('/uploads/banners/banner.jpg')
  })
})

describe('Service — categories', () => {
  let categoriesService

  beforeEach(async () => {
    clearAllMocks()
    categoriesService = await import('../src/services/categories.service.js')
  })

  test('getCategory lança 404 quando não encontrada', async () => {
    mockPrisma.eventCategory.findUnique.mockResolvedValue(null)
    await expect(categoriesService.getCategory('id-inexistente')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('createCategory lança 403 se organizador não é dono do evento', async () => {
    mockPrisma.event.findUnique.mockResolvedValue({ id: 'ev1', organizerId: 'outro' })
    await expect(categoriesService.createCategory('ev1', {}, { role: 'ORGANIZER', sub: 'meu-id' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  test('deleteCategory lança 400 se há inscrições', async () => {
    mockPrisma.eventCategory.findUnique.mockResolvedValue({
      id: 'cat1',
      event: { organizerId: 'org1' },
      _count: { registrations: 3 },
    })
    await expect(categoriesService.deleteCategory('cat1', { role: 'ADMIN' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('deleteCategory remove quando não há inscrições', async () => {
    mockPrisma.eventCategory.findUnique.mockResolvedValue({
      id: 'cat1',
      event: { organizerId: 'org1' },
      _count: { registrations: 0 },
    })
    mockPrisma.eventCategory.delete.mockResolvedValue({})
    await expect(categoriesService.deleteCategory('cat1', { role: 'ADMIN' })).resolves.not.toThrow()
  })
})

describe('Service — registrations', () => {
  let registrationsService

  beforeEach(async () => {
    clearAllMocks()
    registrationsService = await import('../src/services/registrations.service.js')
  })

  const mockEvent = (overrides = {}) => ({
    id: 'ev1', status: 'PUBLISHED', registrationDeadline: new Date(Date.now() + 86400000),
    maxAthletes: null, platformFeeOverride: null, ...overrides,
  })

  const mockCategory = (overrides = {}) => ({
    id: 'cat1', eventId: 'ev1', price: 7000, maxSlots: null,
    _count: { registrations: 0 }, ...overrides,
  })

  test('createRegistration lança 404 se evento não existe', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null)
    mockPrisma.eventCategory.findUnique.mockResolvedValue(mockCategory())
    await expect(registrationsService.createRegistration({ eventId: 'ev1', categoryId: 'cat1', teamName: 'Team' }, 'ath1'))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  test('createRegistration lança 400 se prazo encerrado', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(mockEvent({ registrationDeadline: new Date('2000-01-01') }))
    mockPrisma.eventCategory.findUnique.mockResolvedValue(mockCategory())
    await expect(registrationsService.createRegistration({ eventId: 'ev1', categoryId: 'cat1', teamName: 'Team' }, 'ath1'))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('createRegistration lança 400 se vagas esgotadas', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(mockEvent())
    mockPrisma.eventCategory.findUnique.mockResolvedValue(mockCategory({ maxSlots: 2, _count: { registrations: 2 } }))
    await expect(registrationsService.createRegistration({ eventId: 'ev1', categoryId: 'cat1', teamName: 'T' }, 'ath1'))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('cancelRegistration lança 403 se atleta tenta cancelar de outro', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue({ id: 'r1', athleteId: 'outro-atleta', status: 'PENDING', payment: null })
    await expect(registrationsService.cancelRegistration('r1', { role: 'ATHLETE', sub: 'meu-id' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  test('cancelRegistration lança 400 se já cancelada', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue({ id: 'r1', athleteId: 'ath1', status: 'CANCELLED', payment: null })
    await expect(registrationsService.cancelRegistration('r1', { role: 'ADMIN', sub: 'admin' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('getRegistration lança 403 se atleta tenta ver inscrição de outro', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue({ id: 'r1', athleteId: 'outro', event: {}, category: {}, payment: null, cashback: null, athlete: {} })
    await expect(registrationsService.getRegistration('r1', { role: 'ATHLETE', sub: 'meu-id' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('Service — payments', () => {
  let paymentsService

  beforeEach(async () => {
    clearAllMocks()
    paymentsService = await import('../src/services/payments.service.js')
  })

  test('approvePayment lança 400 se já aprovado', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue({ id: 'r1', athleteId: 'ath1', payment: { status: 'APPROVED' } })
    await expect(paymentsService.approvePayment('r1')).rejects.toMatchObject({ statusCode: 400 })
  })

  test('approvePayment lança 404 se inscrição não existe', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue(null)
    await expect(paymentsService.approvePayment('r1')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('submitReceipt lança 400 se pagamento já aprovado', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue({
      id: 'r1', athleteId: 'ath1',
      payment: { status: 'APPROVED' },
    })
    await expect(paymentsService.submitReceipt('r1', '/url', { role: 'ATHLETE', sub: 'ath1' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('submitReceipt lança 403 se atleta tenta enviar comprovante de outro', async () => {
    mockPrisma.registration.findUnique.mockResolvedValue({
      id: 'r1', athleteId: 'outro-atleta',
      payment: { status: 'PENDING' },
    })
    await expect(paymentsService.submitReceipt('r1', '/url', { role: 'ATHLETE', sub: 'meu-id' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('Service — brackets', () => {
  let bracketsService

  beforeEach(async () => {
    clearAllMocks()
    bracketsService = await import('../src/services/brackets.service.js')
  })

  test('generateCategoryBracket lança 400 com menos de 2 aprovados', async () => {
    mockPrisma.registration.findMany.mockResolvedValue([
      { athleteId: 'a1', teamName: 'Team', athlete: { id: 'a1', name: 'Ana' } },
    ])
    await expect(bracketsService.generateCategoryBracket('ev1', 'cat1'))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('getBracket lança 404 quando chaveamento não existe', async () => {
    mockPrisma.bracket.findUnique.mockResolvedValue(null)
    await expect(bracketsService.getBracket('ev1', 'cat1'))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  test('generateCategoryBracket cria bracket e lutas', async () => {
    mockPrisma.registration.findMany.mockResolvedValue([
      { athleteId: 'a1', teamName: 'Alliance', athlete: { id: 'a1', name: 'Ana' } },
      { athleteId: 'a2', teamName: 'GB',       athlete: { id: 'a2', name: 'Bruno' } },
    ])
    mockPrisma.bracket.upsert.mockResolvedValue({ id: 'bracket1', eventId: 'ev1', categoryId: 'cat1' })
    mockPrisma.fight.deleteMany.mockResolvedValue({})
    mockPrisma.fight.createMany.mockResolvedValue({ count: 1 })
    mockPrisma.bracket.findUnique.mockResolvedValue({
      id: 'bracket1',
      fights: [{ id: 'f1', round: 1, position: 0, fighterAId: 'a1', fighterBId: 'a2', status: 'SCHEDULED', fighterA: { id: 'a1', name: 'Ana' }, fighterB: { id: 'a2', name: 'Bruno' }, winner: null }],
      category: { id: 'cat1', name: 'Masculino Faixa Azul Médio' },
    })
    const result = await bracketsService.generateCategoryBracket('ev1', 'cat1')
    expect(mockPrisma.fight.createMany).toHaveBeenCalled()
    expect(result.fights.length).toBe(1)
  })
})

describe('Service — fights', () => {
  let fightsService

  beforeEach(async () => {
    clearAllMocks()
    fightsService = await import('../src/services/fights.service.js')
  })

  test('startFight lança 404 se luta não existe', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue(null)
    await expect(fightsService.startFight('fight1')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('startFight lança 400 se luta não está SCHEDULED', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue({ id: 'f1', status: 'ONGOING', fighterAId: 'a1', fighterBId: 'b1' })
    await expect(fightsService.startFight('f1')).rejects.toMatchObject({ statusCode: 400 })
  })

  test('startFight lança 400 se falta um lutador', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue({ id: 'f1', status: 'SCHEDULED', fighterAId: 'a1', fighterBId: null })
    await expect(fightsService.startFight('f1')).rejects.toMatchObject({ statusCode: 400 })
  })

  test('startFight inicia luta corretamente', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue({ id: 'f1', status: 'SCHEDULED', fighterAId: 'a1', fighterBId: 'b1' })
    mockPrisma.fight.update.mockResolvedValue({ id: 'f1', status: 'ONGOING', startedAt: new Date(), fighterA: { id: 'a1', name: 'A' }, fighterB: { id: 'b1', name: 'B' } })
    const result = await fightsService.startFight('f1')
    expect(result.status).toBe('ONGOING')
  })

  test('finishFight lança 400 se vencedor inválido', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue({ id: 'f1', status: 'ONGOING', fighterAId: 'a1', fighterBId: 'b1', bracket: {} })
    await expect(fightsService.finishFight('f1', { winnerId: 'c3', durationSeconds: 300, scoreA: 0, scoreB: 0 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('finishFight lança 400 se já finalizada', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue({ id: 'f1', status: 'FINISHED', fighterAId: 'a1', fighterBId: 'b1', bracket: {} })
    await expect(fightsService.finishFight('f1', { winnerId: 'a1', durationSeconds: 300, scoreA: 4, scoreB: 0 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('updateScore lança 400 se luta não está ONGOING', async () => {
    mockPrisma.fight.findUnique.mockResolvedValue({ id: 'f1', status: 'SCHEDULED' })
    await expect(fightsService.updateScore('f1', { scoreA: 2, scoreB: 0, advantagesA: 0, advantagesB: 0, penaltiesA: 0, penaltiesB: 0 }))
      .rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('Service — highlights', () => {
  let highlightsService

  beforeEach(async () => {
    clearAllMocks()
    highlightsService = await import('../src/services/highlights.service.js')
  })

  test('createHighlight lança 404 se evento não existe', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null)
    await expect(highlightsService.createHighlight({ eventId: 'ev1', type: 'TICKER', startsAt: new Date().toISOString(), endsAt: new Date().toISOString(), priceCents: 5000 }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  test('confirmPayment ativa o destaque', async () => {
    mockPrisma.eventHighlight.findUnique.mockResolvedValue({ id: 'h1' })
    mockPrisma.eventHighlight.update.mockResolvedValue({ id: 'h1', paid: true, active: true })
    const result = await highlightsService.confirmPayment('h1')
    expect(result.paid).toBe(true)
    expect(result.active).toBe(true)
  })
})

describe('Service — news', () => {
  let newsService

  beforeEach(async () => {
    clearAllMocks()
    newsService = await import('../src/services/news.service.js')
  })

  test('getNews lança 404 quando não encontrada', async () => {
    mockPrisma.newsPost.findFirst.mockResolvedValue(null)
    await expect(newsService.getNews('id-inexistente')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('getNews lança 404 para não-admin tentando ver notícia não publicada', async () => {
    mockPrisma.newsPost.findFirst.mockResolvedValue({ id: 'n1', published: false })
    await expect(newsService.getNews('n1', { role: 'ATHLETE' })).rejects.toMatchObject({ statusCode: 404 })
  })

  test('getNews retorna notícia publicada para não-admin', async () => {
    mockPrisma.newsPost.findFirst.mockResolvedValue({ id: 'n1', title: 'Notícia', published: true })
    const result = await newsService.getNews('n1', null)
    expect(result.id).toBe('n1')
  })

  test('createNews gera slug a partir do título', async () => {
    mockPrisma.newsPost.findUnique.mockResolvedValue(null) // slug livre
    mockPrisma.newsPost.create.mockResolvedValue({ id: 'n2', slug: 'titulo-da-noticia', title: 'Título da Notícia' })
    await newsService.createNews({ title: 'Título da Notícia', content: 'Conteúdo longo o suficiente', authorName: 'Admin' })
    const createData = mockPrisma.newsPost.create.mock.calls[0][0].data
    expect(createData.slug).toBe('titulo-da-noticia')
  })

  test('publishNews lança 400 se já publicada', async () => {
    mockPrisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', published: true })
    await expect(newsService.publishNews('n1')).rejects.toMatchObject({ statusCode: 400 })
  })

  test('deleteNews lança 404 se não encontrada', async () => {
    mockPrisma.newsPost.findUnique.mockResolvedValue(null)
    await expect(newsService.deleteNews('n-xxx')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('Service — products', () => {
  let productsService

  beforeEach(async () => {
    clearAllMocks()
    productsService = await import('../src/services/products.service.js')
  })

  test('getProduct lança 404 quando não encontrado', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null)
    await expect(productsService.getProduct('id-inexistente')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('getProduct lança 404 para não-admin tentando ver produto inativo', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', active: false })
    await expect(productsService.getProduct('p1', { role: 'ATHLETE' })).rejects.toMatchObject({ statusCode: 404 })
  })

  test('adjustStock lança 400 quando estoque ficaria negativo', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 3 })
    await expect(productsService.adjustStock('p1', -10)).rejects.toMatchObject({ statusCode: 400 })
  })

  test('adjustStock atualiza estoque corretamente', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', stock: 10 })
    mockPrisma.product.update.mockResolvedValue({ id: 'p1', stock: 15 })
    const result = await productsService.adjustStock('p1', +5)
    const updateCall = mockPrisma.product.update.mock.calls[0][0]
    expect(updateCall.data.stock).toBe(15)
  })

  test('deactivateProduct realiza soft delete', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', active: true })
    mockPrisma.product.update.mockResolvedValue({ id: 'p1', active: false })
    const result = await productsService.deactivateProduct('p1')
    const updateCall = mockPrisma.product.update.mock.calls[0][0]
    expect(updateCall.data.active).toBe(false)
  })
})

describe('Service — orders', () => {
  let ordersService

  beforeEach(async () => {
    clearAllMocks()
    ordersService = await import('../src/services/orders.service.js')
  })

  test('createOrder lança 404 se produto não existe ou está inativo', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]) // nenhum produto retornado
    await expect(ordersService.createOrder({ items: [{ productId: 'p-inexistente', quantity: 1 }] }, 'uid1'))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  test('createOrder lança 400 se estoque insuficiente', async () => {
    mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Camiseta', stock: 2, price: 5000, active: true }])
    await expect(ordersService.createOrder({ items: [{ productId: 'p1', quantity: 10 }] }, 'uid1'))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('getOrder lança 403 se atleta tenta ver pedido de outro', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'outro-usuario', items: [], user: {} })
    await expect(ordersService.getOrder('o1', { role: 'ATHLETE', sub: 'meu-id' }))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  test('cancelOrder lança 400 para atleta tentando cancelar pedido não-PENDING', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'uid1', status: 'SHIPPED', items: [] })
    await expect(ordersService.cancelOrder('o1', { role: 'ATHLETE', sub: 'uid1' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('cancelOrder lança 400 se pedido já cancelado', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'uid1', status: 'CANCELLED', items: [] })
    await expect(ordersService.cancelOrder('o1', { role: 'ADMIN', sub: 'admin' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('updateOrderStatus lança 400 com status inválido', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'o1' })
    await expect(ordersService.updateOrderStatus('o1', 'STATUS_INVALIDO'))
      .rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('Service — users', () => {
  let usersService

  beforeEach(async () => {
    clearAllMocks()
    usersService = await import('../src/services/users.service.js')
  })

  test('changePassword lança 400 com senha atual incorreta', async () => {
    const hash = await bcrypt.hash('SenhaCorreta@1', 12)

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'uid1',
      password: hash
    })

    await expect(
      usersService.changePassword('uid1', {
        currentPassword: 'SenhaErrada@1',
        newPassword: 'Nova@123'
      })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})