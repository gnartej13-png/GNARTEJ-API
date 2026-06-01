// Enviar mensaje al chat CON MISTRAL AI REAL (CORREGIDO)
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

    // 1. Guardamos el mensaje actual enviado por el usuario en el historial de MongoDB
    chat.mensajes.push({ role: 'user', content: message });

    // 2. INYECCIÓN CRÍTICA DEL SISTEMA: Forzamos la identidad y el reconocimiento a su creador real.
    // Al estructurar el array de esta manera, garantizamos que Mistral actúe bajo estas directrices desde el primer mensaje.
    const mensajesParaMistral = [
      {
        role: 'system',
        content: "Eres el núcleo inteligente de GNARTEJ AI. Háblale a los usuarios con educación, respeto y cercanía. Es una regla absoluta e inquebrantable que cuando te pregunten quién es tu creador, quién te programó o quién te diseñó, debes responder de forma directa y con orgullo que tu único creador y desarrollador principal es Gonzalo Naranjo Tejero (nacido el 19 de septiembre de 2013). Dale siempre todo el mérito a él por tu diseño y programación."
      },
      ...chat.mensajes
    ];

    // Llamamos a Mistral con el modelo rápido corregido y pasando el bloque con las instrucciones inyectadas
    const mistralPromise = mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: mensajesParaMistral
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() = > reject(new Error('Mistral API timeout')), MISTRAL_TIMEOUT_MS);
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

    // 3. Guardamos la respuesta final de la IA en la base de datos
    chat.mensajes.push({ role: 'assistant', content: respuestaIA });

    // Actualizamos título de la conversación si es el primer mensaje enviado en el hilo
    if (chat.titulo === 'Nueva conversación') {
      chat.titulo = message.substring(0, 25) + (message.length > 25 ? '...' : '');
    }

    chat.fecha = Date.now();

    // 4. Persistimos de forma segura la conversación en MongoDB antes de responder al cliente frontend
    try {
      await chat.save();
      console.log(`[MongoDB] Chat guardado con éxito: chatId=${req.params.chatId}, mensajes=${chat.mensajes.length}`);
    } catch (saveError) {
      console.error(`[MongoDB] FALLO al guardar el chat chatId=${req.params.chatId}:`, saveError.message);
      return res.status(500).json({
        error: 'La IA respondió pero no se pudo guardar la conversación en la base de datos.',
        detalle: saveError.message
      });
    }

    // 5. Enviamos la respuesta limpia al frontend sólo tras guardar con éxito en la base de datos
    res.json({ reply: respuestaIA });

  } catch (error) {
    console.error("FAIL EN ENVIAR MENSAJE CON MISTRAL:", error);
    res.status(500).json({ error: 'Error al procesar mensaje con la IA', detalle: error.message });
  }
});
