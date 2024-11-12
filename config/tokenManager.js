const express = require('express');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

//Autenticación del token de jwt
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token ha expirado' });
      }
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

// Configuración del servidor
app.use(express.json());

 //Extraer datos
app.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { emailData, userId } = req.body;
    const transaction = new Transaction();
    const result = await transaction.process(emailData, userId, 'extract');
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

 //Actualizar datos
app.post('/update', authenticateToken, async (req, res) => {
  try {
    const { emailData, userId } = req.body;
    const transaction = new Transaction();
    const result = await transaction.process(emailData, userId, 'update');
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = {
  authenticateToken
};
