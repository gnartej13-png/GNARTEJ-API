const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DEL MODELO USER
// =========================================================
const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

const User = mongoose.model('User', UserSchema, 'gnartej'); 

// =========================================================
// 2. CONFIGURACIÓN DE SEGURIDAD (CORS)
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
        
        if (!username) {
            return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
        }

        let user = await User.findOne({ name: username });

        if (!user) {
            user = new User({
                name: username,
                createdAt: new Date()
            });
            await user.save(); 
            console.log(`🎉 Cuenta nueva creada automáticamente: ${username}`);
        } else {
            console.log(`🔑 Sesión iniciada para: ${username}`);
        }

        return res.json(user);

    } catch (error) {
        console.error("Error crítico en el proceso de login:", error);
        return res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 5. RUTAS DE CHATS PARA EVITAR EL ERROR 404 DE GOOGLE SITES
// =========================================================
// Respondemos con datos ficticios para que el frontend no se rompa
app.post('/api/chats/nuevo', (req, res) => {
    return res.json({ _id: "chat_simulado", messages: [] });
});

app.get('/api/chats/:chatId', (req, res) => {
    return res.json({ _id: req.params.chatId, messages: [] });
});

app.post('/api/chat/:chatId', (req, res) => {
    return res.json({ response: "Servidor conectado. Modo chat listo." });
});

// =========================================================
// 6. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
