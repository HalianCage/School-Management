//database connection file

require('dotenv').config()

const mysql2 = require('mysql2')

const pool = mysql2.createPool({
    uri: process.env.DATABASE_URL
})

module.exports = pool.promise()