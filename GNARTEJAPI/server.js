const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DE MODELOS (USUARIOS Y GUARDADO DE CHATS)
// =========================================================
// Modelo de Usuarios
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'gnartej'); 

// Modelo de Mensajes individuales
const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // "user" o "model"
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Modelo de Chats en la Base de Datos (Para no perder el historial)
const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema, 'chats_gnartej');

// =========================================================
// 2. CONFIGURACIÓN DE SEGURIDAD (CORS) Y MIDDLEWARES
// =========================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// =========================================================
// 3. CONEXIÓN A TU BASE DE DATOS MONGODB ATLAS
// =========================================================
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("🚀 Conectado con éxito a MongoDB Atlas (DATAGNARTEJAI)"))
.catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// =========================================================
// 4. RUTA DE LOGIN / REGISTRO DE USUARIOS
// =========================================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "El nombre de usuario es obligatorio" });

        let user = await User.findOne({ name: username });
        if (!user) {
            user = new User({ name: username, createdAt: new Date() });
            await user.save(); 
            console.log(`🎉 Cuenta nueva creada automáticamente: ${username}`);
        } else {
            console.log(`🔑 Sesión iniciada para: ${username}`);
        }
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 5. GESTIÓN REAL DE CHATS Y CONEXIÓN CON MISTRAL AI
// =========================================================

// Crear un nuevo chat de verdad en la base de datos para el usuario
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "El userId es obligatorio" });

        const nuevoChat = new Chat({ userId, messages: [] });
        await nuevoChat.save();
        
        console.log(`✨ Nuevo chat creado en MongoDB para el usuario: ${userId}`);
        return res.json(nuevoChat);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Cargar el historial real desde MongoDB cuando el usuario entra
app.get('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        if (chatId === "nuevo" || chatId === "null") return res.status(400).json({ error: "ID de chat no válido" });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat no encontrado" });

        return res.json(chat);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Enviar mensaje, guardarlo en Mongo, hablar con Mistral y guardar la respuesta
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

        if (!message) return res.status(400).json({ error: "El mensaje está vacío" });

        // 1. Buscar el chat del usuario en MongoDB
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "No se encontró el chat en la base de datos." });

        // 2. Guardar el mensaje que ha escrito Gonzalo
        chat.messages.push({ sender: 'user', text: message });

        console.log(`🤖 Enviando conversación a Mistral AI...`);

        // 3. Llamada a la API de Mistral
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: [{ role: "user", content: message }] // Aquí puedes mapear el historial completo si quieres
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Fallo de Mistral:", data);
            return res.status(500).json({ error: "Error en Mistral AI" });
        }

        const replyText = data.choices[0].message.content;
        console.log(`✨ Mistral respondió con éxito.`);

        // 4. Guardar la respuesta de la IA en MongoDB junto al usuario
        chat.messages.push({ sender: 'model', text: replyText });
        await chat.save();

        // 5. Devolver al Google Sites en todos los formatos para asegurar compatibilidad total
        return res.json({ 
            response: replyText,
            reply: replyText,
            text: replyText,
            message: replyText,
            content: replyText
        });

    } catch (error) {
        console.error("Error crítico:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

// =========================================================
// 6. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
