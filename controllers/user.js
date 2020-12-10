'use strict'

var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var User = require('../models/user');
var Follow = require('../models/follow');
var jwt = require('../services/jwt');
var fs = require('fs');
var path = require('path');

// Prueba a home
function home(req, res) {
    res.status(200).send({
        message: 'Hola mundo desde el servidor de NodeJS'
    });
}

// Pruebas
function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Acción del método de pruebas en el servidor de NodeJS'
    });
}

// Registro
function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        // Controlar usuarios duplicados
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error al crear el usuario' });

            if (users && users.length >= 1) {
                return res.status(200).send({ message: 'El usuario que intentas registrar ya existe.' });
            } else {
                // Cifra la contraseña y me guarda los datos
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar el usuario.' });

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario.' });
                        }
                    });
                });
            }
        });

    } else {
        res.status(200).send({ message: 'Envia todos los campos necesarios!!' });
    }

}

// Login
function loginUser(req, res) {
    var params = req.body;
    var email = params.email;
    var password = params.password;

    User.findOne({ email: email }, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la petición de loguearse' });

        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {

                    if (params.gettoken) {
                        // Generar token y devolver token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });

                    } else {
                        // Devolver datos de usuario
                        user.password = undefined;
                        return res.status(200).send({ user })
                    }

                } else {
                    return res.status(404).send({ message: 'Usuario no identificado' });
                }
            })
        } else {
            return res.status(404).send({ message: 'El usuario no existe, ingrese bien sus datos' });
        }
    });
}

// GetUser
function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la petición.' });

        if (!user) return res.status(404).send({ message: 'El usuario no existe.' });

        followThisUser(req.user.sub, userId).then((value) => {
            user.password = undefined;
            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed
            });
        });

    });
}

async function followThisUser(identity_user_id, user_id) {
    var following = await Follow.findOne({ 'user': identity_user_id, 'followed': user_id }).exec((err, follow) => {
        if (err) return handleError(err);
        return follow;
    });

    var followed = await Follow.findOne({ 'user': user_id, 'followed': identity_user_id }).exec((err, follow) => {
        if (err) return handleError(err);
        return follow;
    });

    return {
        following: following,
        followed: followed
    };
}

// Devolver un listado de usuarios paginados
function getUsers(req, res) {
    var identity_user_id = req.user.sub;

    var page = 1;
    if (req.params.page) {
        page = req.params.page;
    }

    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (err) return res.status(500).send({ message: 'Error en la petición.' });

        if (!users) return res.status(404).send({ message: 'No hy usuarios disponibles.' });

        return res.status(200).send({
            users,
            total,
            pages: Math.ceil(total / itemsPerPage)
        });
    });
}

// Edicion de datos de usuarios
function updatedUser(req, res) {
    var userId = req.params.id;
    var update = req.body;

    // Borrar propiedad password
    delete update.password;

    if (userId != req.user.sub) {
        return res.status(500).send({ message: 'No tienes permiso para adtualizar los datos del usuario' });
    }

    User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
        if (err) return res.status(500).send({ message: 'Error en la petición.' });

        if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario.' });

        return res.status(200).send({ user: userUpdated });
    });
}

// Subir archivos de imagen/avatar de usuario
function uploadImage(req, res) {
    var userId = req.params.id;

    if (req.files) {
        var file_path = req.files.image.path;
        var file_split = file_path.split('\\');
        var file_name = file_split[2];
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];

        if (userId != req.user.sub) {
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos del usuario.');
        }

        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            // Actualizar documento de usuario logueado
            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: 'Error en la petición.' });

                if (!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario.' });

                return res.status(200).send({ user: userUpdated });
            })
        } else {
            return removeFilesOfUploads(res, file_path, 'Extensión no válida.');
        }
    } else {
        return res.status(200).send({ message: 'No se han subido imagenes.' });
    }
}

function removeFilesOfUploads(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        return res.status(200).send({ message: message });
    });
}

// Devolver imagen
function getImageFile(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen...' });
        }
    });
}

// Exportacion de metodos
module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    updatedUser,
    uploadImage,
    getImageFile
}