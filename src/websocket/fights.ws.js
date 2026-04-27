import { WebSocketServer } from 'ws'

/** Map de fightId → Set de clientes WebSocket */
const rooms = new Map()

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/fights' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'ws://localhost')
    const fightId = url.searchParams.get('fightId')

    if (!fightId) { ws.close(1008, 'fightId obrigatório'); return }

    // Entra na sala da luta
    if (!rooms.has(fightId)) rooms.set(fightId, new Set())
    rooms.get(fightId).add(ws)

    ws.on('close', () => {
      rooms.get(fightId)?.delete(ws)
      if (rooms.get(fightId)?.size === 0) rooms.delete(fightId)
    })

    ws.on('error', console.error)
    ws.send(JSON.stringify({ type: 'CONNECTED', fightId }))
  })

  console.log('⚡ WebSocket ativo em /ws/fights')
  return wss
}

/** Envia evento para todos os clientes de uma luta */
export function broadcast(fightId, payload) {
  const clients = rooms.get(fightId)
  if (!clients?.size) return

  const msg = JSON.stringify(payload)
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}