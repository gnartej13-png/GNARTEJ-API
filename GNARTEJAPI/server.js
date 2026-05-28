const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai'); // Librería oficial actualizada
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware globales
app.use(cors());
app.use(express.json());

// Inicializar Mistral de forma correcta
const mistralClient = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY
});

// Conexión a MongoDB Atlas
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

// Ruta de Autenticación (Login/Registro)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Faltan datos." });
        }

        let user = await User.findOne({ name: username });

        if (!user) {
            user = new User({ name: username, password: password });
            await user.save();
            return res.status(200).json({ _id: user._id.toString(), username: user.name, name: user.name });
        } else {
            if (user.password !== password) {
                return res.status(401).json({ error: "Contraseña incorrecta." });
            }
            return res.status(200).json({ _id: user._id.toString(), username: user.name, name: user.name });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Gestión de Chats
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

// RUTA DE CHAT CORREGIDA CON MISTRAL ACTUALIZADO
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { message } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat no encontrado" });

        // Guardar mensaje del usuario
        chat.mensajes.push({ role: 'user', content: message });

        // Formatear historial limpio para Mistral
        const historialMistral = chat.mensajes.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
            content: msg.content
        }));

        // Llamada corregida con el modelo estable gratuito
        const response = await mistralClient.chat.complete({
            model: 'open-mistral-7b', 
            messages: historialMistral
        });

        const respuestaIA = response.choices[0].message.content;

        // Guardar respuesta de la IA
        chat.mensajes.push({ role: 'assistant', content: respuestaIA });
        
        if (chat.titulo === 'Conversación Nueva' && message) {
            chat.titulo = message.substring(0, 26) + (message.length > 26 ? '...' : '');
        }

        chat.updatedAt = new Date();
        await chat.save();

        return res.json({ reply: respuestaIA });

    } catch (error) {
        console.error("Error en la llamada a Mistral:", error);
        return res.status(500).json({ error: "Error interno de la IA: " + error.message });
    }
});

app.get('/', (req, res) => {
    res.send('🚀 API de GNARTEJ AI corriendo perfecta con Mistral AI');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`);
});
