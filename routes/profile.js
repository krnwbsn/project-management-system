var express = require('express');
var router = express.Router();
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const helpers = require('../helpers/util')
const moment = require('moment');
moment().format();

module.exports = (pool) => {
    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        let sql = `SELECT * FROM users WHERE userid = ${req.session.user.userid}`;
        pool.query(sql, (err, result) => {
            if (err) {
                res.send(err)
            }
            let sqladmin = `SELECT isadmin FROM users WHERE userid = ${req.session.user.userid}`;
            pool.query(sqladmin, (err, admin) => {
                admin = admin.rows;
                let isadmin = admin[0].isadmin;
                res.render('profile/view', {
                    user: req.session.user,
                    path: 'profile',
                    data: result.rows[0],
                    result,
                    isadmin
                });
            });
        });
    });

    router.post('/', helpers.isLoggedIn, (req, res, next) => {
        let { firstname, lastname, password, role, typejob } = req.body
        bcrypt.hash(password, saltRounds, (err, hash) => {
            let sql = `UPDATE users SET firstname=$1, lastname=$2, password=$3, role=$4, typejob=$5 WHERE userid=$6`;
            let insert = [firstname, lastname, hash, role, typejob, req.session.user.userid];
            pool.query(sql, insert, (err) => {
                if (err) {
                    res.send(err);
                }
                res.redirect('/profile');
            });
        })
    });

    return router;
}
