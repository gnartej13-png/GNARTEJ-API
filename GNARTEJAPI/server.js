const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL)
  .then(() => console.log('🍃 Conectado con éxito a MongoDB Atlas'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Esquemas de la Base de Datos
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

// ==========================================
// 4. AUTENTICACIÓN: REGISTRO Y LOGIN DIRECTO
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Faltan datos requeridos." });
        }

        let user = await User.findOne({ name: username });

        if (!user) {
            // REGISTRO: Si el usuario no existe, lo creamos
            user = new User({
                name: username,
                password: password,
                createdAt: new Date()
            });
            await user.save();
            console.log(`✨ Cuenta NUEVA protegida creada: ${username}`);
            return res.status(200).json({
                _id: user._id.toString(),
                username: user.name,
                name: user.name
            });
        } else {
            // LOGIN: Si el usuario ya existe, comprobamos contraseña
            if (user.password !== password) {
                console.log(`❌ Intento de acceso denegado para: ${username} (Contraseña incorrecta)`);
                return res.status(401).json({ error: "Contraseña incorrecta. Acceso denegado." });
            }

            // RESPUESTA LIMPIA CORREGIDA PARA EVITAR ERROR 500
            console.log(`🔑 Sesión iniciada con éxito para: ${username}`);
            return res.status(200).json({
                _id: user._id.toString(),
                username: user.name,
                name: user.name
            });
        }
    } catch (error) {
        console.error("Error crítico en el login:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 5. GESTIÓN DE CHATS, MEMORIA HISTÓRICA Y MISTRAL AI
// ==========================================
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "El userId es obligatorio" });

        const nuevoChat = new Chat({
            userId,
            titulo: 'Conversación Nueva',
            mensajes:
