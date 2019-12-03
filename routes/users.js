var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
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
    let params = [];
    const url = req.url == '/' ? '/?page=1' : req.url;
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;

    if (req.query.check_userid && req.query.userid){
      params.push(`id = ${req.query.userid}`)
    }
    if (req.query.check_fullname && req.query.firstname && req.query.lastname){
      params.push(`fullname ILIKE '%${req.query.firstname}%' OR '%${req.query.lastname}%'`)
    }
    if (req.query.check_email && req.query.email){
      params.push(`email = ${req.query.email}`)
    }
    if (req.query.check_role && req.query.role){
      params.push(`role = ${req.query.role}`)
    }
    if (req.query.check_typejob && req.query.typejob){
      params.push(`typejob = ${req.query.typejob}`)
    }

    let sql = `SELECT COUNT(*) AS total FROM users`;

    if (params.length > 0){
      sql += ` WHERE ${params.join(' AND ')}`
    }

    pool.query(sql, (err, response) => {
      if (err){
        return res.send(err)
      }
      const total = response.rows[0].total;
      const pages = Math.ceil(total / limit);

      sql = `SELECT *, CONCAT(firstname,' ',lastname) AS fullname FROM users`

      if (params.length > 0){
        sql += ` WHERE ${params.join(' AND ')}`
      }

      sql += ` ORDER BY userid LIMIT ${limit} OFFSET ${offset}`;
      console.log(sql);
      pool.query(sql, (err, response) => {
        if (err){
          return res.send(err)
        }
        res.render('users/list', {
          title: 'Users', 
          path: 'users',
          data: response.rows,
          pagination: { pages, page, url },
          moment,
          query: req.query
        })
      })
    })
  });

  router.post('/', isLoggedIn, (req, res, next) => {
    res.redirect('users/list');
  });

  // edit user
  router.get('/edit/:userid', isLoggedIn, (req, res, next) => {
    let id = parseInt(req.params.id);
    let sqlEdit = `SELECT * FROM users WHERE userid = ${id}`;
    pool.query(sqlEdit, (err, response) => {
      if (err){ res.send(err) };
      res.render('user/edit', {
        title: 'Edit Users',
        item: response.rows,
        path: 'users'
      });
      console.log(sqlEdit);
    });
  });

  router.post('/edit/:userid', isLoggedIn, (req, res, next) => {
    let userid = req.params.userid;
    let sqlEdit = `UPDATE users SET firstname=$1, lastname=$2, email=$3, password=$4 WHERE userid=$5`;
    let insert = [req.body.firstname, req.body.lastname, req.body.email, req.body.password, userid];
    pool.query(sqlEdit, insert, (err) => {
      if (err){
        res.send(err);
      }
      res.redirect('/');
    })
  });

  // add
  router.get('/add', isLoggedIn, (req, res, next) => {
    res.render('users/add', { title: 'Users', path: "users" });
  });

  router.post('/add', isLoggedIn, (res, req, next) => {
    res.redirect('users');
  });

  return router;
}
