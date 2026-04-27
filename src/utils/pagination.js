export const parsePage = (query) => ({
  page: Math.max(1, parseInt(query.page ?? '1', 10)),
  perPage: Math.min(100, parseInt(query.perPage ?? '20', 10)),
})

export const skip = (page, perPage) => (page - 1) * perPage