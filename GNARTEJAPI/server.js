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
// Pistas sobre la contraseña: Si tiene caracteres como @, $, #, cámbiala en la 
// web de MongoDB Atlas por una que solo tenga letras y números para evitar el Error 500.
const MONGO_URI = "mongodb+srv://tu_usuario:tu_contraseña@cluster0.xxxx.mongodb.net/DATAGNARTEJAI?retryWrites=true&w=majority";

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

        // Comprobamos el estado de la conexión a la base de datos
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ error: "La base de datos de MongoDB no está lista o conectada." });
        }

        // Buscamos si el usuario ya existe
        let user = await User.findOne({ name: username });

        // Si no existe, lo creamos
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
        // Si se rompe, le enviamos el detalle al navegador para saber por qué falló
        return res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 5. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
