const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// CONEXIÓN ULTRA LIMPIA A TU BASE DE DATOS
const MONGO_URL_FIJA = "mongodb+srv://asierf06:gnartej123@gnartej.8b6ee.mongodb.net/gnartej?retryWrites=true&w=majority".trim();

mongoose.connect(MONGO_URL_FIJA)
    .then(() => console.log('Conectado a MongoDB con éxito'))
    .catch(err => {
        console.error('--- ERROR AL CONECTAR A MONGO ---');
        console.error(err);
        console.error('---------------------------------');
    });

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

app.get('/', (req, res) => {
    res.send('API de GNARTEJ funcionando correctamente');
});

// Registro Protegido (Sanea los datos antes de guardarlos en Mongo)
app.post('/api/auth/register', async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : null;
        const password = req.body.password ? req.body.password.trim() : null;
        const name = req.body.name ? req.body.name.trim() : username;

        if (!username || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: username o password' });
        }

        const existe = await User.findOne({ username });
        if (existe) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const nuevoUsuario = new User({ username, password, name });
        await nuevoUsuario.save();
        
        console.log(`[OK] Usuario registrado con éxito: ${username}`);
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        console.error("FAIL EN RUTA REGISTER:", error);
        res.status(400).json({ error: 'Error al registrar usuario', detalle: error.message });
    }
});

// Login Protegido (Maneja el flujo 404/401 de forma estricta)
app.post('/api/auth/login', async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : null;
        const password = req.body.password ? req.body.password.trim() : null;

        if (!username || !password) {
            return res.status(400).json({ error: 'Falta usuario o contraseña en la petición' });
        }

        const usuario = await User.findOne({ username });
        if (!usuario) {
            console.log(`[404] Intento de login con usuario inexistente: ${username}`);
            return res.status(404).json({ error: 'El usuario no existe' });
        }
        
        if (usuario.password !== password) {
            console.log(`[401] Contraseña incorrecta para el usuario: ${username}`);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        console.log(`[OK] Login correcto: ${username}`);
        res.json(usuario);
    } catch (error) {
        console.error("FAIL CRÍTICO EN RUTA LOGIN:", error);
        res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
    }
});

// Obtener chats de un usuario
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
        res.json(chats || []);
    } catch (error) {
        console.error("FAIL EN GET CHATS:", error);
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
        console.error("FAIL EN NUEVO CHAT:", error);
        res.status(500).json({ error: 'Error al crear chat' });
    }
});

// Enviar mensaje al chat (Soporta 'message' y 'texto' nativamente)
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const message = req.body.message || req.body.texto;
        
        if (!message || message.trim() === "") {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

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
        console.error("FAIL EN ENVIAR MENSAJE:", error);
        res.status(500).json({ error: 'Error al procesar mensaje' });
    }
});

// Eliminar un chat específico
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        const resultado = await Chat.findByIdAndDelete(req.params.chatId);
        if (!resultado) {
            return res.status(404).json({ error: "Chat no encontrado" });
        }
        res.json({ message: "Chat eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el chat" });
    }
});

// Eliminar cuenta completa y todos sus chats
app.delete('/api/auth/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "ID de usuario no válido" });
        }

        await Chat.deleteMany({ userId: userId });
        const usuarioEliminado = await User.findByIdAndDelete(userId);

        if (!usuarioEliminado) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.status(200).json({ message: "Cuenta eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor al borrar cuenta" });
    }
});

// INICIALIZACIÓN ADAPTADA PARA RENDER
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor GNARTEJ corriendo en el puerto ${PORT}`);
});
