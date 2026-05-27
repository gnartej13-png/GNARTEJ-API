const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DEL MODELO USER (PARA TU MONGODB ATLAS)
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
// 3. CONEXIÓN A TU BASE DE DATOS MONGODB ATLAS
// =========================================================
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("🚀 Conectado con éxito a MongoDB Atlas (DATAGNARTEJAI)"))
.catch((err) => console.error("❌ Error al conectar a MongoDB:", err));

// =========================================================
// 4. RUTA AUTOMÁTICA DE LOGIN / REGISTRO
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

// Rutas de soporte para que el diseño de Google Sites no tire error al cargar
app.post('/api/chats/nuevo', (req, res) => {
    return res.json({ _id: "chat_simulado", messages: [] });
});

app.get('/api/chats/:chatId', (req, res) => {
    return res.json({ _id: req.params.chatId, messages: [] });
});

// ESTA ES LA RUTA DE MISTRAL QUE USABAS ANTES
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const { message } = req.body;
        // Recuperamos la clave de Mistral que ya tenías guardada en Render
        const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

        if (!message) return res.status(400).json({ error: "El mensaje está vacío" });

        console.log(`🤖 Solicitando respuesta a Mistral AI...`);

        // Conexión directa con la API oficial de Mistral
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: "mistral-small-latest", // Tu modelo de confianza
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Fallo en la API de Mistral:", data);
            return res.status(500).json({ response: "Error al hablar con Mistral AI." });
        }

        const replyText = data.choices[0].message.content;
        console.log(`✨ Mistral ha respondido con éxito.`);

        // Devolvemos la respuesta limpia a tu Google Sites
        return res.json({ response: replyText });

    } catch (error) {
        console.error("Error en el proceso del chat:", error);
        return res.status(500).json({ response: "Error interno del servidor." });
    }
});

// =========================================================
// 6. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
