export const ok = (res, data, message, meta) => res.status(200).json({ success: true, data, message, meta })
export const created = (res, data, message = 'Criado com sucesso') => res.status(201).json({ success: true, data, message })
export const noContent = (res) => res.status(204).send()

export const badRequest = (res, error) => res.status(400).json({ success: false, error })
export const unauthorized = (res, error = 'Não autorizado') => res.status(401).json({ success: false, error })
export const forbidden = (res, error = 'Acesso negado') => res.status(403).json({ success: false, error })
export const notFound = (res, error = 'Não encontrado') => res.status(404).json({ success: false, error })
export const conflict = (res, error) => res.status(409).json({ success: false, error })
export const serverError = (res, error = 'Erro interno') => res.status(500).json({ success: false, error })

export const paginate = (res, data, total, page, perPage) =>
  ok(res, data, undefined, { page, perPage, total, totalPages: Math.ceil(total / perPage) })