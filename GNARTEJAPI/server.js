const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware globales
app.use(cors());
app.use(express.json());

// Conexión limpia y segura a MongoDB
const mongoURI = process.env.MONGO_URI || process.env.DATABASE_URL;
mongoose.connect(mongoURI)
  .then(() => console.log('🍃 Conectado con éxito a MongoDB Atlas'))
  .catch(err => console.error('❌ Error crítico en MongoDB:', err));

// Esquemas de Base de Datos
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    titulo: { type: String, default: 'Nueva conversación' },
    mensajes: [
        {
            role: { type: String, required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

// ==========================================
// RUTA DE AUTENTICACIÓN (LOGIN Y REGISTRO)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Faltan datos requeridos." });
        }

        let user = await User.findOne({ name: username });

        if (!user) {
            // Registro automático si el usuario no existe
            user = new User({
                name: username,
                password: password
            });
            await user.save();
            console.log(`✨ Nueva cuenta creada con éxito: ${username}`);
            return res.status(200).json({
                _id: user._id.toString(),
                username: user.name,
                name: user.name
            });
        } else {
            // Verificación de contraseña
            if (user.password !== password) {
                console.log(`❌ Contraseña incorrecta para el usuario: ${username}`);
                return res.status(401).json({ error: "Contraseña incorrecta. Acceso denegado." });
            }

            // Respuesta limpia mapeada para el frontend
            console.log(`🔑 Sesión iniciada con éxito para: ${username}`);
            return res.status(200).json({
                _id: user._id.toString(),
                username: user.name,
                name: user.name
            });
        }
    } catch (error) {
        console.error("Error en la ruta de login:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// GESTIÓN DE CHATS
// ==========================================
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "El userId es obligatorio" });

        const nuevoChat = new Chat({
            userId,
            titulo: 'Conversación Nueva',
            mensajes: [
                { role: 'system', content: 'Eres GNARTEJ AI, un asistente inteligente avanzado.' }
            ]
        });

        await nuevoChat.save();
        return res.status(201).json(nuevoChat);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
        return res.json(chats);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        await Chat.findByIdAndDelete(chatId);
        return res.json({ message: "Chat eliminado correctamente" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat no encontrado" });

        chat.mensajes.push({ role: 'user', content: message });

        // Respuesta del sistema controlada
        let respuestaIA = "Servidor GNARTEJ AI activo y respondiendo correctamente.";

        chat.mensajes.push({ role: 'assistant', content: respuestaIA });
        
        if (chat.titulo === 'Conversación Nueva' && message) {
            chat.titulo = message.substring(0, 26) + (message.length > 26 ? '...' : '');
        }

        chat.updatedAt = new Date();
        await chat.save();

        return res.json({ reply: respuestaIA });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Ruta de estado de la API
app.get('/', (req, res) => {
    res.send('🚀 API de GNARTEJ AI corriendo perfecta en Node v24');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`);
});
