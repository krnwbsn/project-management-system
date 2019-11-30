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
    // projects
    router.get('/', isLoggedIn, (req, res, next) => {
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        let params = [];
        const url = req.url == '/' ? '/?page=1' : req.url;


        if (req.query.check_projectid && req.query.projectid) {
            params.push(`projectid = ${req.query.projectid}`)
        };
        if (req.query.check_projectname && req.query.projectname) {
            params.push(`projectname ILIKE '%${req.query.projectname.toLowerCase()}%'`)
        };
        if (req.query.check_member && req.query.member) {
            params.push(`users.userid IN ('SELECT userid FROM members WHERE projectid IN ('SELECT projectid FROM members WHERE userid = ${member}')')`)
        };

        // console.log('Query ' + req.query)

        // sql for Filter
        let sql = `SELECT COUNT(members.projectid) total, ARRAY_AGG(userid) member, projectid, MAX(projects.name) projectname, STRING_AGG(CONCAT(users.firstname, ' ', users.lastname), ', ') fullname FROM members INNER JOIN projects USING(projectid) INNER JOIN users USING(userid)`;
        if (params.length > 0) {
            sql += ` WHERE ${params.join(' AND ')}`;
        }
        sql += ` GROUP BY projectid ORDER BY projectid`;
        // console.log('Count ' + sql)

        pool.query(sql, (err, response) => {
            if (err) {
                return res.send(err)
            };
            const total = response.rows[0].total;
            const pages = Math.ceil(total / limit);

            // data
            let sql = `SELECT members.projectid, MAX(projects.name) projectname, ARRAY_AGG(userid) member, STRING_AGG(CONCAT(users.firstname, ' ', users.lastname), ', ') fullname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid)`
            if (params.length > 0) {
                sql += ` WHERE ${params.join(' AND ')}`;
            }
            
            // pagination
            sql += ` GROUP BY projectid ORDER BY projectid LIMIT ${limit} OFFSET ${offset}`;

            // filter member
            let sqlUsers = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) fullname FROM users GROUP BY userid`;

            pool.query(sql, (err, response) => {
                if (err){
                    return res.send(err)
                }
                res.render('projects/list', {
                    title: 'Projects',
                    path: 'projects',
                    data: response.rows,
                    query: req.query,
                    pagination: { pages, page, url },
                    fullname: response.rows.map(x => x.fullname),
                    moment,
                    dataMembers: response.rows.map(y => y.userid)
                });
                // console.log('Data Pool ' + sql)
            });
            
            pool.query(sqlUsers, (err, response) => {
                if (err) {
                    return res.send(err)
                }
                res.render('projects/list', {
                    title: 'Projects',
                    path: 'projects',
                    data: response.rows,
                    query: req.query,
                    pagination: { pages, page, url },
                    fullname: response.rows.map(x => x.fullname),
                    moment,
                    dataMembers: response.rows.map(y => y.userid)
                });
                // console.log('Users Pool ' + sqlUsers)
            });
        });
    });

    router.post('/', isLoggedIn, (req, res, next) => {
        res.redirect('projects');
    });

    // add                                                                   
    router.get('/add', isLoggedIn, (req, res, next) => {
        res.render('projects/add', { title: 'Add Project', path: "projects" });
    });

    router.post('/add', isLoggedIn, (req, res, next) => {
        res.redirect('projects');
    });

    // edit
    router.get('/edit/:id', isLoggedIn, (req, res, next) => {
        res.render('projects/edit', { title: 'Edit Project', path: "projects" });
    });

    router.post('/edit/:id', isLoggedIn, (req, res, next) => {
        res.redirect('projects');
    });

    // delete
    router.get('/delete/:id', isLoggedIn, (req, res, next) => {
        res.redirect('projects');
    });

    // overview
    router.get('/overview/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/overview/view', { title: 'Overview', path: "projects" });
    });

    // activity
    router.get('/activity/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/activity/view', { title: 'Activity', path: "projects" });
    });

    // members
    router.get('/members/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/members/list', { title: 'Members', path: "projects" });
    });

    router.post('/members/:projectid', isLoggedIn, (req, res, next) => {
        res.redirect('projects/members/list');
    });

    // add members
    router.get('/projects/members/add', isLoggedIn, (req, res, next) => {
        res.render('projects/members/add', { title: 'Add Members', path: "projects" });
    });

    router.post('/projects/members/:projectid/add', isLoggedIn, (req, res, next) => {
        res.redirect('projects/members/list'); // ${projectid}
    });

    // edit members
    router.get('/members/edit/', isLoggedIn, (req, res, next) => {
        res.render('projects/members/edit', { title: 'Edit Members', path: "projects" });
    });

    router.post('/members/edit/', isLoggedIn, (req, res, next) => {
        res.redirect('projects/members/list'); // ${projectid}
    });

    // issues
    router.get('/issues/:projectid', isLoggedIn, (req, res, next) => {
        res.render('projects/issues/list', { title: 'Issues', path: "projects" });
    });

    router.post('/issues/:projectid', isLoggedIn, (req, res, next) => {
        res.redirect('projects/issues/list');
    });

    // add issues
    router.get('/issues/:projectid/add', isLoggedIn, (req, res, next) => {
        res.render('projects/issues/add', { title: 'Add Issues', path: "projects" });
    });

    router.post('/issues/:projectid/add', isLoggedIn, (req, res, next) => {
        res.redirect('projects/issues/list'); // ${projectid}
    });

    // edit issues
    router.get('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res, next) => {
        res.render('/projects/issues/edit', { title: 'Edit Issue', path: "projects" });
    });

    router.post('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res, next) => {
        res.redirect('projects/issues/list'); // ${projectid}
    });

    // delete issues
    router.get('/issues/:projectid/delete/:issueid', isLoggedIn, (req, res, next) => {
        res.redirect('/projects/issues/list'); // ${projectid}
    });

    return router;
}
