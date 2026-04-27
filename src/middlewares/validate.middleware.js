/** Valida req.body (ou query/params) com um schema Zod */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) {
    const details = result.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    return res.status(422).json({ success: false, error: 'Dados inválidos', details })
  }
  req[source] = result.data
  next()
}