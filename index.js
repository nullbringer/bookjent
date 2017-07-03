'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const departments = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const doctors = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));


var apiai = require("./module/apiai");


var app = apiai(settings.accessToken);


const restService = express();

restService.use(bodyParser.json());

restService.post('/hook', function (req, res) {

    //console.log('hook request');

    try {
        var speech = 'empty speech';
        

        if (req.body) {
            var requestBody = req.body;
            
            var sessionId = requestBody.sessionId;

            /*  searching doctors by department */
            
            if (requestBody.result.action === 'search.doctorsByDepartment') {
                speech = '';                

                var requestedDepartment = departments.filter(function(dept){
                    return (dept.value === requestBody.result.parameters.department);
                });
                
                                
                var doctorForDept = doctors.filter(function(doc){
                    return (doc.department === requestBody.result.parameters.department);
                });   
                
                var doctorNames = [];
                doctorForDept.forEach(function(doc){
                    doctorNames.push(doc.title);
                    
                });             
                
                if(doctorNames){
                    
                    speech = 'Available doctors from ' + requestedDepartment[0].title + ' department are: ' + doctorNames.join(','); 
                    
                    /*
                    * SHOULD WE MAKE it asynchronous???
                    */
                    
                    /* Update dept-doctors entity */
                    
                    var user_entities = [{
                        name: 'dept-doctors',
                        extend: false,
                        entries: doctorForDept
                    }];
                    

                    var user_entities_body = {
                        sessionId: sessionId,
                        entities: user_entities
                    };
                    
                    var user_entities_request = app.userEntitiesRequest(user_entities_body);
                    
                    user_entities_request.on('response', function(response) {
                        console.log('User entities response: ');
                        console.log(JSON.stringify(response, null, 4));

                        /*var request = app.textRequest('book appintment with Daisy', {sessionId: sessionId});

                        request.on('response', function(response) {
                            console.log('Query response: ');
                            console.log(JSON.stringify(response, null, 4));
                        });

                        request.on('error', function(error) {
                            console.log(error);
                        });

                        request.end();*/
                        
                        
                    });

                    user_entities_request.on('error', function(error) {
                        console.log(error);
                        throw "Could not update dept-doctor Entries!";
                    });

                    user_entities_request.end();
                    
                    
                    
                    
                } else {
                    speech = 'No doctors are available for ' + requestedDepartment[0].title;
                }          
                
                  
                
            }
        }

        //console.log('result: ', speech);

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