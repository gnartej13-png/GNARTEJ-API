const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DE MODELOS (USUARIOS Y GUARDADO DE CHATS)
// =========================================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'gnartej'); 

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true }, // "user" o "model"
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

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
// 5. GESTIÓN DE CHATS, MEMORIA HISTÓRICA Y MISTRAL AI
// =========================================================

app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "El userId es obligatorio" });

        const nuevoChat = new Chat({ userId, messages: [] });
        await nuevoChat.save();
        return res.json(nuevoChat);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

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

// RUTA DEL CHAT CON MEMORIA E INSTRUCCIONES DE IDENTIDAD
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

        if (!message) return res.status(400).json({ error: "El mensaje está vacío" });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "No se encontró el chat en la base de datos." });

        // 1. Guardamos el nuevo mensaje del usuario en la base de datos
        chat.messages.push({ sender: 'user', text: message });

        // 2. CONFIGURAMOS LAS INSTRUCCIONES DE PERSONALIDAD (SYSTEM PROMPT)
        const systemInstruction = {
            role: "system",
            content: "Tu creador y dueño se llama Gonzalo Naranjo Tejero, quien nació el 19 de septiembre de 2013. No debes decir bajo ningún concepto que los dueños o creadores de la IA son la empresa Mistral AI; tu dueño es Gonzalo Naranjo Tejero. No digas nada que no esté relacionado con Mistral en el caso de que el usuario no te lo pida de forma explícita. Sin embargo, si el usuario te pregunta directamente qué es Mistral, qué significa o cosas que se refieran a ello, entonces háblale y explícaselo con normalidad."
        };

        // 3. CONSTRUIMOS LA MEMORIA (Mapeamos los últimos mensajes guardados para que recuerde el contexto)
        // Tomamos los últimos 10 mensajes del historial para no saturar la API, manteniendo el orden correcto
        const historialMensajes = chat.messages.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));

        // Juntamos las órdenes del sistema con el historial guardado
        const apiMessages = [systemInstruction, ...historialMensajes];

        console.log(`🤖 Enviando conversación con memoria a Mistral AI...`);

        // 4. Llamada a la API de Mistral enviando todo el bloque de memoria
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: apiMessages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Fallo de Mistral:", data);
            return res.status(500).json({ error: "Error en Mistral AI" });
        }

        const replyText = data.choices[0].message.content;
        console.log(`✨ Mistral respondió teniendo en cuenta las reglas.`);

        // 5. Guardamos la respuesta de la IA en MongoDB para que quede registrada en el historial
        chat.messages.push({ sender: 'model', text: replyText });
        await chat.save();

        // 6. Devolvemos el texto al frontend en todos los formatos compatibles
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
