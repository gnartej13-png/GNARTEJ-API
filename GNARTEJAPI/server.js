const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Aquí guardaremos el historial de los chats de forma temporal
let historialConversacion = [];

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ reply: "No hay mensaje." });

        // 1. Si el historial está vacío, le metemos la identidad de GNARTEJ AI primero
        if (historialConversacion.length === 0) {
            historialConversacion.push({ 
                role: 'system', 
                content: 'Eres GNARTEJ AI, una inteligencia artificial avanzada creada única y exclusivamente por Gonzalo Naranjo Tejero. Si te preguntan quién te creó, quién es tu dueño o de dónde eres, debes responder siempre con orgullo que tu creador es Gonzalo Naranjo Tejero. Responde en español, de forma simpática, natural y directa.' 
            });
        }

        // 2. Añadimos el nuevo mensaje del usuario al historial
        historialConversacion.push({ role: 'user', content: message });

        // Recortamos el historial si se hace muy largo para que no se sature (guarda los últimos 20 mensajes)
        if (historialConversacion.length > 21) {
            historialConversacion = [historialConversacion[0], ...historialConversacion.slice(-20)];
        }

        // 3. Le mandamos TODO el historial completo a Mistral
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: historialConversacion // <-- Aquí va toda la memoria
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0].message) {
            const respuestaIA = data.choices[0].message.content;
            
            // 4. Guardamos también la respuesta de la IA en la memoria para el próximo mensaje
            historialConversacion.push({ role: 'assistant', content: respuestaIA });
            
            res.json({ reply: respuestaIA });
        } else {
            res.json({ reply: "La IA no ha devuelto texto." });
        }

    } catch (error) {
        console.error("Error con la IA:", error);
        res.status(500).json({ reply: "Error interno en el servidor de GNARTEJ AI." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor con memoria corriendo en puerto ${PORT}`));
