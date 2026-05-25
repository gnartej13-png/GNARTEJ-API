const express = require('express');
const cors = require('cors');

const app = express();

// CONFIGURACIÓN DE SEGURIDAD Y TRADUCTOR DE DATOS
app.use(cors()); // Permite que tu index.html se comunique con Render
app.use(express.json()); // Traduce los mensajes entrantes para que el servidor los entienda

// RUTA PRINCIPAL DE PRUEBA (Para ver si la API está viva)
app.get('/', (req, res) => {
    res.send('¡El servidor de GNARTEJ-API está funcionando perfectamente en Render! 🚀');
});

// RUTA DEL CHAT (Aquí es donde llega el mensaje de tu web)
app.post('/api/chat', (req, res) => {
    // Recogemos el texto usando exactamente ".mensaje"
    const mensajeUsuario = req.body.mensaje;

    // Si por alguna razón el mensaje llega vacío, evitamos que rompa
    if (!mensajeUsuario) {
        return res.json({ 
            respuesta: "[API Propia]: Hola, parece que tu mensaje ha llegado vacío." 
        });
    }

    // RESPUESTA DEL SERVIDOR
    // Aquí es donde tu API le contesta de vuelta a la web:
    res.json({ 
        respuesta: "[API Propia]: He recibido tu mensaje: \"" + mensajeUsuario + "\". ¡Estoy lista!" 
    });
});

// PUERTO AUTOMÁTICO PARA RENDER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("Servidor corriendo en el puerto " + PORT);
});
