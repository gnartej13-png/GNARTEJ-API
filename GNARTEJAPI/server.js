const express = require('express');
const cors = require('cors');
const app = express();

const PUERTO = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// LA RUTA CLAVE: Esto es lo que despertará tu pantalla de carga
app.get('/api/ping', (req, res) => {
    res.json({ estado: "despierto" });
});

// La ruta para los mensajes del chat
app.get('/api/chat', (req, res) => {
    const mensajeUsuario = req.query.mensaje;
    const respuestaFluida = `[API Propia]: He recibido tu mensaje: "${mensajeUsuario}". ¡Estoy lista!`;
    res.json({ respuesta: respuestaFluida });
});

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo en el puerto ${PUERTO}`);
});
