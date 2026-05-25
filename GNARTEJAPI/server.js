// server.js - ¡Esta es tu propia API!
const express = require('express');
const cors = require('cors');
const app = express();

// Usamos el puerto que nos dé Render automáticamente, o el 3000 si probamos en casa
const PUERTO = process.env.PORT || 3000;

// Permite que tu chat HTML hable con tu API sin bloqueos de seguridad (CORS)
app.use(cors());
app.use(express.json());

// 1. Ruta de charla de tu API
app.get('/api/chat', (req, res) => {
    const mensajeUsuario = req.query.mensaje;
    
    // Aquí tu API procesa el texto. De momento simula la respuesta fluida:
    const respuestaFluida = `[API Propia]: He recibido tu mensaje: "${mensajeUsuario}". ¡Estoy lista para conectarme al cerebro de la IA!`;
    
    res.json({ respuesta: respuestaFluida });
});

// 2. Ruta de saludo rápida (Para la pantalla de carga de tu HTML)
app.get('/api/ping', (req, res) => {
    res.json({ estado: "despierto" });
});

// Enciende tu servidor API
app.listen(PUERTO, () => {
    console.log(`Tu API propia está encendida en el puerto ${PUERTO}`);
});