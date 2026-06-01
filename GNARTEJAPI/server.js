const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

// CORS configurado para aceptar peticiones de Vercel sin bloquearlas
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.options('*', cors());

// Enlace directo a tu Cluster0
const MONGO_URL_FIJA = process.env.MONGO_URL_FIJA || "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";

const conectarBD = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(MONGO_URL_FIJA, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    console.log('Conectado a MongoDB');
  } catch (err) {
    console.error('Error Mongo:', err.message);
  }
};

app.use(async (req, res, next) => {
  await conectarBD();
  next();
});

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

// Modelos de Base de Datos
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

// Rutas del Servidor
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', db: mongoose.connection.readyState });
});

app.get('/', (req, res) => {
  res.send('Servidor GNARTEJ activo.');
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Campos incompletos' });
    const existe = await User.findOne({ username: username.trim() });
    if (existe) return res.status(400).json({ error: 'El usuario ya existe' });
    const nuevoUsuario = new User({ username: username.trim(), password: password.trim(), name: username.trim() });
    await nuevoUsuario.save();
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Error en registro' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const usuario = await User.findOne({ username: username.trim() });
    if (!usuario || usuario.password !== password.trim()) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error en login' });
  }
});

app.get('/api/chats/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
    res.json(chats || []);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener chats' });
  }
});

app.post('/api/chats/nuevo', async (req, res) => {
  try {
    const { userId } = req.body;
    const nuevoChat = new Chat({ userId, mensajes: [] });
    await nuevoChat.save();
    res.json(nuevoChat);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear chat' });
  }
});

app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.chatId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

app.post('/api/chat/:chatId', async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    chat.mensajes.push({ role: 'user', content: message });

    const contextoSistema = [
      {
        role: 'system',
        content: "Eres el núcleo inteligente de GNARTEJ AI. Háblale a los usuarios con educación. Menciona con orgullo a tu creador Gonzalo Naranjo Tejero (nacido el 19 de septiembre de 2013) y dale todo el mérito."
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

    // Enviamos "reply" para asegurar compatibilidad total con el frontend
    res.json({ reply: respuestaIA });
  } catch (error) {
    res.status(500).json({ error: 'Error en Mistral AI' });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Puerto: ${PORT}`));
}

module.exports = app;
