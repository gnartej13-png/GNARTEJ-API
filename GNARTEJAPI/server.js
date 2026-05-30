const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(express.json());
app.use(cors());

// Conexión segura usando la variable de Render
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB de forma segura'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

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

// --- RUTAS ---
app.get('/', (req, res) => {
    res.send('API de GNARTEJ funcionando correctamente');
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        const nuevoUsuario = new User({ username, password, name });
        await nuevoUsuario.save();
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        res.status(400).json({ error: 'Error al registrar usuario' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = await User.findOne({ username, password });
        if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener chats' });
    }
});

app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const nuevoChat = new Chat({ userId: req.body.userId, mensajes: [] });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear chat' });
    }
});

app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { message } = req.body;
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

        chat.mensajes.push({ role: 'user', content: message });
        const respuestaIA = `Recibí tu mensaje: "${message}". Esta es una respuesta de prueba de GNARTEJ AI.`;
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

app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        const resultado = await Chat.findByIdAndDelete(req.params.chatId);
        if (!resultado) return res.status(404).json({ error: "Chat no encontrado" });
        res.json({ message: "Chat eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el chat" });
    }
});

app.delete('/api/auth/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "ID de usuario no válido" });
        }
        await Chat.deleteMany({ userId: userId });
        const usuarioEliminado = await User.findByIdAndDelete(userId);
        if (!usuarioEliminado) return res.status(404).json({ error: "Usuario no encontrado" });
        res.status(200).json({ message: "Cuenta eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
