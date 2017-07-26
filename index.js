'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mongodb = require("mongodb");
const moment = require('moment');


const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const masterDepartmentList = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const masterDoctorList = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));
var ObjectID = mongodb.ObjectID;
const MEETING_COLLECTION = 'meeting_default';


//var apiai = require("./module/apiai");
//var app = apiai(settings.accessToken);
var welcomeModule = require('./module/welcome.js');
var defaultFallbackModule = require('./module/default_fallback.js');
var chooseDepartmentModule = require('./module/choose_department.js');
var chooseDoctorModule = require('./module/choose_doctor.js');
var helper = require('./module/helper.js');

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
    
    var rootUrl = req.protocol + '://' + req.get('host');

    try {
        var speech = 'empty speech';
        var returnContext = [];
        var customData = [];
        

        if (req.body) {
            var requestBody = req.body;
            
            var sessionId = requestBody.sessionId;

            
            
            
            switch(requestBody.result.action){
                    
                case 'input.welcome':
                    
                    console.log('Fired: input.welcome');                    
                    welcomeModule.sayHello(res,callback);
                    
                    break;
                    
                    
                case 'input.unknown':
                    
                    console.log('Fired: input.unknown');
                    defaultFallbackModule.showFallback(res,callback);
                    
                    break;
                    
                    
                case 'search.doctorsByDepartment':
                    
                    /*  searching doctors by department */
                    
                    console.log('Fired: search.doctorsByDepartment');
            
                    chooseDepartmentModule.getResponse(requestBody,rootUrl,res,callback);                    
                    
                    
                    break;
                    
                case 'choose.doctor':
                    
                    /*  choosing doctor from selected department */                    
                    
                    console.log('Fired: choose.doctor');                    
                    
                    chooseDoctorModule.getResponse(db,requestBody,rootUrl,res,callback);     
                    
                    break;
                    
                case 'choose.doctor.confirm':
                    
                    console.log('Fired: choose.doctor.confirm');
                                        
                    var preselectedDepartmentContext = requestBody.result.contexts.filter(function(context){
                        return context.name === 'getdoctorsbydepartment-followup';
                    })[0];
					
                    var timeManager = requestBody.result.contexts.filter(function(context){
                        return context.name === 'time-manager';
                    })[0];
                    
                    insertMeeting(preselectedDepartmentContext, timeManager, res, rootUrl);                   
                                        
                    
                    break;
                
            }   //end of switch
        }

      
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



app.post('/getDoctors', function (req, res) {
    
    try{
        
        
        
        var payload ={};
        
        masterDoctorList.forEach(function(doc){         
             
            
            var docObj ={
                'value':doc.value,
                'name':doc.title
            }
            
            payload[doc.department] = payload[doc.department]||[];            
            payload[doc.department].push(docObj);
            
            
        });  

        
         return res.json({
            status: {
                code: 200,
                type: 'success'
            },
            data: payload
        });
        
        
    } catch(err) {
        
        console.error("Can't process request", err);

        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
        
    }
    
    
    
});



app.post('/getMeetingForDoctor', function (req, res) {
    
    try{
       
        var query = {"doctor_name": req.body.name};
        
          db.collection(MEETING_COLLECTION).find(query).toArray(function(err, meetings) {
            if (err) {
              handleError(res, err.message, "Failed to get contact");
            } else {
                
                
                var meetingList = [];
                
                meetings.forEach(function(meet){
                    
                var meeting = {
                    title :"Appintment",
                    start: meet.start_date_time,
                    end: meet.end_date_time
                }

                    meetingList.push(meeting);

                });
                                
              
                 return res.json({
                    status: {
                        code: 200,
                        type: 'success'
                    },
                    data: meetingList
                });
                
                
            }
          });


        
        
        
        
    } catch(err) {
        
        console.error("Can't process request", err);

        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
        
    }
    
    
    
});






function insertMeeting(preselectedDepartmentContext, timeManager, res,rootUrl){
    
    var speech = '';
    var returnContext = [];
    var customData = [];
    
	  
    var selectedDate = preselectedDepartmentContext.parameters.date;
    var selectedTime = preselectedDepartmentContext.parameters.time;
			
			
    if(timeManager)
    {
		selectedDate = selectedDate || timeManager.parameters.stack_date;
        selectedTime = selectedTime || timeManager.parameters.stack_time;
    }					
    

    var dateTime = moment(selectedDate + " " + selectedTime);			    

    var newMeeting = {
        "doctor_name": preselectedDepartmentContext.parameters['dept-doctors'],
        "start_date_time": dateTime.toDate(),
        "end_date_time": dateTime.add(30, 'm').toDate(),
        "department": preselectedDepartmentContext.parameters.department
    }

    /* insert data to mongo*/


    db.collection(MEETING_COLLECTION).insertOne(newMeeting, function(err, doc) {
                
        if (err) {
            speech = 'Failed to book meeting!';            
            
        } else {
            speech = 'Thanks for booking! See you!';
             
        }
        
        
        /* facebook specific */
        
            customData = {
                "facebook": [
                    {
                        "attachment":{
                          "type":"template",
                          "payload":{
                            "template_type":"generic",
                            "elements":[
                               {
                                "title":"Appointment booked with " + helper.getDoctorByCode(newMeeting.doctor_name).title,
                                "image_url":rootUrl + "/images/"+ helper.getDoctorByCode(newMeeting.doctor_name).image,
                                "subtitle":"Time: " + moment(newMeeting.start_date_time).format("MMMM Do YYYY, h:mm a")                                   
                              }
                            ]
                          }
                        }                                                                       
                    },
                    {
                        "attachment":{
                          "type":"template",
                             "payload":{
                                "template_type":"button",
                                "text":"Thanks for the booking 👍 \nNeed further assistance? Talk to a representative",
                                "buttons":[
                                   {
                                      "type":"phone_number",
                                      "title":"Call Representative",
                                      "payload":"+15105551234"
                                   }
                                ]
                             }
                        }
                    }
                ]
            };
        
        
            //reset all context
        
            returnContext = [
                {
                    "name":"has-nothing", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"has-date", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"has-time", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"has-date-time", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"getdoctorsbydepartment-followup", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"choosedoctor-followup-2", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"choosedoctor-followup", 
                    "lifespan":0, 
                    "parameters":{}
                },
                {
                    "name":"time-manager", 
                    "lifespan":0, 
                    "parameters":{}
                }
                            
            ];        
        
        callback(res,speech,returnContext,customData);
    });
    
}


function callback(res,speech,returnContext,customData){
    
    console.log('Speech');
    console.log('==================');
    console.log(speech);
    console.log('Context');
    console.log('==================');
    console.log(returnContext);
     console.log('customData');
    console.log('==================');
    console.log(customData);
    
    
    return res.json({
        speech: speech,
        displayText: speech,
        contextOut:returnContext,
        data: customData,
        source: 'bookjent'
    });
    
}

