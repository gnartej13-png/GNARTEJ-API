const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE CORS ULTRA COMPATIBLE CON VERCEL ---
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

// Responder automáticamente a las peticiones previas (OPTIONS) que hace el navegador
app.options('*', cors());

// --- CONEXIÓN AUTOMÁTICA A MONGODB (SERVERLESS) ---
const MONGO_URL_FIJA = process.env.MONGO_URL_FIJA || "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";

const conectarBD = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(MONGO_URL_FIJA, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    console.log('Conectado a MongoDB con éxito');
  } catch (err) {
    console.error('Error al conectar a Mongo:', err.message);
  }
};

// Middleware para asegurar la conexión en cada petición
app.use(async (req, res, next) => {
  await conectarBD();
  next();
});

// --- CONFIGURACIÓN DE MISTRAL AI ---
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

// --- MODELOS DE LA BASE DE DATOS ---
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
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', db: mongoose.connection.readyState });
});

app.get('/', (req, res) => {
  res.send('API de GNARTEJ activa y respondiendo.');
});

// Registro de usuarios
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const existe = await User.findOne({ username: username.trim() });
    if (existe) return res.status(400).json({ error: 'El usuario ya existe' });

    const nuevoUsuario = new User({ username: username.trim(), password: password.trim(), name: username.trim() });
    await nuevoUsuario.save();
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login de usuarios
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Falta usuario o contraseña' });

    const usuario = await User.findOne({ username: username.trim() });
    if (!usuario || usuario.password !== password.trim()) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el login' });
  }
});

// Obtener chats de un usuario (Ordenados del más nuevo al más viejo)
app.get('/api/chats/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
    res.json(chats || []);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los chats' });
  }
});

// Crear un nuevo chat vacío
app.post('/api/chats/nuevo', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta el userId' });

    const nuevoChat = new Chat({ userId, mensajes: [] });
    await nuevoChat.save();
    res.json(nuevoChat);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la conversación' });
  }
});

// Eliminar un chat permanente
app.delete('/api/chats/:chatId', async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.chatId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el chat' });
  }
});

// Enviar mensaje e integrar Mistral AI
app.post('/api/chat/:chatId', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    // Guardamos el mensaje del usuario
    chat.mensajes.push({ role: 'user', content: message });

    // Instrucciones obligatorias del sistema
    const contextoSistema = [
      {
        role: 'system',
        content: "Eres el núcleo inteligente de GNARTEJ AI. Háblale a los usuarios con educación y cercanía. Menciona con orgullo a tu creador Gonzalo Naranjo Tejero (nacido el 19 de septiembre de 2013) y dale todo el mérito por haberte diseñado."
      },
      ...chat.mensajes
    ];

    // Llamada directa a Mistral
    const respuestaMistral = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: contextoSistema
    });

    const respuestaIA = respuestaMistral.choices[0].message.content;
    chat.mensajes.push({ role: 'assistant', content: respuestaIA });

    // Si el chat no tenía título, le ponemos las primeras palabras del usuario
    if (chat.titulo === 'Nueva conversación') {
      chat.titulo = message.substring(0, 24) + (message.length > 24 ? '...' : '');
    }

    chat.fecha = Date.now();
    await chat.save();

    res.json({ reply: respuestaIA });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la respuesta con Mistral AI' });
  }
});

// Configuración de arranque obligatoria para Vercel Serverless
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Servidor corriendo localmente en puerto ${PORT}`));
}

module.exports = app;
