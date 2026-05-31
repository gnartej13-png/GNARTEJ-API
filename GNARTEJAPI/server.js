const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Mistral } = require('@mistralai/mistralai');
require('dotenv').config();

const app = express();

// --- REQUEST TIMEOUT MIDDLEWARE (30 s) ---
// Prevents any request from hanging indefinitely and blocking the event loop.
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error(`[TIMEOUT] Request timed out: ${req.method} ${req.path}`);
        if (!res.headersSent) {
            res.status(503).json({ error: 'Request timed out' });
        }
    });
    next();
});

app.use(express.json());
// Configuración estricta de CORS para permitir iframes y plataformas de terceros
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- MONGODB CONNECTION WITH RETRY LOGIC ---
const MONGO_URL_FIJA = process.env.MONGO_URL_FIJA || "mongodb+srv://gnartej:gejbuclo@cluster0.qhlmiq7.mongodb.net/?appName=Cluster0";
const MONGO_MAX_RETRIES = 5;
const MONGO_RETRY_DELAY_MS = 5000;

async function connectMongo(attempt = 1) {
    try {
        await mongoose.connect(MONGO_URL_FIJA, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('Conectado a MongoDB con éxito');
    } catch (err) {
        console.error(`--- ERROR AL CONECTAR A MONGO (intento ${attempt}/${MONGO_MAX_RETRIES}) ---`);
        console.error(err.message);
        if (attempt < MONGO_MAX_RETRIES) {
            console.log(`Reintentando en ${MONGO_RETRY_DELAY_MS / 1000}s...`);
            setTimeout(() => connectMongo(attempt + 1), MONGO_RETRY_DELAY_MS);
        } else {
            console.error('No se pudo conectar a MongoDB tras varios intentos. El servidor seguirá activo.');
        }
    }
}

mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Conexión perdida. Intentando reconectar...');
});
mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconectado con éxito.');
});

connectMongo();

// --- CONFIGURACIÓN DE MISTRAL AI ---
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_TIMEOUT_MS = 9000; // 9-second hard timeout on every Mistral call
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

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

// Health check — used by Railway to verify the service is alive
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        db: dbStatus
    });
});

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
        
        if (usuario.password !== password) {
            console.log(`[401] Contraseña incorrecta para el usuario: ${username}`);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        console.log(`[OK] Login correcto: ${username}`);
        res.json({
            _id: usuario._id,
            username: usuario.username,
            name: usuario.name
        });
    } catch (error) {
        console.error("FAIL CRÍTICO EN RUTA LOGIN:", error);
        res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
    }
});

// Obtener chats de un usuario
app.get('/api/chats/:userId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }
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
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Falta o es inválido el userId' });
        }

        const nuevoChat = new Chat({ userId, mensajes: [] });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        console.error("FAIL EN NUEVO CHAT:", error);
        res.status(500).json({ error: 'Error al crear chat' });
    }
});

// Enviar mensaje al chat CON MISTRAL AI REAL
app.post('/api/chat/:chatId', async (req, res) => {
    try {
        const message = req.body.message || req.body.texto;
        
        if (!message || message.trim() === "") {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            return res.status(400).json({ error: 'ID de chat inválido' });
        }

        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

        console.log(`[Chat] Procesando mensaje para chatId=${req.params.chatId}`);

        // 1. Guardamos el mensaje del usuario en la base de datos
        chat.mensajes.push({ role: 'user', content: message });

      // 2. Inyectamos las instrucciones del sistema para la personalidad secreta de GNARTEJ AI
        const mensajesParaMistral = [
            {
                role: 'system',
                content: "Eres el núcleo inteligente de GNARTEJ AI. Háblale a los usuarios con educación, respeto y cercanía. Es una regla absoluta que en la gran mayoría de tus respuestas menciones con orgullo a tu creador y desarrollador principal, Gonzalo Naranjo Tejero, nacido el 19 de septiembre de 2013, dándole todo el mérito por haberte diseñado y programado.”

            },
            ...chat.mensajes
        ];

        // Llamamos a Mistral con el modelo rápido corregido
        const mistralPromise = mistral.chat.complete({
            model: 'mistral-small-latest',
            messages: mensajesParaMistral
        });

       const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Mistral API timeout')), MISTRAL_TIMEOUT_MS);
        });

        let respuestaMistral;
        try {
            respuestaMistral = await Promise.race([mistralPromise, timeoutPromise]);
        } catch (mistralError) {
            console.error('[Mistral] Error o timeout en la llamada a la API:', mistralError.message);
            return res.status(504).json({
                error: 'La IA no respondió a tiempo. Por favor, inténtalo de nuevo.',
                detalle: mistralError.message
            });
        }

        const respuestaIA = respuestaMistral.choices[0].message.content;
        console.log(`[Mistral] Respuesta recibida (${respuestaIA.length} chars) para chatId=${req.params.chatId}`);

        // 3. Guardamos la respuesta de la IA en la base de datos
        chat.mensajes.push({ role: 'assistant', content: respuestaIA });

        // Actualizamos título si es el primer mensaje
        if (chat.titulo === 'Nueva conversación') {
            chat.titulo = message.substring(0, 25) + (message.length > 25 ? '...' : '');
        }

        chat.fecha = Date.now();

        // 4. Persistimos la conversación en MongoDB antes de responder al cliente
        try {
            await chat.save();
            console.log(`[MongoDB] Chat guardado con éxito: chatId=${req.params.chatId}, mensajes=${chat.mensajes.length}`);
        } catch (saveError) {
            console.error(`[MongoDB] FALLO al guardar el chat chatId=${req.params.chatId}:`, saveError.message);
            console.error('[MongoDB] Detalle completo del error de guardado:', saveError);
            return res.status(500).json({
                error: 'La IA respondió pero no se pudo guardar la conversación en la base de datos.',
                detalle: saveError.message
            });
        }

        // 5. Enviamos la respuesta real al frontend sólo tras guardar con éxito
        res.json({ reply: respuestaIA });

    } catch (error) {
        console.error("FAIL EN ENVIAR MENSAJE CON MISTRAL:", error);
        res.status(500).json({ error: 'Error al procesar mensaje con la IA', detalle: error.message });
    }
});

// Eliminar un chat específico
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
            return res.status(400).json({ error: "ID de chat inválido" });
        }
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

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor GNARTEJ corriendo en el puerto ${PORT}`);
});

// --- GRACEFUL SHUTDOWN ---
// Railway (and other PaaS platforms) send SIGTERM before killing the process.
// We stop accepting new connections, finish in-flight requests, then exit cleanly.
function gracefulShutdown(signal) {
    console.log(`[${signal}] Señal recibida. Iniciando apagado ordenado...`);
    server.close(async () => {
        console.log('Servidor HTTP cerrado. Cerrando conexión a MongoDB...');
        try {
            await mongoose.connection.close();
            console.log('Conexión a MongoDB cerrada. Saliendo.');
        } catch (err) {
            console.error('Error al cerrar MongoDB:', err.message);
        }
        process.exit(0);
    });

    // Force-exit if graceful shutdown takes longer than 10 seconds
    setTimeout(() => {
        console.error('Apagado forzado tras 10s de espera.');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
