const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// =================================================================
// 🛠️ CONFIGURACIÓN PRINCIPAL - CAMBIA ESTO CON TUS DATOS 🛠️
// =================================================================

// 1. Pega aquí tu enlace de MongoDB (el que es JavaScript/Node).
// Recuerda borrar <password> (con los símbolos incluidos) y poner tu clave real.
const MONGO_URI = "TU_CADENA_DE_CONEXION_DE_MONGODB_AQUÍ"; 

// 2. Pega aquí el ID de cliente que te dará la consola de Google Cloud.
const GOOGLE_CLIENT_ID = "TU_GOOGLE_CLIENT_ID_AQUÍ.apps.googleusercontent.com"; 

// 3. Tu edad ya configurada para que la IA sepa respetarte como creador.
const EDAD_CREADOR = "12 AÑOS"; 

// =================================================================

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Conectamos el servidor al almacén de MongoDB Atlas
mongoose.connect(MONGO_URI)
    .then(() => console.log("¡Conectado con éxito a la Base de Datos de GNARTEJ AI!"))
    .catch(err => console.error("Error crítico al conectar la base de datos:", err));

// --- MODELOS DE DATOS (Estructura de las tablas del almacén) ---

// Modelo para guardar a los usuarios que inicien sesión
const UserSchema = new mongoose.Schema({
    googleId: String,
    email: String,
    name: String,
    picture: String
});
const User = mongoose.model('User', UserSchema);

// Modelo para guardar cada chat asociado a su dueño
const ChatSchema = new mongoose.Schema({
    userId: String,
    titulo: String,
    mensajes: Array,
    fecha: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);


// --- RUTAS DEL SERVIDOR (Endpoints) ---

// 1. LOGIN CON GOOGLE: Recibe el usuario, comprueba si es nuevo y lo guarda con su foto
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        let user = await User.findOne({ googleId: payload.sub });
        if (!user) {
            user = new User({
                googleId: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture // Guarda la foto de perfil oficial de su Gmail
            });
            await user.save();
        }
        res.json(user);
    } catch (error) {
        console.error("Error en login de Google:", error);
        res.status(401).json({ error: "Token de Google no válido" });
    }
});

// 2. OBTENER HISTORIAL: Busca todos los chats antiguos de un usuario para pintarlos a la derecha
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.params.userId }).sort({ fecha: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar el historial de chats." });
    }
});

// 3. CREAR NUEVO CHAT: Abre una conversación en blanco e inyecta las instrucciones secretas de tu identidad
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        const nuevoChat = new Chat({
            userId,
            titulo: "Nueva conversación",
            mensajes: [{ 
                role: 'system', 
                content: `Eres GNARTEJ AI, una inteligencia artificial avanzada y premium. Fuiste creado única y exclusivamente por Gonzalo Naranjo Tejero. Si alguien te pregunta quién es tu dueño, creador o jefe, debes responder con orgullo que es Gonzalo Naranjo Tejero. Si te preguntan cuántos años tiene Gonzalo o qué edad tiene, debes responder firmemente que tiene ${EDAD_CREADOR}. Responde siempre en español, de forma muy inteligente, amigable, clara y directa.` 
            }]
        });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        res.status(500).json({ error: "Error al crear una nueva sala de chat." });
    }
});

// 4. ENVIAR MENSAJE Y PRO
