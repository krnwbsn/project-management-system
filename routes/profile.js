var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.latestUrl = req.originalUrl;
        res.redirect('/');
    }
};
const moment = require('moment');
moment().format();

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
router.use(bodyParser.json())

module.exports = (pool) => {
    /* GET home page. */
    router.get('/', isLoggedIn, (req, res, next) => {
        res.render('profile/view', { title: 'Profile', path: "profile" });
    });
    return router;

    router.post('/', isLoggedIn, (req, res, next) => {
        res.redirect('/profile');
    });
}
