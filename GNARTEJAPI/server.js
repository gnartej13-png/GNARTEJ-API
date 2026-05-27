const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Aquí se guarda la memoria del chat de forma temporal
let historialConversacion = [];

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ reply: "No hay mensaje." });

        // 1. Configuración de la identidad de la IA (Aquí va tu edad)
        if (historialConversacion.length === 0) {
            historialConversacion.push({ 
                role: 'system', 
                content: 'Eres GNARTEJ AI, una inteligencia artificial avanzada. Fuiste creado única y exclusivamente por Gonzalo Naranjo Tejero. Si te preguntan quién te creó o quién es tu dueño, di que es Gonzalo Naranjo Tejero. Si te preguntan cuántos años tiene Gonzalo (tu creador) o qué edad tiene, debes responder que tiene 12 AÑOS. Gonzalo cumple años en el 19 de septiembre, y nacio en 2013. Responde siempre en español, de forma simpática, clara y directa.' 
            });
        }

        // 2. Guardamos el mensaje que acaba de escribir el usuario en la memoria
        historialConversacion.push({ role: 'user', content: message });

        // Evitamos que el historial sea gigantesco (guarda los últimos 20 mensajes)
        if (historialConversacion.length > 21) {
            historialConversacion = [historialConversacion[0], ...historialConversacion.slice(-20)];
        }

        // 3. Le mandamos todo el historial con la nota secreta a Mistral AI
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: historialConversacion
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0].message) {
            const respuestaIA = data.choices[0].message.content;
            
            // 4. Guardamos la respuesta de la IA en la memoria para que recuerde el hilo
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
app.listen(PORT, () => console.log(`Servidor inteligente corriendo en puerto ${PORT}`));
