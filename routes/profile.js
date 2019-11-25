var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser')

// parse application/x-www-form-urlencoded
router.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
router.use(bodyParser.json())

module.exports = (pool) => {
    /* GET home page. */
    router.get('/', function (req, res, next) {
        res.render('index', { title: 'Express' });
    });
    return router;
}
