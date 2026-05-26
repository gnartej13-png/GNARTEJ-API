const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Aquí conectamos con la clave de Gemini que pondrás en Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;

        if (!mensaje) {
            return res.status(400).json({ respuesta: "No has enviado ningún mensaje." });
        }

        // Llamada directa al modelo Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: mensaje,
        });

        // Enviamos la respuesta limpia de vuelta a tu Google Sites
        res.json({ respuesta: response.text });

    } catch (error) {
        console.error("Error al conectar con Gemini:", error);
        res.status(500).json({ respuesta: "Vaya, ha habido un problema interno al procesar el mensaje con Gemini." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor de GNARTEJ corriendo en el puerto ${PORT}`);
});
