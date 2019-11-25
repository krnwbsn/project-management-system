var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    req.session.latestUrl = req.originalUrl;
    res.redirect('/');
  }
};
const isLoggedOut = (req, res, next) => {
  isLoggedOut: (req, res, next) => {
    if (req.session.user) {
      res.redirect('/projects');
    } else {
      next();
    }
  }
};

const moment = require('moment');
moment().format();

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
router.use(bodyParser.json())

module.exports = (pool) => {
  // log in session
  router.get('/', function(req, res, next) {
    res.render('index', { info: req.flash('info'), latestUrl: req.session.latestUrl, error: req.flash('error')[0] });
  });

  router.post('/login', function(req, res, next) {
    let { email, password} = req.body;
    let sql = `SELECT * FROM users WHERE email='${email}'`;
    console.log(sql);
    pool.query(sql, (err, row) => {
      let isPassword = row.rows[0].password;
      bcrypt.compare(password, isPassword, (err, valid) => {
        if (valid || password == isPassword){
          req.session.user = row.rows[0];
          res.redirect('/projects');
        } else {
          req.flash('error', 'Username or Password is wrong');
          res.redirect('/');
        }
        res.render('index', { title: 'Login' })
      })
    })
  })

  // log out session
  router.get('/logout', (req, res, next) => {
    req.session.destroy(function(err) {
      if (err) throw err;
      res.redirect('/');
    })
  })

  return router;
}
