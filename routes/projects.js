var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
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
    // projects
    router.get('/', isLoggedIn, (req, res, next) => {
        res.render('projects/list', { title: 'Projects' });
    });

    router.post('/', isLoggedIn, (req, res, next) => {
        res.redirect('/projects');
    });

    // add
    router.get('/add', isLoggedIn, (req, res, next) => {
        res.render('projects/add', { title: 'Add Project' });
    });

    router.post('/add', isLoggedIn, (req, res, next) => {
        res.redirect('/projects');
    });

    // edit
    router.get('/edit/:id', isLoggedIn, (req, res, next) => {
        res.render('projects/edit', { title: 'Edit Project' });
    });

    router.post('/edit/:id', isLoggedIn, (req, res, next) => {
        res.redirect('/projects');
    });

    // delete
    router.get('/delete/:id', isLoggedIn, (req, res, next) => {
        res.redirect('/projects');
    });

    // overview
    router.get('/overview/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/overview/view', { title: 'Overview' });
    });

    // activity
    router.get('/activity/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/activity/view', { title: 'Activity' });
    });

    // members
    router.get('/members/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/members/view', { title: 'Members' });
    });

    router.post('/members/:projectid', isLoggedIn, (req, res, next) => {
        res.redirect('/projects/members/view');
    });

    // add members
    router.get('/members/:projectid/add', isLoggedIn, (req, res, next) => {
        res.render('projects/members/add', { title: 'Add Members'});
    });

    router.post('/members/:projectid/add', isLoggedIn, (req, res, next) => {
        res.redirect('/projects/members/view');
    });

    // edit members
    router.get('/members/:projectid/edit/:userid', isLoggedIn, (req, res, next) => {
        res.render('projects/members/edit', { title: 'Edit Members'});
    });

    router.post('/members/:projectid/edit/:userid', isLoggedIn, (req, res, next) => {
        res.redirect('/projects/members/view');
    });

    

    return router;
}
