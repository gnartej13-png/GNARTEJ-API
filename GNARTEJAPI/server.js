const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai'); // Importamos el SDK oficial de Mistral
require('dotenv').config(); // Por si decides usar variables de entorno en el futuro

const app = express();

app.use(express.json());
app.use(cors());

// CONEXIÓN ULTRA LIMPIA A TU BASE DE DATOS
const MONGO_URL_FIJA = "mongodb+srv://asierf06:gnartej123@gnartej.8b6ee.mongodb.net/gnartej?retryWrites=true&w=majority".trim();

// Clave API fija de Mistral (Coloca aquí tu API Key real de Mistral AI si tienes una)
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "TU_MISTRAL_API_KEY_AQUI"; 
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

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

// Registro Protegido
app.post('/api/auth/register', async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : null;
        const password = req.body.password ? req.body.password.trim() : null;
        const name = req.body.name ? req.body.name.trim() : username;

        if (!username || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: username o password' });
        }

        const existe = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (existe) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const nuevoUsuario = new User({ username, password, name });
        await nuevoUsuario.save();
        
        console.log(`[OK] Usuario registrado con éxito: ${username}`);
        
        res.status(201).json({
            _id: nuevoUsuario._id,
            username: nuevoUsuario.username,
            name: nuevoUsuario.name
        });
    } catch (error) {
        console.error("FAIL EN RUTA REGISTER:", error);
        res.status(500).json({ error: 'Error al registrar usuario', detalle: error.message });
    }
});

// Login Protegido
app.post('/api/auth/login', async (req, res) => {
    try {
        const username = req.body.username ? req.body.username.trim() : null;
        const password = req.body.password ? req.body.password.trim() : null;

        if (!username || !password) {
            return res.status(400).json({ error: 'Falta usuario o contraseña en la petición' });
        }

        const usuario = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!usuario) {
            console.log(`[404] Intento de login con usuario inexistente: ${username}`);
            return res.status(404).json({ error: 'El usuario no existe' });
        }
        
        if (
