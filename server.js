const express = require('express')
const pool = require('./db')
const { body, validationResult } = require('express-validator')
require('dotenv').config()
const userDistance = require('./userDistance')

const app = express();


// Data validation rules for addSchool API
const addSchoolValidationRules = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isString().withMessage('Name must be a String'),

    body('address')
        .notEmpty().withMessage('Address is required')
        .isString().withMessage('Address must be a String'),
    
    body('latitude')
        .notEmpty().withMessage('Latitude is required')
        .isFloat({min: -90, max: 90}).withMessage('Latitude must be a valid number between -90 and 90'),

    body('longitude')
        .notEmpty().withMessage('Longitude is required')
        .isFloat({min: -180, max: 180}).withMessage('Longitude must be a valid number between -180 and 180')
    
]

// Data validation rules for getSchools API
const getSchoolValidationRules = [
    body('latitude')
        .notEmpty().withMessage('Latitude is required')
        .isFloat({min: -90, max: 90}).withMessage('Latitude must be a valid number between -90 and 90'),

    body('longitude')
        .notEmpty().withMessage('Longitude is required')
        .isFloat({min: -180, max: 180}).withMessage('Longitude must be a valid number between -180 and 180')
    
]

// Middleware
app.use(express.json());

// Parameter validation function
const payloadValidator = (req, res, next) => {

    const error = validationResult(req)

    if(error.isEmpty()) {
        return next()
    }

    return res.status(400).json({errors: error.array() })

}

// Test route to test backend working
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the School Management API!' });
});



// Test route to test the database connection
app.get('/test-db', async (req, res) => {

    try {
        console.log('testing database connection')

        const result = await pool.query('SELECT 1 + 1 AS solution')

        res.json({
            message: 'successful database connection',
            result: result[0]
        })

    } catch (error) {
        console.log('some error occured while connecting to database\n', error)
        res.status(500).json({error : 'could not connect to the database'})
    }

})


// API route to add a new school to the database
app.post('/addSchool', addSchoolValidationRules, payloadValidator, async (req, res) => {

    try {

        const { name, address, latitude, longitude } = req.body
        
        console.log("Adding a new school to the database")

        const [result] = await pool.query(`INSERT INTO schools(name, address, latitude, longitude) VALUES (?, ?, ?, ?)`,[ name, address, latitude, longitude] )

        res.status(201).json({
            message: 'successfully added the new school data',
            result: result.insertId
        })

    } catch (error) {
        
        console.log("Some error occured while adding new school data to the database",error)

        res.status(500).json({error: 'some error occured while adding new school data'})

    }

})


app.get('/getSchools', getSchoolValidationRules, payloadValidator, async (req, res) => {

    const { latitude, longitude } = req.body

    try {

        console.log('fetching list of all schools')
        const [list_of_schools] = await pool.query('SELECT * FROM schools')

        //mapping and adding the new column of distance
        const list_of_schools_with_dist = list_of_schools.map(school => ({
            ...school,
            distance: userDistance(latitude, longitude, school.latitude, school.longitude)

        }))

        //sorting the list based on distance
        list_of_schools_with_dist.sort((a, b) => a.distance - b.distance)

        res.json(list_of_schools_with_dist)

    } catch (error) {
        
        console.log('Some error occured while fetching list of schools', error)
        res.status(500).json({error: 'some error occured while getting the list of schools'})
        
    }

})


// API to create the database table
app.post('/create-table', async (req, res) => {

    try {
        
        console.log('creating the database table')

        const result = await pool.query('CREATE TABLE IF NOT EXISTS `schools` ( `id` INT AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `address` VARCHAR(255) NOT NULL, `latitude` DECIMAL(10, 8) NOT NULL, `longitude` DECIMAL(11, 8) NOT NULL, `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP);')

        res.status(200).json({
            message: 'successfully created the schools table',
            result: result
        })

    } catch (error) {
        
        console.log("some error occured while creating the schools table")

        res.status(500).json({error: 'some error occured while creating schools table'})

    }

})


// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});