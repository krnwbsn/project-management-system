var express = require('express');
var router = express.Router();
const path = require('path');
const helpers = require('../helpers/util');
const moment = require('moment');

moment().format();

module.exports = (pool) => {

  router.get('/', helpers.isLoggedIn, (req, res, next) => {
    let params = [];
    const url = req.url == '/' ? '?page=1' : req.url;
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;

    if (req.query.checkuserid && req.query.userid) {
      params.push(`userid = ${req.query.userid}`)
    }
    if (req.query.checkfullname && req.query.fullname) {
      params.push(`CONCAT (firstname,' ',lastname) ILIKE '%${req.query.fullname}%'`)
    }
    if (req.query.checkemail && req.query.email) {
      params.push(`email = '${req.query.email}'`)
    }
    if (req.query.checkrole && req.query.role) {
      params.push(`role = '${req.query.role}'`)
    }
    if (req.query.checktypejob && req.query.typejob) {
      params.push(`typejob = '${req.query.typejob}'`)
    }

    let sql = `SELECT COUNT(userid) AS total FROM users`;

    if (params.length > 0) {
      sql += ` WHERE ${params.join(' AND ')}`
    }
    pool.query(sql, (err, response) => {
      if (err) {
        return res.send(err)
      }
      const total = response.rows[0].total;
      const pages = Math.ceil(total / limit);

      sql = `SELECT *, CONCAT(firstname,' ',lastname) AS fullname FROM users`

      if (params.length > 0) {
        sql += ` WHERE ${params.join(' AND ')}`
      }

      sql += ` ORDER BY userid LIMIT ${limit} OFFSET ${offset}`;
      console.log(sql);
      pool.query(sql, (err, response) => {
        if (err) {
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

  router.post('/', helpers.isLoggedIn, (req, res, next) => {
    res.redirect('/users');
  });

  router.get('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
    let uid = parseInt(req.params.id);
    let sqlEdit = `SELECT * FROM users WHERE userid = $1`;
    pool.query(sqlEdit, [uid], (err, response) => {
      console.log('Edit ' + sqlEdit)
      if (err) { res.send(err) };
      res.render('users/edit', {
        title: 'Edit Users',
        item: response.rows[0],
        user: req.session.user,
        path: 'users'
      });
      console.log(sqlEdit);
    });
  });

  router.post('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
    let uid = parseInt(req.params.id);
    let sqlEdit = `UPDATE users SET firstname=$1, lastname=$2, email=$3, password=$4, role=$5, typejob=$6 WHERE userid=$7`;
    let insert = [req.body.firstname, req.body.lastname, req.body.email, req.body.password, req.body.role, req.body.typejob, uid];
    pool.query(sqlEdit, insert, (err) => {
      console.log('sql edit ' + sqlEdit)
      if (err) throw err;
      res.redirect('/users');
    })
  });

  router.get('/add', helpers.isLoggedIn, (req, res, next) => {
    let sqlAdd = `SELECT * FROM users`
    pool.query(sqlAdd, (err, result) => {
      if (err) throw err;
      res.render('users/add', {
        title: 'Add Users',
        path: 'users',
        data: result.rows,
        user: req.session.user
      });
    });
  });

  router.post('/add', helpers.isLoggedIn, (req, res, next) => {
    let sqlAdd = `INSERT INTO users(firstname, lastname, email, password, typejob, role, issuesoptions, memberoptions, projectsoptions, usersoptions) VALUES('${req.body.firstname}', '${req.body.lastname}', '${req.body.email}', '${req.body.password}', '${req.body.typejob}', '${req.body.role}', '{}', '{}', '{}', '{}')`;
    console.log('sqlAdd ' + sqlAdd)
    pool.query(sqlAdd, (err, result) => {
      if (err) throw err;
      res.redirect('/users');
    });
  });

  router.get('/delete/:id', helpers.isLoggedIn, (req, res, next) => {
    let sqlDelete = `DELETE FROM users WHERE userid = ${req.params.id}`;
    console.log('Delete User ' + sqlDelete)
    pool.query(sqlDelete, (err, response) => {
      if (err) throw err;
      res.redirect('/users')
    });
  });

  return router;
}
