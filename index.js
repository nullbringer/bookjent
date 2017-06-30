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

            if (requestBody.result) {
                speech = '';
                
                
            /*    switch(requestBody.result.parameters.department){                        
                        
                    case 'Cardiology':
                            speech = 'Cardiology Doctors: Dipanik, Moumita';
                            break;
                    case 'Paediatrics':
                            speech = 'Paediatrics Doctors: Avinash, Anindita';
                            break;
                    case 'Neurology':
                            speech = 'Neurology Doctors: Taiseef, Sutrishna';
                            break;
                            
                    default:
                            speech = 'General Doctors: Biswajit';
                }*/
                
                
             
                
                 var doctorForDept = doctors.filter(function(doc){

                    return (doc.department === requestBody.result.parameters.department)

                });   
                            
                                  
                
                
                
                doctorForDept.forEach(function(doc){
                    speech += doc.title + '<br />';
                    
                });

                                
                
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