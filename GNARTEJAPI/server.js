// Ruta de Login / Registro automático
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
        }

        // 1. Buscar si el usuario ya existe en MongoDB
        let user = await User.findOne({ name: username });

        // 2. Si no existe, lo creamos e insertamos en la base de datos
        if (!user) {
            user = new User({
                name: username,
                createdAt: new Date()
            });
            await user.save();
            console.log(`🎉 Cuenta nueva creada: ${username}`);
        } else {
            console.log(`🔑 Sesión iniciada para: ${username}`);
        }

        // 3. Devolvemos el usuario (con su _id de MongoDB) al frontend
        res.json(user);

    } catch (error) {
        console.error("Error en la autenticación:", error);
        res.status(500).json({ error: "Error interno del servidor al crear la cuenta" });
    }
});
