'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mongodb = require("mongodb");

const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const departments = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const doctors = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));
var ObjectID = mongodb.ObjectID;


//var apiai = require("./module/apiai");
//var app = apiai(settings.accessToken);

const app = express();

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());


var db;

// Connect to the database before starting the application server. 
mongodb.MongoClient.connect(settings.mongoURI, function (err, database) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = database;
    console.log("Database connection ready");

    // Initialize the app.

    app.listen((process.env.PORT || 5000), function () {
        console.log("Server listening");
    });


});



app.post('/hook', function (req, res) {

    console.log('HOOK REQUEST');
    console.log('++++++++++++++');

    try {
        var speech = 'empty speech';
        var returnContext = [];
        

        if (req.body) {
            var requestBody = req.body;
            
            var sessionId = requestBody.sessionId;

            
            
            
            switch(requestBody.result.action){
                    
                case 'search.doctorsByDepartment':
                    
                    /*  searching doctors by department */
                    
                    console.log('Fired: search.doctorsByDepartment');
            
                    speech = '';    
                    returnContext = [];

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
                    
                    
                    console.log('Fired: choose.doctor');
                    speech = '';    
                    returnContext = [];
                    
                    var preselectedDepartmentContext = requestBody.result.contexts.filter(function(context){
                        return context.name === 'getdoctorsbydepartment-followup';
                    })[0];
                    
                
                    var doctorCode = preselectedDepartmentContext.parameters['dept-doctors'];
                                      
                    
                    var preselectedDeptValue = preselectedDepartmentContext.parameters.department;                    

                    var departmentWiseDoctorList = doctors.filter( function(doc) {
                        return doc.department === preselectedDeptValue;
                    });

                    var docTitles = [];	

                    var selectedDoctorList = doctors.filter( function(doc) {
                        return (doc.value === doctorCode);
                    });

                    if ( Object.keys(selectedDoctorList).length > 0) {
                        var selectedDoctor = selectedDoctorList[0];
                        var departmentOfDoctorCode = selectedDoctor.department;

                        if (departmentOfDoctorCode === preselectedDepartmentContext.parameters.department) {
                            
                            
                            var selectedDate = preselectedDepartmentContext.parameters.date || preselectedDepartmentContext.parameters.deptDate;
                            var selectedTime = preselectedDepartmentContext.parameters.time || preselectedDepartmentContext.parameters.deptTime;


                            if(selectedDate && selectedTime){

                                returnContext = [{
                                    "name":"has-date-time", 
                                    "lifespan":2, 
                                    "parameters":{}
                                }];
                                
                                speech = 'Booking appointment with ' + selectedDoctor.title + ' on '+selectedDate + ' at ' + selectedTime + '. Do you confirm?';
                                
                                

                            } else if(selectedDate) {

                                returnContext = [{
                                    "name":"has-date", 
                                    "lifespan":2, 
                                    "parameters":{}
                                }];
                                
                                speech = 'Thanks for choosing ' + selectedDoctor.title + '. What is the best time that will work for you?';

                            } else if(selectedTime) {

                                returnContext = [{
                                    "name":"has-time", 
                                    "lifespan":2, 
                                    "parameters":{}
                                }];
                                
                                speech = 'Thanks for choosing ' + selectedDoctor.title + '. On which date should I book the appointment?';
                                
                            } else {
                                
                                returnContext = [{
                                    "name":"has-nothing", 
                                    "lifespan":2, 
                                    "parameters":{}
                                }];
                                
                                 speech = 'Thanks for choosing ' + selectedDoctor.title + '. When do you want to book the appointment?';
                            }
                                                    
                            
                            
                            
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
                
            }   //end of switch
        }

        console.log('Speech');
        console.log('==================');
        console.log(speech);
        console.log('Context');
        console.log('==================');
        console.log(returnContext);

        return res.json({
            speech: speech,
            displayText: speech,
            contextOut:returnContext,
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

