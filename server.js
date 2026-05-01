import app from './src/app.js'
import prisma from './src/config/database.js'

// Conecta ao banco de dados ao iniciar
const init = async () => {
  try {
    await prisma.$connect()
    console.log('✅ Banco de dados conectado com sucesso')
  } catch (err) {
    console.error('❌ Falha ao conectar ao banco de dados:', err)
  }
}

init()

// Exporta o app para o serverless da Vercel
export default app