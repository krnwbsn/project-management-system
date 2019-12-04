var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const helpers = require('../helpers/util');

const moment = require('moment');
moment().format();

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
router.use(bodyParser.json())

module.exports = (pool) => {

    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        let params = [];
        const url = req.url == '/' ? '/?page=1' : req.url;

        if (req.query.checkprojectid && req.query.projectid) {
            params.push(`projects.projectid = ${req.query.projectid}`)
        };

        if (req.query.checkname && req.query.name) {
            params.push(`projects.name ILIKE '%${req.query.name.toLowerCase()}%'`)
        };

        if (req.query.checkmember && req.query.member) {
            params.push(`members.userid = ${req.query.member}`)
        };

        let sql = `SELECT COUNT(id) as total FROM (SELECT DISTINCT projects.projectid AS id FROM projects LEFT JOIN members ON projects.projectid = members.projectid`;
        if (params.length > 0) {
            sql += ` WHERE ${params.join(' AND ')}`;
        }
        sql += `) AS projectmember`;
        console.log('Count ' + sql)

        pool.query(sql, (err, count) => {
            const total = count.rows[0].total;
            const pages = Math.ceil(total / limit);

            sql = `SELECT DISTINCT projects.projectid, projects.name FROM projects LEFT JOIN members ON projects.projectid = members.projectid`;
            if (params.length > 0) {
                sql += ` WHERE ${params.join(' AND ')}`;
            }

            sql += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`
            
            let subquery = `SELECT DISTINCT projects.projectid FROM projects LEFT JOIN members ON projects.projectid = members.projectid`
            if (params.length > 0) {
                subquery += ` WHERE ${params.join(' AND ')}`;
            }
            subquery += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`

            let sqlMembers = `SELECT projects.projectid, users.userid, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid WHERE projects.projectid IN (${subquery})`
            console.log('Data ' + sql)

            pool.query(sql, (err, response) => {
                if (err) throw err;
                console.log('Member ' + sqlMembers)
                pool.query(sqlMembers, (err, result) => {
                    response.rows.map(project => {
                        project.members = result.rows.filter(member => { return member.projectid == project.projectid }).map(data => data.fullname)
                    });
                    let sqlusers = `SELECT * FROM users`;
                    let sqloption = `SELECT projectsoptions FROM users WHERE userid = ${req.session.user.userid}`;
                    pool.query(sqlusers, (err, data) => {
                        pool.query(sqloption, (err, options) => {
                            res.render('projects/list', {
                                title: 'Projects',
                                path: 'projects',
                                data: response.rows,
                                query: req.query,
                                users: data.rows,
                                pagination: { pages, page, url },
                                user: req.session.user
                            })
                        })
                    })
                })
            });
        });
    });

    router.post('/', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects');
    });

    // add                                                                   
    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqlAdd = `SELECT userid, firstname || ' ' || lastname AS fullname FROM users`
        pool.query(sqlAdd, (err, result) => {
            if (err) {
                return res.send(err)
            }
            res.render('projects/add', { 
                title: 'Add Project', 
                path: 'projects',
                users: result.rows
            });
        });
    });

    router.post('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqlAddPost = `INSERT INTO projects(name) VALUES('${req.body.projectname}')`;
        pool.query(sqlAddPost, (err, result) => {
            let sqlAddPostNext = `SELECT MAX(projectid) total FROM projects`;
            pool.query(sqlAddPostNext, (err, result) => {
                return res.send(err);
            })
            let params = [];
            let projectId = result.rows[0].total;
            params.push(`(${req.body.members}, ${projectId})`)
        })
        res.redirect('/projects');
    });

    // edit
    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res, next) => {
        let sqlEdit = `SELECT users.userid, CONCAT(users.firstname,' ', users.lastname) AS fullname FROM users ORDER BY userid`;
        pool.query(sqlEdit, (err, response) => {
            const userdata = response.rows;
            let projectid = parseInt(req.params.id);
            let sqlEditGet = `SELECT members.projectid, MAX(projects.name) projectname, ARRAY_AGG(userid) member, 
            STRING_AGG(CONCAT(users.firstname, ' ', users.lastname), ', ') fullname 
            FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) 
            WHERE projectid=$1 GROUP BY projectid ORDER BY projectid`;
            pool.query(sqlEditGet, [projectid], (err, response) => {
                if (err) throw err;
                res.render('projects/edit', {
                    title: 'Edit Project',
                    path: 'projects',
                    userdata,
                    fullname: response.rows.map(x => x.fullname),
                    data: response.rows,
                    dataMembers: response.rows.map(y => y.member),
                    item: response.rows[0]
                });
            });
        });
    });

    router.post('/edit/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects');
    });

    // delete
    router.get('/delete/:id', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let sqlDelete = `DELETE FROM members WHERE projectid = $1;`
        pool.query(sqlDelete, [projectid], (err, response) => {
            if (err) throw err;
            let sqlDeleteNext = `DELETE FROM projects WHERE projectid = $1;`
            pool.query(sqlDeleteNext, [projectid], (err, response) => {
                if (err) throw err;
                res.redirect('/projects')
            });
        });
    });

    // overview
    router.get('/overview/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/overview/view', { title: 'Overview', path: "projects" });
    });

    // activity
    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/activity/view', { title: 'Activity', path: "projects" });
    });

    // members
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/members/list', { title: 'Members', path: "projects" });
    });

    router.post('/members/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects/members/list');
    });

    // add members
    router.get('/projects/members/add', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/members/add', { title: 'Add Members', path: "projects" });
    });

    router.post('/projects/members/:projectid/add', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects/members/list'); // ${projectid}
    });

    // edit members
    router.get('/members/edit/', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/members/edit', { title: 'Edit Members', path: "projects" });
    });

    router.post('/members/edit/', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects/members/list'); // ${projectid}
    });

    // issues
    router.get('/issues/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/issues/list', { title: 'Issues', path: "projects" });
    });

    router.post('/issues/:projectid', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects/issues/list');
    });

    // add issues
    router.get('/issues/:projectid/add', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/issues/add', { title: 'Add Issues', path: "projects" });
    });

    router.post('/issues/:projectid/add', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects/issues/list'); // ${projectid}
    });

    // edit issues
    router.get('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, (req, res, next) => {
        res.render('/projects/issues/edit', { title: 'Edit Issue', path: "projects" });
    });

    router.post('/issues/:projectid/edit/:issueid', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('projects/issues/list'); // ${projectid}
    });

    // delete issues
    router.get('/issues/:projectid/delete/:issueid', helpers.isLoggedIn, (req, res, next) => {
        res.redirect('/projects/issues/list'); // ${projectid}
    });

    return router;
}
