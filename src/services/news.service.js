import prisma from '../config/database.js'
import { parsePage, skip } from '../utils/pagination.js'

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/**
 * Lista notícias publicadas (público) ou todas (admin).
 * Suporta busca por título e paginação.
 */
export const listNews = async (query, requester = null) => {
  const { page, perPage } = parsePage(query)
  const where = {}

  // Não-admin vê apenas publicadas
  if (!requester || requester.role !== 'ADMIN') {
    where.published = true
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { authorName: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const [news, total] = await prisma.$transaction([
    prisma.newsPost.findMany({
      where,
      skip: skip(page, perPage),
      take: perPage,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        coverUrl: true,
        authorName: true,
        published: true,
        publishedAt: true,
        createdAt: true,
        // Trecho do conteúdo para preview (primeiros 200 chars)
        content: true,
      },
    }),
    prisma.newsPost.count({ where }),
  ])

  // Gera excerpt sem carregar tudo no banco
  const newsWithExcerpt = news.map((n) => ({
    ...n,
    excerpt: n.content.length > 200 ? n.content.substring(0, 200) + '...' : n.content,
    content: undefined, // remove conteúdo completo da listagem
  }))

  return { news: newsWithExcerpt, total, page, perPage }
}

/**
 * Retorna uma notícia pelo slug ou ID.
 * Não-admin só vê publicadas.
 */
export const getNews = async (slugOrId, requester = null) => {
  const post = await prisma.newsPost.findFirst({
    where: { OR: [{ id: slugOrId }, { slug: slugOrId }] },
  })

  if (!post) throw Object.assign(new Error('Notícia não encontrada.'), { statusCode: 404 })

  if (!post.published && (!requester || requester.role !== 'ADMIN'))
    throw Object.assign(new Error('Notícia não disponível.'), { statusCode: 404 })

  return post
}

/**
 * Cria uma nova notícia. Apenas ADMIN.
 * Gera slug único a partir do título.
 */
export const createNews = async ({ title, content, authorName, published, coverUrl }) => {
  const baseSlug = slugify(title)

  // Garante unicidade do slug
  const existing = await prisma.newsPost.findUnique({ where: { slug: baseSlug } })
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  const publishedAt = published ? new Date() : null

  return prisma.newsPost.create({
    data: {
      title,
      slug,
      content,
      authorName,
      coverUrl: coverUrl ?? null,
      published: published ?? false,
      publishedAt,
    },
  })
}

/**
 * Atualiza uma notícia. Apenas ADMIN.
 * Se publicada pela primeira vez, define publishedAt.
 */
export const updateNews = async (id, data) => {
  const post = await prisma.newsPost.findUnique({ where: { id } })
  if (!post) throw Object.assign(new Error('Notícia não encontrada.'), { statusCode: 404 })

  const updates = { ...data }

  // Se está publicando pela primeira vez, seta publishedAt
  if (data.published === true && !post.published) {
    updates.publishedAt = new Date()
  }
  // Se está despublicando, limpa publishedAt
  if (data.published === false) {
    updates.publishedAt = null
  }

  // Se mudou o título, regenera slug
  if (data.title && data.title !== post.title) {
    const baseSlug = slugify(data.title)
    const existing = await prisma.newsPost.findFirst({
      where: { slug: baseSlug, id: { not: id } },
    })
    updates.slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug
  }

  return prisma.newsPost.update({ where: { id }, data: updates })
}

/**
 * Publica uma notícia. Apenas ADMIN.
 */
export const publishNews = async (id) => {
  const post = await prisma.newsPost.findUnique({ where: { id } })
  if (!post) throw Object.assign(new Error('Notícia não encontrada.'), { statusCode: 404 })
  if (post.published) throw Object.assign(new Error('Notícia já publicada.'), { statusCode: 400 })

  return prisma.newsPost.update({
    where: { id },
    data: { published: true, publishedAt: new Date() },
  })
}

/**
 * Despublica uma notícia. Apenas ADMIN.
 */
export const unpublishNews = async (id) => {
  const post = await prisma.newsPost.findUnique({ where: { id } })
  if (!post) throw Object.assign(new Error('Notícia não encontrada.'), { statusCode: 404 })

  return prisma.newsPost.update({
    where: { id },
    data: { published: false, publishedAt: null },
  })
}

/**
 * Remove uma notícia permanentemente. Apenas ADMIN.
 */
export const deleteNews = async (id) => {
  const post = await prisma.newsPost.findUnique({ where: { id } })
  if (!post) throw Object.assign(new Error('Notícia não encontrada.'), { statusCode: 404 })
  await prisma.newsPost.delete({ where: { id } })
}

/**
 * Faz upload de capa de notícia (atualiza coverUrl).
 */
export const uploadCover = async (id, coverUrl) => {
  const post = await prisma.newsPost.findUnique({ where: { id } })
  if (!post) throw Object.assign(new Error('Notícia não encontrada.'), { statusCode: 404 })
  return prisma.newsPost.update({ where: { id }, data: { coverUrl } })
}