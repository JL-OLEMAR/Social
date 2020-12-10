'use strict'

var express = require('express');
var followController = require('../controllers/follow');
var api = express.Router();
var md_auth = require('../middlewares/authenticated');

api.get('/pruebas-follow', md_auth.ensureAuth, followController.prueba);

module.exports = api;