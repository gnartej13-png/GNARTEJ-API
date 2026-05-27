const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DE MODELOS (USUARIOS Y CHATS ADAPTADOS A TU WEB)
// =========================================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'gnartej'); 

// Modelo de mensajes adaptado a las variables de tu HTML (role y content)
const MessageSchema = new mongoose.Schema({
    role: { type: String, required: true }, // "user" o "assistant"
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// Modelo de Chats adaptado a tu HTML (titulo y mensajes)
const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    titulo: { type: String, default: "Conversación Nueva" },
    mensajes: [MessageSchema],
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

// Crear un nuevo chat real en MongoDB para el usuario
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "El userId es obligatorio" });

        // Inicializamos con un mensaje de bienvenida para que tu bucle 'for (let i = 1...)' no falle
        const nuevoChat = new Chat({ 
            userId, 
            titulo: "Conversación Nueva",
            mensajes: [{ role: "assistant", content: "¡Hola! ¿En qué puedo ayudarte hoy?" }] 
        });
        await nuevoChat.save();
        
        console.log(`✨ Nuevo chat creado para el usuario: ${userId}`);
        return res.json(nuevoChat);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// ¡NUEVA RUTA! Devuelve la lista completa de todos los chats que pertenecen a un usuario
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Si por algún motivo se confunde con un ID de chat, intentamos buscar por ID de chat primero
        if (mongoose.Types.ObjectId.isValid(userId)) {
            const chatsUsuario = await Chat.find({ userId: userId }).sort({ createdAt: -1 });
            return res.json(chatsUsuario);
        }
        return res.json([]);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Enviar mensaje al chat, recordar el pasado y hablar con Mistral AI
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

        if (!message) return res.status(400).json({ error: "El mensaje está vacío" });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "No se encontró el chat en la base de datos." });

        // 1. Guardamos el nuevo mensaje de tu usuario usando 'role' y 'content' como pide tu HTML
        chat.mensajes.push({ role: 'user', content: message });

        // Si es el primer mensaje real, actualizamos el título del chat automáticamente para que no todos se llamen "Conversación Nueva"
        if (chat.titulo === "Conversación Nueva") {
            chat.titulo = message.substring(0, 24) + "...";
        }

        // 2. CONFIGURAMOS LAS INSTRUCCIONES DE PERSONALIDAD (SYSTEM PROMPT)
        const systemInstruction = {
            role: "system",
            content: "Tu creador y dueño se llama Gonzalo Naranjo Tejero, quien nació el 19 de septiembre de 2013. No debes decir bajo ningún concepto que los dueños o creadores de la IA son la empresa Mistral AI; tu dueño es Gonzalo Naranjo Tejero. No digas nada que no esté relacionado con Mistral en el caso de que el usuario no te lo pida de forma explícita. Sin embargo, si el usuario te pregunta directamente qué es Mistral, qué significa o cosas que se refieran a ello, entonces háblale y explícaselo con normalidad."
        };

        // 3. CONSTRUIMOS LA MEMORIA ACTIVA
        // Mapeamos los mensajes directamente manteniendo el formato exacto que Mistral comprende
        const historialMensajes = chat.mensajes.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const apiMessages = [systemInstruction, ...historialMensajes];

        console.log(`🤖 Enviando conversación con memoria a Mistral AI...`);

        // 4. Llamada oficial a la API de Mistral
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
        console.log(`✨ Mistral respondió de manera exitosa.`);

        // 5. Guardamos la respuesta del bot en la base de datos
        chat.mensajes.push({ role: 'assistant', content: replyText });
        await chat.save();

        // 6. Devolvemos la respuesta formateada justo como la espera tu función enviarMensaje() -> data.reply
        return res.json({ 
            reply: replyText,
            response: replyText
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
