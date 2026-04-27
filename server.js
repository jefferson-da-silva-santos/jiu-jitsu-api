import http from 'http'
import app from './src/app.js'
import { env } from './src/config/env.js'
import { setupWebSocket } from './src/websocket/fights.ws.js'
import prisma from './src/config/database.js'

const server = http.createServer(app)

setupWebSocket(server)

const start = async () => {
  try {
    await prisma.$connect()
    console.log('✅ Banco de dados conectado')

    server.listen(env.PORT, () => {
      console.log(`
 ██████╗ ██████╗ ███╗   ███╗██████╗  █████╗ ████████╗███████╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
██║     ██║   ██║██╔████╔██║██████╔╝███████║   ██║   █████╗  
██║     ██║   ██║██║╚██╔╝██║██╔══██╗██╔══██║   ██║   ██╔══╝  
╚██████╗╚██████╔╝██║ ╚═╝ ██║██████╔╝██║  ██║   ██║   ███████╗
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

🥋 CombatePlus API rodando!
   → HTTP:      http://localhost:${env.PORT}
   → API:       http://localhost:${env.PORT}${env.API_PREFIX}
   → WebSocket: ws://localhost:${env.PORT}/ws/fights
   → Health:    http://localhost:${env.PORT}/health
   → Ambiente:  ${env.NODE_ENV}
      `)
    })
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  console.log('🛑 Encerrando servidor...')
  await prisma.$disconnect()
  server.close(() => process.exit(0))
})

start()