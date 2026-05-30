const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(express.json());
app.use(cors());

// Conexión a MongoDB usando la variable de entorno
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB con éxito'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

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

// --- RUTAS DE LA API ---
app.get('/', (req, res) => {
    res.send('API de GNARTEJ funcionando correctamente');
});

// Registrar Usuario
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        const existe = await User.findOne({ username });
        if (existe) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        const nuevoUsuario = new User({ username, password, name: name || username });
        await nuevoUsuario.save();
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        res.status(400).json({ error: 'Error al registrar usuario' });
    }
});

// Iniciar Sesión
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = await User.findOne({ username });
        
        if (!usuario) {
            return res.status(404).json({ error: 'El usuario no existe' });
        }
        if (usuario.password !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error en el inicio de sesión' });
    }
});

// Obtener chats de un usuario
app.get('/api/chats/:userId', async (req, res) => {
    try {
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
        if (!userId) return res.status(400).json({ error: 'Falta el userId' });

        const nuevoChat = new Chat({ userId, mensajes: [] });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear nuevo chat' });
    }
});

// Enviar mensaje al chat
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            return res.status(400).json({ error: 'Mensaje vacío' });
        }

        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

        chat.mensajes.push({ role: 'user', content: message });
        
        const respuestaIA = `Recibí tu mensaje: "${message}". El sistema GNARTEJ AI responde perfectamente.`;
        chat.mensajes.push({ role: 'assistant', content: respuestaIA });

        if (chat.titulo === 'Nueva conversación') {
            chat.titulo = message.substring(0, 25) + '...';
        }

        chat.fecha = Date.now();
        await chat.save();
        
        res.json({ reply: respuestaIA });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar mensaje' });
    }
});

// Eliminar chat
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.chatId);
        res.json({ message: "Chat eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar" });
    }
});

// Eliminar cuenta
app.delete('/api/auth/users/:id', async (req, res) => {
    try {
        await Chat.deleteMany({ userId: req.params.id });
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Cuenta eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error al borrar cuenta" });
    }
});

// CONFIGURACIÓN DEL PUERTO EXCLUSIVA PARA RENDER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
