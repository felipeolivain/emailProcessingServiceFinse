require('dotenv').config()
const express = require('express')
const bankService = require('./services/banks/bankService')
const Transaction = require('./models/Transaction');

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(express.json())

// Rutas básicas
app.post('/webhook/email', async (req, res) => {
  try {
    const { emailData, userId } = req.body
    
    // Procesar el email según su tipo
    await bankService.processEmail(emailData, userId)

    res.status(200).json({ message: 'Email procesado correctamente' })
  } catch (error) {
    console.error('Error procesando email:', error)
    res.status(500).json({ error: 'Error procesando email' })
  }
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' })
})

// Endpoint para sincronizar transacciones
app.post('/api/transactions/sync', async (req, res) => {
  try {
    const { userId, action = 'extract' } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'Se requiere el ID del usuario' 
      });
    }

    const transaction = new Transaction();
    const results = await transaction.syncBankTransactions(userId, action);

    res.status(200).json({ 
      success: true,
      message: 'Sincronización completada',
      data: results
    });

  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error en la sincronización'
    });
  }
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Algo salió mal!' })
})

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
}) 