const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// =========================================================
// 1. DEFINICIÓN DEL MODELO USER (¡Unificado aquí mismo!)
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

// Vinculamos el modelo directamente con tu colección 'gnartej'
const User = mongoose.model('User', UserSchema, 'gnartej'); 

// =========================================================
// 2. CONFIGURACIÓN DE SEGURIDAD (CORS) para Google Sites
// =========================================================
app.use(cors({
    origin: '*', // Evita que el navegador web te bloquee las peticiones
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =========================================================
// 3. CONEXIÓN A TU BASE DE DATOS MONGODB ATLAS
// =========================================================
// RECUERDA: Cambia 'tu_usuario' y 'tu_contraseña' por tus datos reales de Atlas.
// Al final de la URL ya va /DATAGNARTEJAI como vimos en tu captura.
const MONGO_URI = "mongodb+srv://tu_usuario:tu_contraseña@cluster0.xxxx.mongodb.net/DATAGNARTEJAI?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
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

        // Buscamos si el usuario ya existe en la colección 'gnartej'
        let user = await User.findOne({ name: username });

        // Si no existe, el servidor lo crea de forma automática en MongoDB
        if (!user) {
            user = new User({
                name: username,
                createdAt: new Date()
            });
            await user.save(); 
            console.log(`🎉 Cuenta nueva creada automáticamente: ${username}`);
        } else {
            console.log(`🔑 Sesión iniciada para el usuario existente: ${username}`);
        }

        // Devolvemos el objeto del usuario (con su _id) al Google Sites
        res.json(user);

    } catch (error) {
        console.error("Error en el proceso de autenticación:", error);
        res.status(500).json({ error: "Error interno en el servidor al gestionar la cuenta" });
    }
});

// =========================================================
// 5. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
