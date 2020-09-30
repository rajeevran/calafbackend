'use strict';
var express = require("express");
var adminService = require('../services/adminService');

var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var config = require('../config');
var secretKey = config.secretKey;

var admin = express.Router();
admin.use(bodyParser.json());
admin.use(bodyParser.urlencoded({
    extended: false
}));

admin.post('/adminSignup', function (req, res) {
    var adminData = req.body;
    adminService.adminSignup(adminData, function (response) {
        res.send(response);
    });
});
admin.post('/adminLogin', function (req, res) {
    var adminData = req.body;
    adminService.adminLogin(adminData, function (response) {
        res.send(response);
    });
});
admin.post('/adminForgotPassword', function (req, res) {
    var adminData = req.body;
    adminService.adminForgotPassword(adminData, function (response) {
        res.send(response);
    });
});


admin.post('/sendEmail', function (req, res) {
    var adminData = req.body;
    adminService.sendEmail(adminData, function (response) {
        res.send(response);
    });
});

/******************************
 *  Middleware to check token
 ******************************/
admin.use(function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
        jwt.verify(token, secretKey, function (err, decoded) {
            if (err) {
                res.send({
                    success: false,
                    STATUSCODE: 4000,
                    message: "Session timeout! Please login again.",
                    response: err
                });
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        res.send({
            success: false,
            error: true,
            message: "Please provide token",
            response: []
        });
    }
});
/******************************
 *  Middleware to check token
 ******************************/

admin.get('/listAdmin', function (req, res) {

    adminService.listAdmin(req.query, function (response) {
        res.send(response);
    });
});

admin.post('/addAdmin', function (req, res) {
    adminService.addAdmin( req.body, req.files, function (response) {
        res.send(response);
    });
});

admin.post('/editAdmin', function (req, res) {
    adminService.editAdmin( req.body, req.files, function (response) {
        res.send(response);
    });
});

// Delete Admin
admin.post('/deleteAdmin', function (req, res) {
    adminService.deleteAdmin(req.body, function (result) {
        res.send(result);
    });
});

//list User
admin.get('/listUser', function (req, res) {
    adminService.listUser(req.query, function (response) {
        res.send(response);
    });
});

admin.post('/addUser', function (req, res) {
    adminService.addUser( req.body, req.files, function (response) {
        res.send(response);
    });
});

//edit User
admin.post('/editUser', function (req, res) {
    console.log('req.files--->',req.files)
    adminService.editUser(req.body, req.files, function (response) {
        res.send(response);
    });
});

admin.post('/changePassword', function (req, res) {
    adminService.changePassword(req.body, function (response) {
        res.send(response);
    });
});




module.exports = admin;