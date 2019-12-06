var express = require('express');
var router = express.Router();
const path = require('path');
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
            res.render('profile/view', {
                user: req.session.user,
                path: 'profile',
                data: result.rows[0],
                result
            });
        });
    });

    router.post('/', helpers.isLoggedIn, (req, res, next) => {
        console.log(req.body)
        let sql = `UPDATE users SET firstname=$1, lastname=$2, password=$3, role=$4, typejob=$5 WHERE userid=$6`;
        let insert = [req.body.firstname, req.body.lastname, req.body.password, req.body.role, req.body.typejob, req.session.user.userid];
        pool.query(sql, insert, (err) => {
            console.log('sql & insert ' + sql + insert)
            if (err) {
                res.send(err);
            }
            res.redirect('/profile');
        });
    });

    return router;
}
