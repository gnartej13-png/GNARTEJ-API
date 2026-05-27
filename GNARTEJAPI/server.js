const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai'); // Importamos la librería de la IA

const app = express();

// =========================================================
// 1. CONFIGURACIÓN DE LA IA DE GOOGLE (GEMINI)
// =========================================================
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// =========================================================
// 2. DEFINICIÓN DE MODELOS (MONGOOSE)
// =========================================================
// Modelo de Usuarios
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'gnartej'); 

// Modelo de Mensajes dentro de un Chat
const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // "user" o "model"
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Modelo de Chats
const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema, 'chats_gnartej');

// =========================================================
// 3. CONFIGURACIÓN DE SEGURIDAD (CORS) Y MIDDLEWARES
// =========================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =========================================================
// 4. CONEXIÓN A MONGODB ATLAS
// =========================================================
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("🚀 Conectado con éxito a MongoDB Atlas (DATAGNARTEJAI)"))
.catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// =========================================================
// 5. RUTAS DE AUTENTICACIÓN (LOGIN / REGISTRO)
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
        console.error("Error en login:", error);
        return res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 6. RUTAS DE GESTIÓN DE CHATS (¡Aquí estaban tus errores 404!)
// =========================================================

// Ruta para crear un nuevo chat vacío
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "El userId es obligatorio" });

        const nuevoChat = new Chat({ userId, messages: [] });
        await nuevoChat.save();
        
        console.log(`✨ Nuevo chat creado para el usuario: ${userId}`);
        return res.json(nuevoChat);
    } catch (error) {
        console.error("Error al crear chat:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Ruta para cargar el historial de un chat específico
app.get('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        if (chatId === "nuevo" || chatId === "null") return res.status(400).json({ error: "ID de chat no válido" });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat no encontrado" });

        return res.json(chat);
    } catch (error) {
        console.error("Error al cargar chat:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Ruta principal para enviar un mensaje e interactuar con la IA (Gemini 2.5 Flash)
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body; // El texto que envía el usuario

        if (!message) return res.status(400).json({ error: "El mensaje no puede estar vacío" });

        // 1. Buscar el chat en la base de datos
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat no encontrado" });

        // 2. Guardar el mensaje del usuario en la base de datos
        chat.messages.push({ sender: 'user', text: message });

        // 3. Formatear el historial para enviárselo a Gemini
        // Adaptamos el historial al formato oficial: { role: 'user'|'model', parts: [{ text: '...' }] }
        const contents = chat.messages.map(msg => ({
            role: msg.sender,
            parts: [{ text: msg.text }]
        }));

        console.log(`🤖 Solicitando respuesta a Gemini para el chat: ${chatId}`);

        // 4. Llamada oficial a la IA usando gemini-2.5-flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
        });

        const replyText = response.text || "Lo siento, no he podido procesar tu respuesta.";

        // 5. Guardar la respuesta de la IA en la base de datos
        chat.messages.push({ sender: 'model', text: replyText });
        await chat.save();

        // 6. Devolver la respuesta al frontend de Google Sites
        return res.json({ response: replyText });

    } catch (error) {
        console.error("Error con la IA:", error);
        return res.status(500).json({ error: "Error interno del servidor al procesar la IA." });
    }
});

// =========================================================
// 7. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
