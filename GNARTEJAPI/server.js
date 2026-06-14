const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

app.use(express.json());

// Configuración de CORS con tu URL real
app.use(cors({
    origin: [
        'https://gnartej-ai-acount.vercel.app', 
        'https://gnartej-ai.vercel.app',        
        'http://localhost:5500',          
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.options('*', cors());

// Conexión fija a tu base de datos de MongoDB Atlas
const MONGO_URL_FIJA = "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";

const conectarBD = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGO_URL_FIJA, {
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000,
        });
        console.log('Conectado a MongoDB Atlas con éxito');
    } catch (err) {
        console.error('Error al conectar a Mongo:', err.message);
    }
};

app.use(async (req, res, next) => {
    await conectarBD();
    next();
});

// --- MODELOS DE DATOS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    titulo: { type: String, default: 'Nueva conversación' },
    mensajes: { type: Array, default: [] },
    fecha: { type: Date, default: Date.now }
});
const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

// --- RUTAS ---

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    res.status(200).json({ status: 'ok', db: dbStatus });
});

app.get('/', (req, res) => {
    res.send('API de GNARTEJ activa.');
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = await User.findOne({ username: username.trim() });
        if (!usuario || usuario.password !== password.trim()) {
            return res.status(401).json({ error: 'Usuario o clave incorrectos' });
        }
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error interno en el login' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existe = await User.findOne({ username: username.trim() });
        if (existe) return res.status(400).json({ error: 'El usuario ya existe' });

        const nuevoUsuario = new User({ username: username.trim(), password: password.trim(), name: username.trim() });
        await nuevoUsuario.save();
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        res.status(500).json({ error: 'Error durante el registro' });
    }
});

app.get('/api/chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
        res.json(chats || []);
    } catch (error) {
        res.status(500).json({ error: 'Error al solicitar el historial' });
    }
});

app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        const nuevoChat = new Chat({ userId, mensajes: [] });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        res.status(500).json({ error: 'Error al inicializar la conversación' });
    }
});

app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.chatId);
        res.json({ success: true, message: 'Conversación eliminada.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el chat' });
    }
});

app.post('/api/chat/preguntar', async (req, res) => {
    try {
        const { chatId, mensajeUsuario } = req.body;

        if (!chatId || !mensajeUsuario) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
        }

        // PON TU CLAVE DIRECTAMENTE AQUÍ EN LAS COMILLAS:
        const apiKeyActual = "AQUÍ_PEGA_TU_CLAVE_DE_MISTRAL"; 

        if (apiKeyActual === "AQUÍ_PEGA_TU_CLAVE_DE_MISTRAL" || !apiKeyActual) {
            return res.status(500).json({ error: 'Por favor, edita la línea 121 de server.js y pon tu clave de Mistral.' });
        }

        const mistralCliente = new Mistral({ apiKey: apiKeyActual });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: 'Conversación no encontrada.' });

        chat.mensajes.push({ role: 'user', content: mensajeUsuario });

        const mensajesHistorial = [
            { role: 'system', content: 'Eres GNARTEJ AI, un chatbot asistente avanzado, inteligente, preciso y de confianza.' },
            ...chat.mensajes
        ];

        const respuestaIA = await mistralCliente.chat.complete({
            model: 'mistral-large-latest',
            messages: mensajesHistorial,
        });

        const textoRespuesta = respuestaIA.choices[0].message.content;

        chat.mensajes.push({ role: 'assistant', content: textoRespuesta });
        chat.fecha = Date.now();

        if (chat.mensajes.length <= 2) {
            chat.titulo = mensajeUsuario.length > 25 ? mensajeUsuario.substring(0, 25) + "..." : mensajeUsuario;
        }

        await chat.save();

        res.json({
            respuesta: textoRespuesta,
            chatActualizado: chat
        });

    } catch (error) {
        console.error('Error al procesar con Mistral:', error.message);
        res.status(500).json({ error: 'Error del motor de IA', detalle: error.message });
    }
});

module.exports = app;
