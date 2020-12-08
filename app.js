'use strict'

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

// Cargar rutas

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

// Cors

// rutas
app.get('/', (req, res) => {
    res.status(200).send({
        message: 'Hola mundo desde el servidor de NodeJS'
    });
});

app.get('/pruebas', (req, res) => {
    res.status(200).send({
        message: 'Acción de pruebas en el servidor de NodeJS'
    });
});

// Exportar
module.exports = app;