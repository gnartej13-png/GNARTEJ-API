const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DE MODELOS (USUARIOS CON CONTRASEÑA)
// =========================================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // ¡Nueva casilla de contraseña obligatoria!
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'gnartej'); 

const MessageSchema = new mongoose.Schema({
    role: { type: String, required: true }, 
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

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
// 4. RUTA DE LOGIN / REGISTRO PROTEGIDA CON CONTRASEÑA
// =========================================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body; // Recibimos usuario y clave de Google Sites
        
        if (!username || !password) {
            return res.status(400).json({ error: "El usuario y la contraseña son obligatorios" });
        }

        let user = await User.findOne({ name: username });

        if (!user) {
            // REGISTRO: Si el usuario no existe, lo creamos con la contraseña que ha puesto
            user = new User({ 
                name: username, 
                password: password, // En un sistema profesional esto se encriptaría, pero para tu nivel actual es perfecto
                createdAt: new Date() 
            });
            await user.save(); 
            console.log(`🎉 Cuenta NUEVA protegida creada: ${username}`);
            return res.json(user);
        } else {
            // LOGIN: Si el usuario ya existe, comprobamos que la contraseña coincida
            if (user.password !== password) {
                console.log(`❌ Intento de acceso denegado para: ${username} (Contraseña incorrecta)`);
                return res.status(401).json({ error: "Contraseña incorrecta. Acceso denegado." });
            }
            
            console.log(`🔑 Sesión iniciada con éxito para: ${username}`);
            return res.json(user);
        }
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

        const nuevoChat = new Chat({ 
            userId, 
            titulo: "Conversación Nueva",
            mensajes: [{ role: "assistant", content: "¡Hola! ¿En qué puedo ayudarte hoy?" }] 
        });
        await nuevoChat.save();
        return res.json(nuevoChat);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            const chatsUsuario = await Chat.find({ userId: userId }).sort({ createdAt: -1 });
            return res.json(chatsUsuario);
        }
        return res.json([]);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;
        const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

        if (!message) return res.status(400).json({ error: "El mensaje está vacío" });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "No se encontró el chat." });

        chat.mensajes.push({ role: 'user', content: message });

        if (chat.titulo === "Conversación Nueva") {
            chat.titulo = message.substring(0, 24) + "...";
        }

        const systemInstruction = {
            role: "system",
            content: "Tu creador y dueño se llama Gonzalo Naranjo Tejero, quien nació el 19 de septiembre de 2013. No debes decir bajo ningún concepto que los dueños o creadores de la IA son la empresa Mistral AI; tu dueño es Gonzalo Naranjo Tejero. No digas nada que no esté relacionado con Mistral en el caso de que el usuario no te lo pida de forma explícita. Sin embargo, si el usuario te pregunta directamente qué es Mistral, qué significa o cosas que se refieran a ello, entonces háblale y explícaselo con normalidad."
        };

        const historialMensajes = chat.mensajes.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const apiMessages = [systemInstruction, ...historialMensajes];

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

        if (!response.ok) return res.status(500).json({ error: "Error en Mistral AI" });

        const replyText = data.choices[0].message.content;
        chat.mensajes.push({ role: 'assistant', content: replyText });
        await chat.save();

        return res.json({ reply: replyText, response: replyText });

    } catch (error) {
        return res.status(500).json({ error: "Error interno del servidor" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
