const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Se conecta usando la clave que pusiste en el panel de Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { mensaje } = req.body;

        if (!mensaje) {
            return res.status(400).json({ respuesta: "No has enviado ningún mensaje." });
        }

        // Llamada oficial a Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: mensaje,
        });

        // Devuelve la respuesta limpia de la IA
        res.json({ respuesta: response.text });

    } catch (error) {
        console.error("Error con Gemini:", error);
        res.status(500).json({ respuesta: "Error al procesar el mensaje con Gemini." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor de GNARTEJ corriendo en el puerto ${PORT}`);
});
