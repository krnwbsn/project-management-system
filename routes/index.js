var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
};
const isLoggedOut = (req, res, next) => {
  if (req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
};

const moment = require('moment');
moment().format();

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
router.use(bodyParser.json())

module.exports = (pool) => {
  
  router.get('/', function (req, res, next) {
    res.render('login', { info: req.flash('info') });
  });

  router.post('/login', function (req, res, next) {
    let { email, password } = req.body;
    let sql = `SELECT * FROM users WHERE email='${email}'`;
    console.log(sql);
    pool.query(sql, (err, row) => {
      // console.log(isPassword)
      // bcrypt.compare(password, isPassword, (err, valid) => {
      if (row.rows.length > 0) {
        if (email == row.rows[0].email && password == row.rows[0].password) {
          row.rows[0].password = null;
          req.session.user = row.rows[0];
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



  // log out session
  router.get('/logout', (req, res, next) => {
    req.session.destroy(function (err) {
      if (err) throw err;
      res.redirect('/');
    })
  });

  return router;
}
