const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE DE TIMEOUT (30 segundos) ---
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error(`[TIMEOUT] Petición agotada: ${req.method} ${req.path}`);
        if (!res.headersSent) {
            res.status(503).json({ error: 'Tiempo de espera agotado' });
        }
    });
    next();
});

app.use(express.json());

// Configuración de CORS compatible con Vercel Serverless
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
}));

app.options('*', cors());

// --- CONEXIÓN A MONGODB (ADAPTADA A VERCEL) ---
const MONGO_URL_FIJA = process.env.MONGO_URL_FIJA || "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";

// Middleware para asegurar la conexión a MongoDB antes de procesar las rutas de la API
const conectarBDMiddleware = async (req, res, next) => {
    if (mongoose.connection.readyState >= 1) {
        return next();
    }
    try {
        await mongoose.connect(MONGO_URL_FIJA, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Conectado a MongoDB con éxito en entorno Serverless');
        next();
    } catch (err) {
        console.error('Error crítico al conectar a Mongo en la petición:', err.message);
        return res.status(500).json({ error: 'Error de conexión con la base de datos', detalle: err.message });
    }
};

// Aplicamos el middleware a todas las rutas de la API
app.use('/api', conectarBDMiddleware);

// --- CONFIGURACIÓN DE MISTRAL AI ---
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

// --- MODELOS DE LA BASE DE DATOS ---
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

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    res.status(200).json({ status: 'ok', db: dbStatus });
});

app.get('/', (req, res) => {
    res.send('API de GNARTEJ activa y respondiendo en Vercel.');
});

// Ruta de Login corregida y optimizada
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const usuario = await User.findOne({ username: username.trim() });

        if (!usuario || usuario.password !== password.trim()) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Devolvemos los datos del usuario (evitando revelar la contraseña en texto plano por seguridad)
        res.status(200).json({
            id: usuario._id,
            username: usuario.username,
            name: usuario.name || usuario.username
        });
    } catch (err) {
        console.error('Error en el login:', err.message);
        res.status(500).json({ error: 'Error interno del servidor', detalle: err.message });
    }
});

// Exportación requerida para Vercel Serverless
module.exports = app;
