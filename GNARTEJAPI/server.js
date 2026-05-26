const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Aquí es donde Render lee la clave que pusiste en Environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Llamada oficial a la última versión de Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
        });

        res.json({ reply: response.text });
    } catch (error) {
        console.error("Error con Gemini:", error);
        res.status(500).json({ error: "Error al procesar el mensaje con Gemini." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
