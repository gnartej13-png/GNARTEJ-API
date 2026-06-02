const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

app.use(express.json());

// CONFIGURACIÓN DE CORS MEJORADA PARA EVITAR ERRORES DE RED EN MÓVILES
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.options('*', cors());

// Conexión predeterminada a tu base de datos Cluster0
const MONGO_URL_FIJA = process.env.MONGO_URL_FIJA || "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";

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

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

// MODELOS DE BASE DE DATOS
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

// RUTAS DE DIAGNÓSTICO
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    res.status(200).json({ status: 'ok', db: dbStatus });
});

app.get('/', (req, res) => {
    res.send('API de GNARTEJ activa y respondiendo en Railway.');
});

// RUTAS DE AUTENTICACIÓN
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

// RUTAS DE HISTORIAL DE CHATS
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

// ENVIAR MENSAJE Y PROCESAR CON MISTRAL AI
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

        // Añadir el mensaje del usuario al historial interno
        chat.mensajes.push({ role: 'user', content: message });

        // Llamada formal al SDK de Mistral AI utilizando tu cliente inteligente
        const respuestaMistral = await mistral.chat.complete({
            model: 'mistral-tiny',
            messages: chat.mensajes.map(m => ({ role: m.role, content: m.content }))
        });

        const textoIA = respuestaMistral.choices[0].message.content;

        // Añadir la respuesta de GNARTEJ AI al historial
        chat.mensajes.push({ role: 'assistant', content: textoIA });
        
        // Guardamos los cambios en MongoDB Atlas de manera asíncrona
        await chat.save();

        res.json({ respuesta: textoIA, chat });
    } catch (error) {
        console.error('Error en el chat con Mistral:', error);
        res.status(500).json({ error: 'Error al procesar la respuesta de la IA' });
    }
});

// ELIMINAR CONVERSACIÓN
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.chatId);
        res.json({ success: true, message: 'Chat eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el chat' });
    }
});

// ==========================================
// CORRECCIÓN SOLUCIÓN 1: PUERTO DINÁMICO PARA RAILWAY
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor GNARTEJ corriendo con éxito en el puerto ${PORT}`);
});    res.status(500).json({ error: 'Error al solicitar el historial' });
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
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el chat' });
  }
});

app.post('/api/chat/:chatId', async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Conversación no encontrada' });

    chat.mensajes.push({ role: 'user', content: message });

    const contextoSistema = [
      {
        role: 'system',
        content: "Eres el núcleo inteligente de GNARTEJ AI. Háblale a los usuarios con educación y cercanía. Menciona con orgullo a tu creador Gonzalo Naranjo Tejero (nacido el 19 de septiembre de 2013) y dale todo el mérito por haberte diseñado."
      },
      ...chat.mensajes
    ];

    const respuestaMistral = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: contextoSistema
    });

    const respuestaIA = respuestaMistral.choices[0].message.content;
    chat.mensajes.push({ role: 'assistant', content: respuestaIA });

    if (chat.titulo === 'Nueva conversación') {
      chat.titulo = message.substring(0, 24) + (message.length > 24 ? '...' : '');
    }

    chat.fecha = Date.now();
    await chat.save();

    res.json({ reply: respuestaIA });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la petición con Mistral AI' });
  }
});

// PUERTO DINÁMICO DE ESCUCHA OBLIGATORIO PARA RAILWAY
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;
