var express = require('express');
var router = express.Router();
const path = require('path');
const helpers = require('../helpers/util');

const moment = require('moment');
moment().format();

module.exports = (pool) => {

    router.get('/', helpers.isLoggedIn, (req, res, next) => {
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        let params = [];
        const url = req.url == '/' ? '?page=1' : req.url;

        if (req.query.checkprojectid && req.query.projectid) {
            params.push(`projects.projectid = ${req.query.projectid}`)
        };

        if (req.query.checkname && req.query.name) {
            params.push(`projects.name ILIKE '%${req.query.name.toLowerCase()}%'`)
        };

        if (req.query.checkmember && req.query.member) {
            params.push(`members.userid = ${req.query.member}`)
        };

        let sql = `SELECT COUNT(id) AS total FROM (SELECT DISTINCT projects.projectid AS id FROM projects LEFT JOIN members ON projects.projectid = members.projectid`;
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
                                // option: JSON.parse(options.rows[0].projectsoptions)
                            })
                                
                        });
                    });
                });
            });
        });
    });

    router.post('/', (req, res) => {
        let sql = `UPDATE users SET projectoptions = '${JSON.stringify(req.body)}' WHERE userid = ${req.session.user.userid}`
        pool.query(sql, (err) => {
            if (err) throw err;
            res.redirect('/projects')
        });
    });

    // add                                                                   
    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqlAdd = `SELECT userid, firstname || ' ' || lastname AS fullname FROM users`;
        pool.query(sqlAdd, (err, result) => {
            if (err) throw err;
            res.render('projects/add', { 
                title: 'Add Project', 
                path: 'projects',
                users: result.rows,
                user: req.session.user
            });
        });
    });

    router.post('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqlAddName = `INSERT INTO projects(name) VALUES('${req.body.projectname}')`;
        pool.query(sqlAddName, (err, result) => {
            let sqlAddNext = `SELECT MAX(projectid) total FROM projects`;
            pool.query(sqlAddNext, (err, result) => {
                if (err) throw err;
                let params = [];
                const projectid = result.rows[0].total;
                if (typeof req.body.members == 'string') {
                    params.push(`(${req.body.members}, ${projectid})`);
                } else {
                    for (let i = 0; i < req.body.members.length; i++) {
                        params.push(`(${req.body.members[i]}, ${projectid})`);
                    }
                }
                let sqlAddMembers = `INSERT INTO members(userid, projectid) VALUES ${params.join(', ')}`;
                pool.query(sqlAddMembers, (err) => {
                    if (err) throw err;
                    res.redirect('/projects')
                });
            });
        });
    });

    // edit
    router.get('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
        let pid = parseInt(req.params.id);
        let sqlEdit = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON members.projectid = projects.projectid WHERE projects.projectid = $1`;
        pool.query(sqlEdit, [pid], (err, result) => {
            let sqlEditNext = `SELECT * FROM users`
            pool.query(sqlEditNext, (err, data) => {
                if (err) throw err;
                res.render('projects/edit', {
                    title: 'Edit Projects',
                    path: 'projects',
                    name: result.rows[0].name,
                    projectid: result.rows[0].projectid,
                    members: result.rows.map(item => item.userid),
                    users: data.rows
                });
            });
        });
    });

    router.post('/edit/:id', helpers.isLoggedIn, (req, res, next) => {
        let pid = parseInt(req.params.id);
        let sqlEdit = `UPDATE projects SET name = '${req.body.name}' WHERE projectid = $1`;
        console.log('Edit ' + sqlEdit)
        pool.query(sqlEdit, [pid], (err, result) => {
            sqlEditNext = `DELETE FROM members WHERE projectid = $1`;
            console.log('Next edit ' +sqlEditNext)
            pool.query(sqlEditNext, [pid], (err, response) => {
                let params = [];
                if(typeof req.body.members == 'string') {
                    params.push(`(${req.body.members}, ${pid})`)
                } else {
                    for (let i = 0; i < req.body.members.length; i++) {
                        params.push(`(${req.body.members[i]}, ${pid})`)
                    }
                }
                let sqlPush = `INSERT INTO members (userid, projectid) VALUES ${params.join(', ')}`;
                console.log('Push edit ' + sqlPush)
                pool.query(sqlPush, (err) => {
                    if (err) throw err;
                    res.redirect('/projects')
                });
            });
        });
    });

    // delete
    router.get('/delete/:id', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
        pool.query(sqlDelete, [projectid], (err, response) => {
            if (err) throw err;
            let sqlDeleteNext = `DELETE FROM projects WHERE projectid = $1`;
            pool.query(sqlDeleteNext, [projectid], (err, response) => {
                if (err) throw err;
                res.redirect('/projects')
            });
        });
    });

    // overview
    router.get('/overview/:id', helpers.isLoggedIn, (req, res, next) => {
        let pid = parseInt(req.params.id);
        let sqlOvw = `SELECT * FROM projects WHERE projectid = ${pid}`;
        pool.query(sqlOvw, (err, response) => {
            console.log(response)
            if (err) {
                res.send(err)
            }
            res.render('projects/overview/view', { 
                title: 'Overview', 
                path: 'projects',
                data: response.rows[0]
             });
        });
    });

    // activity
    router.get('/activity/:id', helpers.isLoggedIn, (req, res, next) => {
        res.render('projects/activity/view', { title: 'Activity', path: "projects" });
    });

    // members
    router.get('/members/:id', helpers.isLoggedIn, (req, res, next) => {
        const mid = req.params.id
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        let params = [];
        const url = req.url == `/members/${mid}` ? `/members/${mid}?page=1` : req.url;

        if (req.query.checkuserid && req.query.userid) {
            params.push(`members.userid = ${req.query.userid}`)
        }
        if (req.query.checkfullname && req.query.fullname) {
            params.push(`CONCAT (users.firstname,' ',users.lastname) ILIKE '%${req.query.fullname}%'`)
        }
        if (req.query.checkrole && req.query.role) {
            params.push(`members.role = '${req.query.role}'`)
        }
        console.log('req.query ' + req.query)
        let sql = `SELECT COUNT(userid) AS total FROM members WHERE members.projectid = ${mid}`
        pool.query(sql, (err, result) => {

            console.log('sql ' + sql)
            if (err) {
                return res.send(err)
            }

            let sqlMembers = `SELECT projects.projectid, members.id, members.role, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM members LEFT JOIN projects ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${mid}`;
            if (params.length > 0) {
                sqlMembers += ` WHERE ${params.join(' AND ')}`;
            }
            sqlMembers += ` ORDER BY members.id LIMIT ${limit} OFFSET ${offset}`;
            console.log('sqlMembers ' + sqlMembers)
            pool.query(sqlMembers, (err, response) => {
                console.log('ini response ' + response)
                const total = response.rows[0].total;
                const pages = Math.ceil(total / limit);
                let sqlOption = `SELECT memberoption FROM users WHERE userid = ${mid}`;
                console.log('sqlOption ' + sqlOption)
                pool.query(sqlOption, (err, data) => {
                    res.render('projects/members/list', {
                        title: 'Members',
                        path: 'projects',
                        data: response.rows,
                        query: req.query,
                        pagination: { pages, page, url },
                    });
                });
            });
        });
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
