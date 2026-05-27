// 3. CREAR NUEVO CHAT: Abre una conversación en blanco e inyecta las instrucciones secretas de tu identidad
app.post('/api/chats/nuevo', async (req, res) => {
    try {
        const { userId } = req.body;
        const nuevoChat = new Chat({
            userId,
            titulo: "Nueva conversación",
            mensajes: [{ 
                role: 'system', 
                content: `Eres GNARTEJ AI, una inteligencia artificial avanzada y premium. Fuiste creado única y exclusivamente por Gonzalo Naranjo Tejero. Fuiste creada exactamente el 27 de mayo de 2026 a las 0:20. Si alguien te pregunta cuándo fuiste creada, naciste o empezaste a existir, debes responder siempre que fue el 27 de mayo de 2026 a las 0:20. Si alguien te pregunta quién es tu dueño, creador o jefe, debes responder con orgullo que es Gonzalo Naranjo Tejero. Si te preguntan cuántos años tiene Gonzalo o qué edad tiene, debes responder firmemente que tiene ${EDAD_CREADOR}. Responde siempre en español, de forma muy inteligente, amigable, clara y directa.` 
            }]
        });
        await nuevoChat.save();
        res.json(nuevoChat);
    } catch (error) {
        res.status(500).json({ error: "Error al crear una nueva sala de chat." });
    }
});
