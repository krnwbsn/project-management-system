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


        if (req.query.projectid && req.query.check_id) {
            params.push(`projectid = ${req.query.projectid}`)
        };
        if (req.query.name && req.query.check_name) {
            params.push(`projectname ILIKE '%${req.query.projectname.toLowerCase()}%'`)
        };
        if (req.query.member && req.query.check_member) {
            params.push(`users.users.id IN ('SELECT userid FROM members WHERE projectid IN ('SELECT projectid FROM members WHERE userid = ${member}')')`)
        };
        
        // sql for Filter
        let sqlFilter = `SELECT COUNT(members.projectid) total, ARRAY_AGG(userid) member, projectid, MAX(projects.name) projectname, STRING_AGG(users.firstname, ' ', users.lastname), ', ') fullname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid)`;
        if (params.length > 0) {
            sqlFilter += ` WHERE ${result.join(' AND ')}`;
        }
        sqlFilter += `GROUP BY projectid ORDER BY projectid`;

        pool.query(sqlFilter, (err, response) => {
            if (err) {throw err};
            let total = response.rows.length;
            let pages = Math.ceil(total / limit);

            // data projects
            let sqlProjects = `SELECT members.projectid, MAX(projects.name) projectname, ARRAY_AGG(userid) member, STRING_AGG(CONCAT(users.firstname, ' ', users.lastname), ', ') fullname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid)`
            if (params.length > 0) {
                sqlProjects += ` WHERE ${params.join(' AND ')}`;
            }

            // pagination
            sql += ` GROUP BY projectid ORDER BY projectid LIMIT ${limit} OFFSET ${offset}`;

            // filter member
            let sqlUser = `SELECT users.userid, 
            CONCAT(users.firstname,' ',users.lastname) fullname 
            FROM users GROUP BY userid`;

            const getTable = pool.query(sql);
            const getUsers = pool.query(sqlUser);

            // promise for rendering SQL
            Promise.all([getTable, getUsers])
                .then(result => {
                    const data = results[0].rows;
                    const dataUsers = results[1].rows;
                    let fullname = dataUsers.map(x => x.fullname);
                    let dataMembers = dataUsers.map(y => y.userid);
                    res.render('projects/list', {
                        title: 'Projects',
                        path: 'projects',
                        data,
                        query: req.query,
                        pages,
                        url,
                        fullname,
                        dataMembers
                    });
                })
                .catch(err => console.error(err));
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
