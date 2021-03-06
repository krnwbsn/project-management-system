var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const path = require('path');

const moment = require('moment');
moment().format();

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
router.use(bodyParser.json())

module.exports = (pool) => {
  
  router.get('/', function (req, res, next) {
    res.render('login', { 
      info: req.flash('info'),
      latestUrl: req.session.latestUrl
    });
  });

  router.post('/login', function (req, res, next) {
    let { email, password } = req.body;
    let sql = `SELECT * FROM users WHERE email='${email}'`;
    
    pool.query(sql, (err, row) => {
      let hashpassword = row.rows[0].password;
      let latestUrl = req.session.latestUrl;
      bcrypt.compare(password, hashpassword, (err, valid) => {
        if (row.rows.length > 0) {
          if (email == row.rows[0].email && valid || password == hashpassword) {
            hashpassword = null;
            req.session.user = row.rows[0];
            latestUrl = latestUrl || '/projects';
            res.redirect('/projects');
          } else {
            req.flash('info', 'Password is wrong');
            res.redirect('/');
          }
        } else {
          req.flash('info', 'Email is wrong')
          res.redirect('/');
        }
      })
    })
  })

  router.get('/logout', (req, res, next) => {
    req.session.destroy(function (err) {
      if (err) throw err;
      res.redirect('/');
    })
  });

  return router;
}
