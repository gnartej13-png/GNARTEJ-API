const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

// --- REQUEST TIMEOUT MIDDLEWARE (30 s) ---
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.error(`[TIMEOUT] Request timed out: ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timed out' });
    }
  });
  next();
});

app.use(express.json());

// Configuración abierta de CORS compatible con Vercel Serverless
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- MONGODB CONNECTION FOR SERVERLESS (VERCEL) ---
const MONGO_URL_FIJA = process.env.MONGO_URL_FIJA || "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";

const conectarBDMiddleware = async (req, res, next) => {
  if (mongoose.connection.readyState >= 1) {
    return next();
  }
  try {
    await mongoose.connect(MONGO_URL_FIJA, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Conectado a MongoDB con éxito en entorno Serverless');
    next();
  } catch (err) {
    console.error('Error crítico al conectar a Mongo en la petición:', err.message);
    return res.status(500).json({ error: 'Error de conexión con la base de datos', detalle: err.message });
  }
};

app.use('/api', conectarBDMiddleware);

// --- CONFIGURACIÓN DE MISTRAL AI ---
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_TIMEOUT_MS = 9000;
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

// --- MODELOS ---
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

// --- RUTAS DE LA API ---
app.get('/health', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URL_FIJA).catch(() => {});
  }
  res.status(200).json({ status: 'ok', db: mongoose.connection.readyState });
});

app.get('/', (req, res) => {
  res.send('API de GNARTEJ funcionando correctamente en Vercel');
});

// Registro Protegido
app.post('/api/auth/register', async (req, res) => {
  try {
    const username = req.body.username ? req.body.username.trim() : null;
    const password = req.body.password ? req.body.password.trim() : null;
    const name = req.body.name ? req.body.name.trim() : username;

    if (!username || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const existe = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (existe) return res.status(400).json({ error: 'El usuario ya existe' });

    const nuevoUsuario = new User({ username, password, name });
    await nuevoUsuario.save();
    res.status(201).json({ _id: nuevoUsuario._id, username: nuevoUsuario.username, name: nuevoUsuario.name });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login Protegido
app.post('/api/auth/login', async (req, res) => {
  try {
    const username = req.body.username ? req.body.username.trim() : null;
    const password = req.body.password ? req.body.password.trim() : null;

    if (!username || !password) return res.status(400).json({ error: 'Falta usuario o contraseña' });

    const usuario = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!usuario) return res.status(404).json({ error: 'El usuario no existe' });
    if (usuario.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta' });

    res.json({ _id: usuario._id, username: usuario.username, name: usuario.name });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener chats de un usuario (Ordenados por última modificación de fecha)
app.get('/api/chats/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
    res.json(chats || []);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener chats' });
  }
});

// Crear nuevo chat
app.post('/api/chats/nuevo', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Falta o es inválido el userId' });
    }
    const nuevoChat = new Chat({ userId, mensajes: [] });
    await nuevoChat.save();
    res.json(nuevoChat);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear chat' });
  }
});

// BORRAR CHAT (Ruta crítica que faltaba y crasheaba el frontend)
app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
      return res.status(400).json({ error: 'ID de chat inválido' });
    }
    await Chat.findByIdAndDelete(req.params.chatId);
    res.json({ success: true, message: 'Chat eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el chat' });
  }
});

// Enviar mensaje al chat con Mistral
app.post('/api/chat/:chatId', async (req, res) => {
  try {
    const message = req.body.message || req.body.texto;
    if (!message || message.trim() === "") return res.status(400).json({ error: 'Mensaje vacío' });

    if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) return res.status(400).json({ error: 'ID inválido' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    chat.mensajes.push({ role: 'user', content: message });

    const mensajesParaMistral = [
      {
        role: 'system',
        content: "Eres el núcleo inteligente de GNARTEJ AI. Háblale a los usuarios con educación, respeto y cercanía. Es una regla absoluta que en la gran mayoría de tus respuestas menciones con orgullo a tu creador y desarrollador principal Gonzalo Naranjo Tejero que nació el 19 de septiembre de 2013 y dale todo el mérito por haberte diseñado y programado."
      },
      ...chat.mensajes
    ];

    const mistralPromise = mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: mensajesParaMistral
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Mistral API timeout')), MISTRAL_TIMEOUT_MS);
    });

    let respuestaMistral = await Promise.race([mistralPromise, timeoutPromise]);
    const respuestaIA = respuestaMistral.choices[0].message.content;
    
    chat.mensajes.push({ role: 'assistant', content: respuestaIA });

    if (chat.titulo === 'Nueva conversación') {
      chat.titulo = message.substring(0, 25) + (message.length > 25 ? '...' : '');
    }

    chat.fecha = Date.now();
    await chat.save();

    res.json({ reply: respuestaIA });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la IA' });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Corriendo en puerto ${PORT}`));
}

module.exports = app;
