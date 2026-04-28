import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const adminHash = await bcrypt.hash('Admin@123', 12)
  const orgHash = await bcrypt.hash('Org@123', 12)
  const ath1Hash = await bcrypt.hash('Atleta@123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@combateplus.com.br' },
    update: {},
    create: { name: 'Admin CombatePlus', email: 'admin@combateplus.com.br', password: adminHash, cpf: '000.000.000-00', role: 'ADMIN' },
  })

  const organizer = await prisma.user.upsert({
    where: { email: 'org@nordestejj.com.br' },
    update: {},
    create: { name: 'João Organizador', email: 'org@nordestejj.com.br', password: orgHash, cpf: '111.111.111-11', phone: '(81) 99999-0001', role: 'ORGANIZER' },
  })

  await prisma.user.upsert({
    where: { email: 'lucas@alliance.com.br' },
    update: {},
    create: { name: 'Lucas Ferreira', email: 'lucas@alliance.com.br', password: ath1Hash, cpf: '222.222.222-22', phone: '(81) 99999-0002', role: 'ATHLETE' },
  })

  const event = await prisma.event.upsert({
    where: { slug: 'copa-nordeste-bjj-2025' },
    update: {},
    create: {
      title: 'Copa Nordeste BJJ 2025',
      slug: 'copa-nordeste-bjj-2025',
      description: 'O maior campeonato de Jiu-Jitsu do Nordeste brasileiro.',
      status: 'PUBLISHED',
      organizerId: organizer.id,
      venueName: 'Ginásio Municipal Geraldo Magalhães',
      venueAddress: 'Av. Agamenon Magalhães, 4650',
      venueCity: 'Recife',
      venueState: 'PE',
      venueLat: -8.0476,
      venueLng: -34.877,
      startDate: new Date('2025-06-15T08:00:00'),
      endDate: new Date('2025-06-15T20:00:00'),
      registrationDeadline: new Date('2025-06-10T23:59:59'),
      maxAthletes: 1000,
    },
  })

  const cats = [
    { name: 'Masculino Faixa Branca Médio', gender: 'MALE', belt: 'WHITE', weightMin: 70.01, weightMax: 76, price: 6000 },
    { name: 'Masculino Faixa Azul Leve', gender: 'MALE', belt: 'BLUE', weightMin: 64.01, weightMax: 70, price: 7000 },
    { name: 'Masculino Faixa Azul Médio', gender: 'MALE', belt: 'BLUE', weightMin: 70.01, weightMax: 76, price: 7000 },
    { name: 'Masculino Faixa Azul Pesado', gender: 'MALE', belt: 'BLUE', weightMin: 76.01, weightMax: 82, price: 7000 },
    { name: 'Feminino Faixa Branca Leve', gender: 'FEMALE', belt: 'WHITE', weightMax: 58, price: 6000 },
    { name: 'Absoluto Masculino Faixa Azul', gender: 'MALE', belt: 'BLUE', isAbsolute: true, price: 3000 },
  ]

  for (const cat of cats) {
    const slug = cat.name.toLowerCase().replace(/\s+/g, '-')
    await prisma.eventCategory.upsert({
      where: { id: `seed-${slug}` },
      update: {},
      create: { id: `seed-${slug}`, eventId: event.id, name: cat.name, gender: cat.gender, belt: cat.belt, weightMin: cat.weightMin ?? null, weightMax: cat.weightMax ?? null, isAbsolute: cat.isAbsolute ?? false, price: cat.price, maxSlots: 64 },
    })
  }

  const products = [
    { name: 'Camiseta CombatePlus Premium', category: 'APPAREL', price: 8990, stock: 50 },
    { name: 'Boné CombatePlus Snapback', category: 'APPAREL', price: 5990, stock: 30 },
    { name: 'Copo Térmico 500ml', category: 'ACCESSORIES', price: 4990, stock: 40 },
    { name: 'Rashguard Competição', category: 'APPAREL', price: 14990, stock: 20 },
    { name: 'Protetor Bucal Profissional', category: 'EQUIPMENT', price: 3990, stock: 60 },
  ]

  for (const p of products) {
    await prisma.product.create({ data: { ...p, description: `${p.name} — linha oficial CombatePlus` } }).catch(() => { })
  }

  console.log(`
✅ Seed concluído!

👤 Logins:
   admin@combateplus.com.br  /  Admin@123
   org@nordestejj.com.br     /  Org@123
   lucas@alliance.com.br     /  Atleta@123

🏆 Evento: Copa Nordeste BJJ 2025 (${cats.length} categorias)
📦 Produtos: ${products.length} criados
`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())