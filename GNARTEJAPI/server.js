const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DEL MODELO USER
// =========================================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'gnartej'); 

// =========================================================
// 2. CONFIGURACIÓN DE SEGURIDAD (CORS) Y MIDDLEWARES
// =========================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// =========================================================
// 3. CONEXIÓN A MONGODB ATLAS
// =========================================================
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("🚀 Conectado con éxito a MongoDB Atlas (DATAGNARTEJAI)"))
.catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// =========================================================
// 4. RUTA DE LOGIN / REGISTRO
// =========================================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "El nombre de usuario es obligatorio" });

        let user = await User.findOne({ name: username });
        if (!user) {
            user = new User({ name: username, createdAt: new Date() });
            await user.save(); 
            console.log(`🎉 Cuenta nueva creada automáticamente: ${username}`);
        } else {
            console.log(`🔑 Sesión iniciada para: ${username}`);
        }
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 5. RUTAS DE CHATS Y ENLACE CON MISTRAL AI
// =========================================================

app.post('/api/chats/nuevo', (req, res) => {
    return res.json({ _id: "chat_simulado", messages: [] });
});

app.get('/api/chats/:chatId', (req, res) => {
    return res.json({ _id: req.params.chatId, messages: [] });
});

app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { message } = req.body;
        const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

        if (!message) return res.status(400).json({ error: "El mensaje está vacío" });

        console.log(`🤖 Enviando a Mistral AI...`);

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest",
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Fallo de Mistral:", data);
            return res.status(500).json({ error: "Error en Mistral AI" });
        }

        const replyText = data.choices[0].message.content;
        console.log(`✨ Mistral respondió: "${replyText.substring(0, 20)}..."`);

        // SOLUCIÓN AL MENSAJE VACÍO:
        // Enviamos la respuesta repetida con todos los nombres posibles que pueda buscar tu Google Sites
        return res.json({ 
            response: replyText,
            reply: replyText,
            text: replyText,
            message: replyText,
            content: replyText,
            resultado: replyText
        });

    } catch (error) {
        console.error("Error crítico:", error);
        return res.status(500).json({ error: "Error interno" });
    }
});

// =========================================================
// 6. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
