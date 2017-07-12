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

            
            
            
            switch(requestBody.result.action){
                    
                case 'search.doctorsByDepartment':
                    
                    /*  searching doctors by department */            
            
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

                    } else {
                        speech = 'No doctors are available for ' + requestedDepartment[0].title;
                    }  
                    
                    break;
                    
                case 'choose.doctor':
                    
                    /*  choosing doctor from selected department */
                
                    var doctorCode = requestBody.result.parameters['dept-doctors'];

                    var preselectedDeptCode = requestBody.result.contexts[0].parameters.department;

                    var departmentWiseDoctorList = doctors.filter( function(doc) {
                        return doc.department==preselectedDeptCode
                    });

                    var docTitles = [];	

                    var selectedDoctorList = doctors.filter( function(doc) {
                        return (doc.value === doctorCode);
                    });

                    if ( Object.keys(selectedDoctorList).length > 0) {
                        var selectedDoctor = selectedDoctorList[0];
                        var departmentOfDoctorCode = selectedDoctor.department;


                        if (departmentOfDoctorCode === requestBody.result.contexts[0].parameters.department) {
                            speech = 'Thanks for choosing ' + selectedDoctor.title + '. When do you want to book the appointment?';
                            
                        }  else {
                            speech = 'Please choose from following list of doctors: ';

                            for (var doc of departmentWiseDoctorList) {
                                docTitles.push[doc.title];
                                speech += ' '+ doc.title + ',';
                            }


                        }

                    } else {
                        speech = 'Please choose from following list of doctors:';

                        for (var doc of departmentWiseDoctorList) {
                            docTitles.push[doc.title];
                            speech += ' '+ doc.title + ',';
                        }

                    }
                    
                    break;
                
            }
        }

        console.log('context ', requestBody.result.contexts);

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