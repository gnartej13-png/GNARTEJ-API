const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Aquí conectamos con tu clave secreta de Render
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ reply: "No has enviado ningún mensaje." });
        }

        // Llamada oficial con el formato correcto actual
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
        });

        // Verificamos que Google nos devuelva texto de verdad
        if (response && response.text) {
            res.json({ reply: response.text });
        } else {
            console.error("Google no ha devuelto texto:", response);
            res.json({ reply: "La IA ha recibido el mensaje pero no ha generado texto." });
        }

    } catch (error) {
        console.error("Error al conectar con Gemini:", error);
        res.status(500).json({ reply: "Error interno al procesar el mensaje con Gemini." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});
