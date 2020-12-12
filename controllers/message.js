'use strict'

var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');
var User = require('../models/user');
var Follow = require('../models/follow');
var Message = require('../models/message');

function probando(req, res) {
    return res.status(200).send({ message: 'Hola que tal desde el controlador Message' });
}

module.exports = {
    probando
}