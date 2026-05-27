const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// =================================================================
// 🛠️ CONFIGURACIÓN PRINCIPAL - PON TU ENLACE DE MONGODB 🛠️
// =================================================================
const MONGO_URI = "TU_CADENA_DE_CONEXION_DE_MONGODB_AQUÍ"; 
const EDAD_CREADOR = "12 AÑOS"; 
// =================================================================

mongoose.connect(MONGO_URI)
    .then(() => console.log("¡Conectado con éxito a la Base de Datos de GNARTEJ AI!"))
    .catch(err => console.error("Error crítico al conectar la base de datos:", err));

// --- MODELOS DE DATOS ---
const UserSchema = new mongoose.Schema({
    username: String,
    name: String,
    fechaRegistro: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ChatSchema = new mongoose.Schema({
    userId: String,
    titulo: String,
    mensajes: Array,
    fecha: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// --- RUTAS DEL SERVIDOR ---

// 1. LOGIN / REGISTRO DIRECTO
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        const usuarioLimpio = username.toLowerCase().trim();
        
        let user = await User.findOne({ username: usuarioLimpio });
        if (!user) {
            user = new User({
                username: usuarioLimpio,
                name: username
            });
            await user.save();
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Error en el inicio de sesión." });
    }
});

// 2. OBTENER HISTORIAL DE CHATS
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar el historial." });
    }
});

// 3. CREAR NUEVO CHAT
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        const nuevoChat = new Chat({
            userId,
            titulo: "Nueva conversación",
            mensajes: [{ 
                role: 'system', 
                content: `Eres GNARTEJ AI, una inteligencia artificial avanzada y premium. Fuiste creado única y exclusivamente por Gonzalo Naranjo Tejero. Fuiste creada exactamente el 27 de mayo de 2026 a las 0:20. Si alguien te pregunta cuándo fuiste creada, naciste o empezaste a existir, debes responder siempre que fue el 27 de mayo de 2026 a las 0:20. Si alguien te pregunta quién es tu dueño, creador o jefe, debes responder con orgullo que es Gonzalo Naranjo Tejero. Si te preguntan cuántos años tiene Gonzalo o qué edad tiene, debes responder firmemente que tiene ${EDAD_CREADOR}. Responde siempre en español, de forma muy inteligente, amigable, clara y directa.` 
            }]
        });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        res.status(500).json({ error: "Error al crear sala de chat." });
    }
});

// 4. ENVIAR MENSAJE Y ENLAZAR CON MISTRAL
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { message } = req.body;
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: "Este chat no existe." });

        chat.mensajes.push({ role: 'user', content: message });

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: 'mistral-large-latest', messages: chat.mensajes })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0].message) {
            const respuestaIA = data.choices[0].message.content;
            if (chat.mensajes.length === 2) {
                chat.titulo = message.substring(0, 24) + "...";
            }
            chat.mensajes.push({ role: 'assistant', content: respuestaIA });
            chat.fecha = Date.now();
            await chat.save();
            res.json({ reply: respuestaIA });
        } else {
            res.status(500).json({ error: "Error en la respuesta de la IA." });
        }
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
