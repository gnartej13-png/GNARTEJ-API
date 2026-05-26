const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ reply: "No hay mensaje." });

        // Llamada directa a Mistral AI (Modelo europeo potente)
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: [{ role: 'user', content: message }]
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0].message) {
            res.json({ reply: data.choices[0].message.content });
        } else {
            res.json({ reply: "La IA no ha devuelto una respuesta clara." });
        }

    } catch (error) {
        console.error("Error con Mistral:", error);
        res.status(500).json({ reply: "Error interno al conectar con la IA." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
