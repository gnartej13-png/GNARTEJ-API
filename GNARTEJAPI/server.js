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
    origin: '*', // Evita que Google Sites bloquee las peticiones por seguridad
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =========================================================
// 3. CONEXIÓN A TU BASE DE DATOS MONGODB ATLAS
// =========================================================
// He insertado tu URL real. Cambia 'TU_CONTRASEÑA_REAL' por tu clave de Atlas.
const MONGO_URI = "mongodb+srv://gnartej:TU_CONTRASEÑA_REAL@cluster0.qhlmiq7.mongodb.net/DATAGNARTEJAI?appName=Cluster0";

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

        // Buscamos si el usuario ya existe en la colección 'gnartej'
        let user = await User.findOne({ name: username });

        // Si no existe, el servidor lo crea de forma automática en MongoDB Atlas
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
// 5. ARRANQUE DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`💻 Servidor corriendo en el puerto ${PORT}`);
});
