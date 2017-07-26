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
                   
                    
                    var preselectedDepartmentContext = requestBody.result.contexts.filter(function(context){
                        return context.name === 'getdoctorsbydepartment-followup';
                    })[0];

                    var timeManager = requestBody.result.contexts.filter(function(context){
                        return context.name === 'time-manager';
                    })[0];
                    
                    chooseDoctor(preselectedDepartmentContext,timeManager,res,rootUrl);
                    
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





function chooseDoctor(preselectedDepartmentContext,timeManager, res,rootUrl){
    
    var speech = '';
    var returnContext = [];
    var customData = [];
    
    var doctorCode = preselectedDepartmentContext.parameters['dept-doctors'];


    var preselectedDeptValue = preselectedDepartmentContext.parameters.department;                    

    var departmentWiseDoctorList = masterDoctorList.filter( function(doc) {
        return doc.department === preselectedDeptValue;
    });

    var docTitles = [];	

    var selectedDoctorList = masterDoctorList.filter( function(doc) {
        return (doc.value === doctorCode);
    });

    if ( Object.keys(selectedDoctorList).length > 0) {
        var selectedDoctor = selectedDoctorList[0];
        var departmentOfDoctorCode = selectedDoctor.department;
        
        if (departmentOfDoctorCode === preselectedDepartmentContext.parameters.department) {

            
            var selectedDate = preselectedDepartmentContext.parameters.date;
            var selectedTime = preselectedDepartmentContext.parameters.time;
			
			
			if(timeManager)
			{
                console.log("selectedDate:: "+selectedDate);
            console.log("timeManager.parameters.date:: "+timeManager.parameters.stack_date);
                
                
				selectedDate = selectedDate || timeManager.parameters.stack_date;
				selectedTime = selectedTime || timeManager.parameters.stack_time;
                
                
                
				
			}
            
            
            
			
			
            returnContext.push(
                { 
                    "name":"time-manager", 
                    "lifespan":5, 
                    "parameters":{
                        "stack_date":selectedDate,
                        "stack_time":selectedTime
                    }
                }
            );

            if(selectedDate && selectedTime){				
              

                var meetingStartDateTime = moment(selectedDate + " " + selectedTime);						
                var startDate = new Date(selectedDate);

				if( meetingStartDateTime.isAfter(new Date())) {
                    
                    // book appointment only in future

					if( startDate.getDay() == 6 || startDate.getDay() == 0 ) {
                        
                        //if weekend
                        
                        returnContext.push(
                            { 
                                "name":"has-time", 
                                "lifespan":2, 
                                "parameters":{}
                            }
                        );
						speech = 'Hey! No service on weekends! Please choose a weekday!';
						
						callback(res,speech,returnContext,customData);
                        



					} else if(moment(selectedTime, 'hh:mm:s').isBefore(moment('10:00:00', 'hh:mm:s')) || 
                              moment(selectedTime, 'hh:mm:s').isAfter(moment('18:00:00', 'hh:mm:s'))) {
                        
                        //if out of office hour

                         returnContext.push(
                            { 
                                "name":"has-date", 
                                "lifespan":2, 
                                "parameters":{}
                            }
                        );
                        speech = 'We are available 10am - 6pm only. Please book time in business hours only.';

                        callback(res,speech,returnContext,customData);

                        
                    } else {
                        
                        var condition = {
							"start_date_time": {
								"$lte": new Date(meetingStartDateTime.toISOString())	
							} , 
							  "end_date_time": {
								"$gte": new Date(meetingStartDateTime.toISOString())
							} ,   
							"doctor_name": doctorCode
						};



						db.collection('meeting_default').find(condition).count().then(function(numOfConfictMeetings) {
							//console.log('numOfConfictMeetings:'+numOfConfictMeetings);
							if(numOfConfictMeetings === 0) {
                                returnContext.push(
                                    {
                                        "name":"has-date-time", 
                                        "lifespan":2, 
                                        "parameters":{}
                                    }                                
                                );
                                
								speech = 'Booking appointment with ' + selectedDoctor.title + ' on '+ meetingStartDateTime.format("MMMM Do, h:mm a") + '. Do you confirm?';	
								
								var customData = {
											  "facebook": {
												 "text": speech,
												 "quick_replies": [
													{
													   "content_type": "text",
													   "title": "Yes",
													   "payload": "Yes"
													},
													{
													   "content_type": "text",
													   "title": "No",
													   "payload": "No"
													}
												 ]
											  }
											};
								
								callback(res,speech,returnContext,customData);
							}
							else {
								returnContext.push(
                                    {
                                        "name":"has-date", 
                                        "lifespan":2, 
                                        "parameters":{}
                                    }                                
                                );
								speech = selectedDoctor.title + ' already booked on ' + meetingStartDateTime.format("MMMM Do, h:mm a") + '.😣 Please suggest a different time.'; 
								
								callback(res,speech,returnContext,customData);
							}
						});                        
                        

					}
				}		
				else
				{
					returnContext.push(
                        {
                            "name":"has-nothing", 
                            "lifespan":2, 
                            "parameters":{}
                        }                                
                    );
					speech = 'We do not heal the past by dwelling there! 😜 \nPlease select a date in future';
					
					callback(res,speech,returnContext,customData);
				}



			} else if(selectedDate) {
				
                returnContext.push(
                    {
                        "name":"has-date", 
                        "lifespan":2, 
                        "parameters":{}
                    }                                
                );

                speech = 'Sure! What is the best time that will work for you?';
                
               
				
				callback(res,speech,returnContext,customData);

            } else if(selectedTime) {
				
                returnContext.push(
                    {
                        "name":"has-time", 
                        "lifespan":2, 
                        "parameters":{}
                    }                                
                );

                speech = 'Okay. On which date should I book the appointment?';
                
                
				
				callback(res,speech,returnContext,customData);

            } else {
                 returnContext.push(
                    {
                        "name":"has-nothing", 
                        "lifespan":2, 
                        "parameters":{}
                    }                                
                );

                speech = 'Okay. When do you want to book the appointment with ' + selectedDoctor.title + '?';
                
            
				 
				callback(res,speech,returnContext,customData);
            }




        }  else {
            speech = 'Please choose from following list of doctors: ';

            for (var doc of departmentWiseDoctorList) {
                docTitles.push[doc.title];
                
            }
			
			speech += docTitles.join(',');
			
			callback(res,speech,returnContext,customData);


        }

    } else {
        speech = 'Please choose from following list of doctors:';

        for (var doc of departmentWiseDoctorList) {
            docTitles.push[doc.title];           
        }
		speech += docTitles.join(',');
		
		callback(res,speech,returnContext,customData);

    }
    
}


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

