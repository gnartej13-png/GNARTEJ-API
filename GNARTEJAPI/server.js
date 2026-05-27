const express = require('express');
const cors = require('cors'); // <-- Asegúrate de tener esta línea
const app = express();

// Configurar CORS para permitir que Google Sites se conecte
app.use(cors({
    origin: '*', // Permite peticiones desde cualquier sitio (ideal para Google Sites)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
