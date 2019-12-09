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

    router.get('/overview/:id', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let sqlOvw = `SELECT tracker, COUNT(issueid) AS open FROM issues WHERE projectid = ${projectid} AND status != 'Closed' GROUP BY tracker`;
        pool.query(sqlOvw, (err, response) => {
            let sqlOvwSecond = `SELECT COUNT(issueid) AS total FROM issues WHERE projectid = ${projectid} GROUP BY tracker`;
            pool.query(sqlOvwSecond, (err, result) => {
                console.log(result)
                let sqlOvwThird = `SELECT CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${projectid}`;
                pool.query(sqlOvwThird, (err, row) => {
                    let sqlOvwForth = `SELECT projects.* FROM projects WHERE projectid = ${projectid}`;
                    pool.query(sqlOvwForth, (err, count) => {
                        console.log(count)
                        if (err) {
                            res.send(err)
                        }
                        res.render('projects/overview/view', {
                            title: 'Overview',
                            path: 'projects',
                            response: response.rows,
                            result: result.rows[0],
                            row: row.rows,
                            count: count.rows[0],
                            projectid
                        });
                    });
                });
            });
        });
    });

    router.get('/activity/:id', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        console.log('pid ' + projectid)
        let sqlAct = `SELECT projects.*, issues. FROM projects WHERE ${projectid}`
        pool.query(sqlAct, (err, response) => {
            if (err) {
                res.send(err)
            }
            res
        })
        let date = new Date();
        let sevenDays = new Date().setTime(new Date().getTime() - (6 * 24 * 60 * 60 * 1000));
        let sqlActNext = `SELECT * FROM activity INNER JOIN users ON activity.author = users.userid WHERE time BETWEEN '${moment(sevenDays).format('YYYY-MM-DD')}' AND '${moment(date).add(1, 'days').format('YYYY-MM-DD')}' ORDER BY time DESC`;
        pool.query(sqlActNext, (err, data) => {
            let result = {};
            data.rows.forEach((item) => {
                if (result[moment(item.time).format('dddd')] && result[moment(item.time).format('dddd')].data) {
                    result[moment(item.time).format('dddd')].data.push(item);
                } else {
                    result[moment(item.time).format('dddd')] = { date: moment(item.time).format('YYYY-MM-DD'), data: [item] };
                }
            })
            console.log(data.rows);

            res.render('projects/activity/view', {
                projectid,
                path: 'projects',
                data: result,
                date,
                sevenDays,
                moment
            });
        });
    });

    router.get('/members/:id', helpers.isLoggedIn, (req, res, next) => {
        const projectid = parseInt(req.params.id);
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        let params = [];
        let url = req.url == '/' ? '?page=1' : req.url;

        if (req.query.checkuserid && req.query.userid) {
            params.push(`members.userid = ${req.query.userid}`)
        }
        if (req.query.checkfullname && req.query.fullname) {
            params.push(`CONCAT (users.firstname,' ',users.lastname) ILIKE '%${req.query.fullname}%'`)
        }
        if (req.query.checkrole && req.query.role) {
            params.push(`members.role = '${req.query.role}'`)
        }
        let sql = `SELECT COUNT(*) AS total FROM members INNER JOIN users USING (userid) WHERE members.projectid = ${projectid}`;
        console.log('sql ' + sql)
        pool.query(sql, (err, result) => {
            const total = result.rows[0].total;
            const pages = Math.ceil(total / limit);
            if (err) {
                return res.send(err)
            }
            let sqlMembers = `SELECT members.userid, members.role, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members INNER JOIN users USING (userid) WHERE projectid = ${projectid}`;
            if (params.length > 0) {
                sqlMembers += ` WHERE ${params.join(' AND ')}`;
            }
            sqlMembers += ` ORDER BY members.userid LIMIT ${limit} OFFSET ${offset}`;
            console.log('sqlMembers ' + sqlMembers)
            pool.query(sqlMembers, (err, response) => {
                let sqlOption = `SELECT memberoption FROM users WHERE userid = ${projectid}`;
                pool.query(sqlOption, (err, data) => {
                    res.render('projects/members/list', {
                        projectid,
                        title: 'Members',
                        path: 'projects',
                        data: response.rows,
                        query: req.query,
                        moment,
                        pagination: { pages, page, url }
                    });
                });
            });
        });
    });

    router.get('/members/:id/add', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let subQuery = `SELECT users.userid FROM members INNER JOIN users ON users.userid = members.userid WHERE projectid = ${projectid}`;
        let sqlAddMembers = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) fullname FROM users WHERE userid NOT IN (${subQuery}) ORDER BY userid`;
        console.log('sqlAddMembers ', sqlAddMembers)
        pool.query(sqlAddMembers, (err, result) => {
            let sqlAddNext = `SELECT members.projectid, MAX(projects.name) projectname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) WHERE projectid=${projectid} GROUP BY projectid ORDER BY projectid`;
            console.log('sqlAddNext ', sqlAddNext)
            pool.query(sqlAddNext, (err, response) => {
                if (err) {
                    res.send(err)
                };
                res.render('projects/members/add', {
                    title: 'Add Members',
                    path: 'projects',
                    users: result.rows,
                    user: req.session.user,
                    projectid,
                    data: result.rows[0],
                    project: response.rows[0]
                });
            });
        });
    });

    router.post('/members/:id/add', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let sqlPostMembers = `INSERT INTO members(userid, role, projectid) VALUES($1, $2, $3)`;
        let insert = [req.body.fullname, req.body.role, projectid];
        console.log(sqlPostMembers)
        pool.query(sqlPostMembers, insert, (err, response) => {
            if (err) throw err;
            res.redirect(`/projects/members/${projectid}`);
        });
    });

    router.get('/members/:id/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let userid = parseInt(req.params.userid)
        let sqlEditMembers = `SELECT members.userid, members.role, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members INNER JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid} AND members.userid = ${userid}`;
        console.log(sqlEditMembers)
        pool.query(sqlEditMembers, (err, result) => {    
            let sqlEditPrName = `SELECT members.projectid, MAX(projects.name) projectname FROM members INNER JOIN projects USING (projectid) INNER JOIN users USING (userid) WHERE projectid=${projectid} GROUP BY projectid ORDER BY projectid`;
            if (err) {
                res.send(err)
            };
            console.log(sqlEditPrName)
            pool.query(sqlEditPrName, (err, response) => {
                if (err) {
                    res.send(err)
                };
                res.render('projects/members/edit', {
                    title: 'Edit Members',
                    path: 'projects',
                    item: result.rows[0],
                    data: response.rows[0],
                    projectid
                });
            });
        });
    });

    router.post('/members/:id/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let userid = parseInt(req.params.userid);
        let sqlPostMembers = `UPDATE members SET role = $1 WHERE userid = ${userid}`;
        let insert = [req.body.role];
        pool.query(sqlPostMembers, insert, (err, response) => {
            if (err) {
                res.send(err)
            };
            res.redirect(`/projects/members/${projectid}`)
        })
    });
    
    router.get('/members/:id/delete/:userid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let userid = parseInt(req.params.userid);
        let sqlDelMembers = `DELETE FROM members WHERE projectid = ${projectid} AND userid = ${userid}`;
        pool.query(sqlDelMembers, (err, result) => {
            if (err) {
                res.send(err)
            };
            res.redirect(`/projects/members/${projectid}`)
        });
    });

    router.get('/issues/:id', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        const page = req.query.page || 1;
        const limit = 3;
        const query = req.query;
        const offset = (page - 1) * limit;
        let params = [];
        const url = req.url == '/' ? '?page=1' : req.url;

        if (req.query.checkissueid && req.query.issueid) {
            params.push(`i1.issueid = ${req.query.issueid}`)
        };

        if (req.query.checksubject && req.query.subject) {
            params.push(`i1.subject ILIKE '%${req.query.subject}%'`)
        };

        if (req,query.checktracker && req.query.tracker) {
            params.push(`i1.tracker ILIKE '%${req.query.tracker}%'`)
        };

        let sql = `SELECT COUNT(i1.issueid) AS total FROM issues i1 WHERE projectid = ${projectid}`;
        if (params.length > 0) {
            sql += ` AND ${params.join(' AND ')}`
        }
        console.log(sql)
        pool.query(sql, (err, count) => {
            console.log(count)
            const total = count.rows[0].total;
            const pages = Math.ceil(total / limit);

            sqlIssues = `SELECT users.userid, users.firstname,
            i1.issueid, i1.projectid, i1.tracker, i1.subject, i1.description, i1.status, i1.priority,
            i1.assignee, i1.startdate, i1.duedate, i1.estimatedtime, i1.done, i1.files, i1.spenttime, i1.targetversion, u2.firstname author, 
			i1.createddate, i1.updateddate, i1.closeddate, i1.parenttask, i2.subject parenttaskname
            FROM issues i1 LEFT JOIN users
            ON i1.assignee = users.userid
			LEFT JOIN users u2
			ON i1.author = u2.userid
			LEFT JOIN issues i2
			ON i1.parenttask = i2.issueid WHERE i1.projectid = ${projectid}`;
            if (params.length > 0) {
                sqlIssues += ` AND ${params.join(' AND ')} `
            }
            sqlIssues += ` ORDER BY i1.issueid LIMIT ${limit} OFFSET ${offset}`

            pool.query(sqlIssues, (err, result) => {
                console.log(sqlIssues)
                if (err) {
                    res.send(err)
                };
                let sqlOptions = `SELECT issuesoptions FROM users WHERE userid = ${req.session.user.userid}`;
                pool.query(sqlOptions, (err, options) => {
                    if (err) {
                        res.send(err)
                    }
                    res.render('projects/issues/list', {
                        title: 'Issues',
                        path: 'projects',
                        data: result.rows,
                        query,
                        projectid,
                        moment,
                        // options: JSON.parse(options.rows[0].issuesoptions),
                        pagination: { pages, page, url }
                    });
                });
            });
        });
    });

    router.post('/issues/:id', helpers.isLoggedIn, (req, res, next) => {
        
        res.redirect('projects/issues/list');
    });

    // add issues
    router.get('/issues/:id/add', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let sqlProjectName = `SELECT DISTINCT members.projectid, projects.name 
        FROM members INNER JOIN projects ON members.projectid = projects.projectid 
        INNER JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`;
        let sqlAddIssues = `SELECT members.userid, CONCAT(users.firstname,' ',users.lastname) AS fullname 
        FROM members INNER JOIN users ON members.userid = users.userid
        WHERE projectid = ${projectid} ORDER BY userid`;
        let sqlParent = `SELECT issueid, subject, parenttask FROM issues WHERE projectid = ${projectid}`
        pool.query(sqlProjectName, (err, data) => {
            if (err) {
                res.send(err)
            };
            pool.query(sqlAddIssues, (err, result) => {
                if (err) {
                    res.send(err)
                };
                pool.query(sqlParent, (err, response) => {
                    res.render('projects/issues/add', {
                        title: 'Add Issues',
                        path: 'projects',
                        data: data.rows[0],
                        result: result.rows,
                        response: response.rows,
                        projectid
                    });  
                }); 
            });
        });
    });

    router.post('/issues/:id/add', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let { tracker, subject, status, description, priority, assignee, startdate, duedate, estimatedtime, done, parenttask, files } = req.body;
        startdate = moment(startdate).format("DD-MM-YYYY");
        duedate = moment(duedate).format("DD-MM-YYYY");
        let sqlPostIssues = `INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, parenttask, createddate, updateddate`;
        let sqlInsert = ` VALUES (${projectid}, '${tracker}', '${subject}', '${description}', '${status}', '${priority}', ${assignee}, '${startdate}', '${duedate}', ${estimatedtime}, ${done}, ${req.session.user.userid}, '${parenttask}', now(), now()`
        console.log('Cek1 ' + sqlPostIssues + sqlInsert)
        if (req.files){
            let upload = req.files.files;
            let filename = upload.name.toLowerCase().replace("", Date.now());
            let filenamepath = `/images/${filename}`;
            sqlPostIssues += ` ,files)`;
            sqlInsert += ` ,'${filenamepath}')`;
            upload.mv(
                path.join(__dirname, "..", "public", "images", filename),
                function (err) {
                    if (err) {
                        res.send(err)
                    } else {
                        console.log('Cek2 ' + sqlPostIssues + sqlInsert)
                        pool.query(sqlPostIssues + sqlInsert).then(result => {
                            res.redirect(`/projects/issues/${projectid}`)
                        })
                            .catch(err => res.send(err))
                    }
                }
            )
        } else {
            sqlPostIssues += `)`;
            sqlInsert += `)`;
            console.log('Cek3 ' + sqlPostIssues + sqlInsert)
            pool.query(sqlPostIssues + sqlInsert).then(result => {
                res.redirect(`/projects/issues/${projectid}`)
            })
                .catch(err => res.send(err))
        }
    });

    router.get('/issues/:id/edit/:issueid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let issueid = parseInt(req.params.issueid)
        let sqlGetEdit = `SELECT users.userid, users.firstname,
            i1.issueid, i1.projectid, i1.tracker, i1.subject, i1.description, i1.status, i1.priority,
            i1.assignee, i1.startdate, i1.duedate, i1.estimatedtime, i1.done, i1.files, i1.spenttime, i1.targetversion, u2.firstname author, 
			i1.createddate, i1.updateddate, i1.closeddate, i1.parenttask
            FROM issues i1 LEFT JOIN users
            ON i1.assignee = users.userid
			LEFT JOIN users u2
			ON i1.author = u2.userid
			LEFT JOIN issues i2
            ON i1.parenttask = i2.issueid WHERE i1.issueid = ${issueid}`;
        pool.query(sqlGetEdit, (err, data) => {
            console.log(data)
            let sqlGetName = `SELECT members.projectid, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members INNER JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`
            if (err) {
                res.send(err)
            }
            pool.query(sqlGetName, (err, result) => {
                if (err) {
                    res.send(err)
                } 
                const subquery = `SELECT issues.issueid FROM issues WHERE projectid=${projectid} AND issueid=${issueid}`;
                let sqlParent = `SELECT issues.issueid, subject FROM issues WHERE issueid NOT IN (${subquery})`;
                pool.query(sqlParent, (err, response) => {
                    if (err) {
                        res.send(err)
                    }
                    res.render('projects/issues/edit', {
                        title: 'Edit Issue',
                        path: 'projects',
                        projectid,
                        moment,
                        data: data.rows[0],
                        result: result.rows[0],
                        response: response.rows,
                        assignee: data.rows.map(item => item.userid)
                    });
                });
            });
        });
    });

    router.post('/issues/:id/edit/:issueid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let issueid = parseInt(req.params.issueid);
        let sqlPost = `UPDATE issues SET projectid=${projectid}, tracker='${req.body.tracker}', subject='${req.body.subject}', description='${req.body.description}', status='${req.body.status}', priority='${req.body.priority}', startdate='${req.body.startdate}', duedate='${req.body.duedate}', estimatedtime='${req.body.estimatedtime}', done=${req.body.done}, parenttask='${req.body.parenttask}', updateddate=now() WHERE issueid=${issueid}`
        console.log(sqlPost)
        pool.query(sqlPost, (err, result) => {
            if (err) {
                res.send(err)
            }
            res.redirect(`/projects/issues/${projectid}`);
        })
    });

    router.get('/issues/:id/delete/:issueid', helpers.isLoggedIn, (req, res, next) => {
        let projectid = parseInt(req.params.id);
        let issueid = parseInt(req.params.issueid);
        let sqlDelIssue = `DELETE FROM issues WHERE projectid = ${projectid} AND issueid = ${issueid}`
        pool.query(sqlDelIssue, (err, result) => {
            if (err) {
                res.send(err)
            };
            res.redirect(`/projects/issues/${projectid}`);
        })
    });

    return router;
}
