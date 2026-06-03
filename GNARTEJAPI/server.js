const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Mistral } = require('@mistralai/mistralai');

const app = express();

// =======================================================
// 1. CONFIGURACIÓN DE CORS GLOBAL (¡ARRIBA DEL TODO!)
// =======================================================
// Permite que móviles, Google Sites e IFrames conecten sin restricciones
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false
}));

// Habilitar lectura de JSON en las peticiones
app.use(express.json());

// =======================================================
// 2. CONEXIÓN A MONGOOSE Y CONFIGURACIÓN DE MODELOS
// =======================================================
const MONGO_URL = process.env.MONGO_URL_FIJA || "tu_cadena_de_conexion_a_mongodb";
mongoose.connect(MONGO_URL)
    .then(() => console.log("Conectado con éxito a MongoDB Atlas"))
    .catch(err => console.error("Error conectando a MongoDB:", err));

// Esquema de Usuarios
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Esquema de Chats
const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    titulo: { type: String, default: "Conversación nueva" },
    mensajes: [
        {
            role: { type: String, enum: ['user', 'assistant'] },
            content: { type: String }
        }
    ],
    fecha: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// CLIENTE MISTRAL AI
const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY || "tu_api_key_aqui" });

// =======================================================
// 3. RUTAS DE LA API
// =======================================================

// Ruta de Salud (Crucial para el arranque del Frontend)
app.get('/health', (req, res) => {
    return res.status(200).json({ 
        status: 'ok', 
        message: 'GNARTEJ API está funcionando correctamente en Vercel Server 3' 
    });
});

// Autenticación: Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = await User.findOne({ username, password });
        if (!usuario) {
            return res.status(401).json({ error: "Credenciales incorrectas" });
        }
        return res.status(200).json(usuario);
    } catch (err) {
        return res.status(500).json({ error: "Error en el servidor" });
    }
});

// Autenticación: Registro
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existe = await User.findOne({ username });
        if (existe) {
            return res.status(400).json({ error: "El usuario ya existe" });
        }
        const nuevoUsuario = new User({ username, password });
        await nuevoUsuario.save();
        return res.status(201).json(nuevoUsuario);
    } catch (err) {
        return res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// Obtener chats de un usuario
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
        return res.status(200).json(chats);
    } catch (err) {
        return res.status(500).json({ error: "Error al traer los chats" });
    }
});

// Crear chat nuevo vacío
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        const nuevoChat = new Chat({ userId, mensajes: [] });
        await nuevoChat.save();
        return res.status(201).json(nuevoChat);
    } catch (err) {
        return res.status(500).json({ error: "Error al crear chat" });
    }
});

// Eliminar un chat
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.chatId);
        return res.status(200).json({ mensaje: "Chat borrado exitosamente" });
    } catch (err) {
        return res.status(500).json({ error: "Error al borrar el chat" });
    }
});

// Ruta Principal: Enviar pregunta a Mistral y almacenar en Mongo
app.post('/api/chats/pregunta', async (req, res) => {
    try {
        const { userId, chatId, mensaje } = req.body;
        let chatActual = null;

        if (chatId) {
            chatActual = await Chat.findById(chatId);
        }

        if (!chatActual && userId) {
            chatActual = new Chat({ userId, mensajes: [], titulo: mensaje.substring(0, 26) + "..." });
        } else if (!chatActual) {
            chatActual = new Chat({ userId: null, mensajes: [], titulo: "Invitado" });
        }

        chatActual.mensajes.push({ role: 'user', content: mensaje });

        // Mapeo de historial para enviárselo a Mistral AI
        const historialMistral = chatActual.mensajes.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        }));

        const respuestaMistral = await mistralClient.chat.complete({
            model: 'mistral-large-latest',
            messages: historialMistral
        });

        const textoRespuesta = respuestaMistral.choices[0].message.content;
        chatActual.mensajes.push({ role: 'assistant', content: textoRespuesta });
        chatActual.fecha = Date.now();

        await chatActual.save();

        return res.status(200).json({
            respuesta: textoRespuesta,
            chatId: chatActual._id
        });

    } catch (err) {
        console.error("Error en /api/chats/pregunta:", err);
        return res.status(500).json({ error: "Fallo de comunicación con Mistral o la Base de Datos" });
    }
});

// =======================================================
// 4. ADAPTACIÓN EXCLUSIVA PARA VERCEL SERVERLESS
// =======================================================
// No usamos app.listen() tradicional para que Vercel gestione las funciones como Serverless.
module.exports = app;
