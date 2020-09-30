'use strict';
var express = require("express");
var apiService = require('../services/apiService');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');
var config = require('../config');

var secretKey = config.secretKey;

    var api = express.Router();
    api.use(bodyParser.json());
    api.use(bodyParser.urlencoded({
        extended: false
    }));
    //Register
    api.post('/register', function (req, res) {
        apiService.register(req.body, function (result) {
            res.send(result)
        });
    });
    //Otp Resend
    api.post('/otpResend', function (req, res) {
        apiService.otpResend(req.body, function (result) {
            res.send(result)
        });
    });
    //Otp Verification
    api.post('/verifyEmailOtp', function (req, res) {
        apiService.verifyEmailOtp(req.body, function (result) {
            res.send(result)
        });
    });
    //Login
    api.post('/login', function (req, res) {
        apiService.login(req.body, function (result) {
            res.send(result)
        });
    });
    //Forgot password
    api.post('/forgotPassword', function (req, res) {
        apiService.forgotPassword(req.body, function (response) {
            res.send(response);
        });
    });

    //Reset Password
    api.post("/resetPassword/:token", function (req, res) {
        
        let resetdata= { ...req.body, resetPasswordToken: req.params.token }

        apiService.resetPassword(resetdata, function (response) {
            res.send(response);
        });
    });

    //list Terms
    api.get('/listTerms', function (req, res) {
        apiService.listTerms(req.query, function (response) {
            res.send(response);
        });
    });

    //edit Terms
    api.post('/editTerms', function (req, res) {
        apiService.editTerms(req.body, function (response) {
            res.send(response);
        });
    });

    //list PrivacyPolicy
    api.get('/listPrivacyPolicy', function (req, res) {
        apiService.listPrivacyPolicy(req.query, function (response) {
            res.send(response);
        });
    });

    //edit PrivacyPolicy
    api.post('/editPrivacyPolicy', function (req, res) {
        apiService.editPrivacyPolicy(req.body, function (response) {
            res.send(response);
        });
    });

    //list User
    api.get('/listUser', function (req, res) {
        apiService.listUser(req.query, function (response) {
            res.send(response);
        });
    });


    //list Country
    api.get('/listCountry', function (req, res) {
        apiService.listCountry(req.query, function (response) {
            res.send(response);
        });
    });
    

    //list Ethnicity
    api.get('/listEthnicity', function (req, res) {
        apiService.listEthnicity(req.query, function (response) {
            res.send(response);
        });
    });

    //testNotification
    api.post('/testNotification', function (req, res) {
        apiService.testNotification(req.body, function (response) {
            res.send(response);
        });
    });

    //social Login
    api.post('/socialLogin', (req, res) => {

        apiService.socialRegister(req.body, function (response) {
             res.send(response);
        });
    });

    /******************************
     *  Middleware to check token
     ******************************/
    api.use(function (req, res, next) {

        //console.log('req.body------>',req.body)
        //console.log('req.headers------>',req.headers)
        //console.log('req.query------>',req.query)

        var token = req.body.authtoken || req.query.authtoken || req.headers['x-access-token'];
        if (token) {
            jwt.verify(token, secretKey, function (err, decoded) {
                if (err) {
                    res.send({
                        success: false,
                        STATUSCODE: 400,
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
                STATUSCODE: 5005,
                message: "Please provide required information",
                response: {}
            });
        }
    });
    /******************************
     *  Middleware to check token
     ******************************/


    //list User
    api.get('/reportedUserList', function (req, res) {
        apiService.reportedUserList(req.query, function (response) {
            res.send(response);
        });
    });

    //edit User
    api.post('/editUser', function (req, res) {
        console.log('req.files--->',req.files)
        apiService.editUser(req.body, req.files, function (response) {
            res.send(response);
        });
    });

    //Change password
    api.post('/changePassword', function (req, res) {
        req.body.userId = req.decoded.id;
        apiService.changePassword(req.body, function (result) {
            res.send(result)
        })
    });

    // Edit Profile
    api.post('/editProfile', function (req, res) {
        req.body.userId = req.decoded.id;
        apiService.editProfile(req.body, req.files, function (result) {
            res.send(result);
        });
    });

    // Delete User
    api.post('/deleteUser', function (req, res) {
        apiService.deleteUser(req.body, function (result) {
            res.send(result);
        });
    });

    // View Profile
    api.post('/viewProfile', function (req, res) {
        req.body.userId = req.decoded.id;
        apiService.viewProfile(req.body, function (result) {
            res.send(result);
        });
    });

    // Update Multiple Profile Image 
    api.post('/updateProfileImage', function (req, res) {
        apiService.updateProfileImage(req.body, req.files, function (result) {
            res.send(result);
        });
    });
    
    // Add Feedback
    api.post('/addFeedback', function (req, res) {

        apiService.addFeedback(req.body,  function (result) {
            res.send(result);
        });
    });

    module.exports = api;


