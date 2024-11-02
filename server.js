require('dotenv').config()
const express = require('express')
const { setupBankService } = require('./services/banks/bankService')
const { setupSubscriptionService } = require('./services/subscriptions/subscriptionService')
const { setupPurchaseService } = require('./services/purchases/purchaseService')

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(express.json())

// Inicialización de servicios
const bankService = setupBankService()
const subscriptionService = setupSubscriptionService()
const purchaseService = setupPurchaseService()

// Rutas básicas
app.post('/webhook/email', async (req, res) => {
  try {
    const { emailData, userId } = req.body
    
    // Procesar el email según su tipo
    await Promise.all([
      bankService.processEmail(emailData, userId),
      subscriptionService.processEmail(emailData, userId),
      purchaseService.processEmail(emailData, userId)
    ])

    res.status(200).json({ message: 'Email procesado correctamente' })
  } catch (error) {
    console.error('Error procesando email:', error)
    res.status(500).json({ error: 'Error procesando email' })
  }
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' })
})

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Algo salió mal!' })
})

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
}) 