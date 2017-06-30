'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');


const restService = express();
restService.use(bodyParser.json());


const departments = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const doctors = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));


restService.post('/hook', function (req, res) {

    console.log('hook request');

    try {
        var speech = 'empty speech';

        if (req.body) {
            var requestBody = req.body;

            if (requestBody.result.action === 'search.doctorsByDepartment') {
                speech = '';                

                var requestedDepartment = departments.filter(function(dept){
                    return (dept.value === requestBody.result.parameters.department);
                });
                
                
                requestedDepartment = requestedDepartment || 'GEN'
                
                var doctorForDept = doctors.filter(function(doc){
                    return (doc.department === requestBody.result.parameters.department);
                });   
                
                var doctorNames = [];
                doctorForDept.forEach(function(doc){
                    doctorNames.push(doc.title);
                    
                });             
                
                
                speech = 'Available doctors from ' + requestedDepartment[0].title + ' department are: '; 
                speech += doctorNames.join(',');

                                
                
            }
        }

        console.log('result: ', speech);

        return res.json({
            speech: speech,
            displayText: speech,
            source: 'bookjent'
        });
    } catch (err) {
        console.error("Can't process request", err);

        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
    }
});

restService.listen((process.env.PORT || 5000), function () {
    console.log("Server listening");
});