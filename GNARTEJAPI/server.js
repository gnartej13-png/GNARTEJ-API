const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Conexión directa
mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL)
  .then(() => console.log('🍃 Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error Mongo:', err));

// Esquema mínimo de usuarios
const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

// ==========================================
// RUTA DE LOGIN CORREGIDA (SIN MÁS LIBRERÍAS)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Faltan campos" });
        }

        let user = await User.findOne({ name: username });

        if (!user) {
            // Registro automático si no existe
            user = new User({ name: username, password: password });
            await user.save();
            console.log(`🔑 Cuenta creada: ${username}`);
            return res.status(200).json({
                _id: user._id.toString(),
                username: user.name,
                name: user.name
            });
        } else {
            // Login si existe
            if (user.password !== password) {
                return res.status(401).json({ error: "Contraseña incorrecta" });
            }
            console.log(`🔑 Sesión iniciada: ${username}`);
            return res.status(200).json({
                _id: user._id.toString(),
                username: user.name,
                name: user.name
            });
        }
    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Ruta base para verificar que el servidor vive
app.get('/', (req, res) => {
    res.send('🚀 Servidor GNARTEJ-API Online');
});

app.listen(PORT, () => {
    console.log(`🚀 Puerto: ${PORT}`);
});
