const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Iniciamos la IA de Google
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ reply: "No has enviado ningún mensaje." });
        }

        // Llamada oficial actualizada a Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
        });

        // Aseguramos que extraemos bien el texto de la respuesta
        if (response && response.text) {
            res.json({ reply: response.text });
        } else {
            console.error("Gemini no devolvió texto:", response);
            res.json({ reply: "Lo siento, la IA recibió el mensaje pero no generó texto." });
        }

    } catch (error) {
        console.error("Error completo en la petición de Gemini:", error);
        res.status(500).json({ reply: "Error interno al conectar con Google Gemini." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});
