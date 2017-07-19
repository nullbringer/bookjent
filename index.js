'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mongodb = require("mongodb");
const moment = require('moment');


const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const departments = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const doctors = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));
var ObjectID = mongodb.ObjectID;
const MEETING_COLLECTION = 'meeting_default';


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
                    speech = 'Hi there!'
                    
                    
                    /* facebook specific starts */

                    customData = {
                        "facebook": {
                            "text": 'Hi there! If you want to book an appointment, choose a department to proceed: \n'+
                                    '-------------- \n'                                                                        
                          }
                    };

                    
                    departments.forEach(function(dept){
                        customData.facebook.text += dept.title + '\n';          
                        
                    });
                    
                    
                    callback(res,speech,returnContext,customData);
                    
                    break;
                    
                    
                case 'input.unknown':
                    console.log('Fired: input.unknown');
                    speech = "I'm afraid I don't understand.";
                    
                    
                    /* facebook specific starts */

                    customData = {
                        "facebook": {
                            "text": "I'm afraid I don't understand! If you want to book an appointment, choose a department to proceed: \n"+
                                    "-------------- \n"                                                                       
                          }
                    };

                    
                    departments.forEach(function(dept){
                        customData.facebook.text += dept.title + '\n';          
                        
                    });
                    
                    
                    callback(res,speech,returnContext,customData);
                    
                    break;
                    
                    
                case 'search.doctorsByDepartment':
                    
                    /*  searching doctors by department */
                    
                    console.log('Fired: search.doctorsByDepartment');
            
                    

                    var requestedDepartment = departments.filter(function(dept){
                        return (dept.value === requestBody.result.parameters.department);
                    });


                    var doctorForDept = doctors.filter(function(doc){
                        return (doc.department === requestBody.result.parameters.department);
                    });   

                    var doctorNames = [];
                    var doctorObjList = [];
                    doctorForDept.forEach(function(doc){
                        doctorObjList.push(doc);
                        doctorNames.push(doc.title);

                    });             

                    if(doctorNames){

                        speech = 'Available doctors from ' + requestedDepartment[0].title + ' department are: ' + doctorNames.join(','); 
                        
                        /* facebook specific starts */
                        
                       /* customData = {
                            "facebook": {
                                "text": 'Available doctors from ' + requestedDepartment[0].title + ' department are:\n '+
                                        '---------- \n'                                                                        
                              }
                        };
                        
                        
                        doctorNames.forEach(function(docNanme){
                            customData.facebook.text += docNanme + '\n';                            

                        });*/      
                                                
                        
                        var  customData = {
                            "facebook": [                                
                                {
                                    "text": "Available doctors from ' + requestedDepartment[0].title + ' department are: "
                                },                                
                                {
                                    "attachment":{
                                      "type":"template",
                                      "payload":{
                                        "template_type":"generic",
                                        "elements":[

                                        ]
                                      }
                                    }                                                                       
                                }]
                        };
                        
                        
                        doctorObjList.forEach(function(doc){                           
                            
                            var el = {
                                "title":doc.title,
                                "image_url":rootUrl + "/images/"+ doc.image,
                                "subtitle":getDepartmentNameByCode(doc.department),

                                "buttons":[
                                  {
                                    "type":"postback",
                                    "title":"Choose " + doc.title,
                                    "payload":doc.title
                                  }              
                                ]      
                              };
                            
                            customData.facebook[1].attachment.payload.elements.push(el);                       

                        });
                                                
                        /* facebook specific starts */
                                                

                    } else {
                        speech = 'No doctors are available for ' + requestedDepartment[0].title;
                    }  
                    
                    callback(res,speech,returnContext,customData);
                    
                    
                    break;
                    
                case 'choose.doctor':
                    
                    /*  choosing doctor from selected department */
                    
                    
                    console.log('Fired: choose.doctor');
                   
                    
                    var preselectedDepartmentContext = requestBody.result.contexts.filter(function(context){
                        return context.name === 'getdoctorsbydepartment-followup';
                    })[0];
                    
                    chooseDoctor(preselectedDepartmentContext,res,rootUrl);
                    
                    break;
                    
                case 'choose.doctor.confirm':
                    
                    console.log('Fired: choose.doctor.confirm');
                                        
                    var preselectedDepartmentContext = requestBody.result.contexts.filter(function(context){
                        return context.name === 'getdoctorsbydepartment-followup';
                    })[0];
                    
                    insertMeeting(preselectedDepartmentContext,res);                   
                                        
                    
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
        
        doctors.forEach(function(doc){         
             
            
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


function getDepartmentNameByCode(deptcode){
     var department = departments.filter(function(dept){
                        return (dept.value === deptcode);
                    })[0].title;
    return department;
    
}


function getDoctorByCode(docCode){
     var doctor = doctors.filter(function(doc){
                        return (doc.value === docCode);
                    })[0];
    return doctor;
    
}

function chooseDoctor(preselectedDepartmentContext, res,rootUrl){
    
    var speech = '';
    var returnContext = [];
    var customData = [];
    
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
				
				var meetingStartDateTime = moment(selectedDate + " " + selectedTime);						

				var startDate = new Date(selectedDate);

				if( meetingStartDateTime.isAfter(new Date())) {
                    
                    // book appointment only in future

					if( startDate.getDay() == 6 || startDate.getDay() == 0 ) {
                        
                        //if weekend
                        
                        returnContext = [{ 
							"name":"has-time", 
							"lifespan":2, 
							"parameters":{}
						}];
						speech = 'Hey no service on weekends! Please choose a weekday!';
						
						callback(res,speech,returnContext,customData);
                        



					} else if(moment(selectedTime, 'hh:mm:s').isBefore(moment('10:00:00', 'hh:mm:s')) || 
                              moment(selectedTime, 'hh:mm:s').isAfter(moment('18:00:00', 'hh:mm:s'))) {
                        
                        //if out of office hour

                        returnContext = [{ 
                            "name":"has-date", 
                            "lifespan":2, 
                            "parameters":{}
                        }];
                        speech = 'We are avaible 10am - 6pm only. Please book time in business hours only.';

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
								returnContext = [{
								"name":"has-date-time", 
								"lifespan":2, 
								"parameters":{}
								}];
								speech = 'Booking appointment with ' + selectedDoctor.title + ' on '+ meetingStartDateTime.format("MMMM Do, h:mm a") + ' Do you confirm?';	
								
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
								returnContext = [{ 
								"name":"has-nothing", 
								"lifespan":2, 
								"parameters":{}
								}];
								speech = selectedDoctor.title + ' already booked on ' + meetingStartDateTime.format("MMMM Do, h:mm a") + '. Please choose a different time.'; 
								
								callback(res,speech,returnContext,customData);
							}
						});                        
                        

					}
				}		
				else
				{
					returnContext = [{ 
						"name":"has-nothing", 
						"lifespan":2, 
						"parameters":{}
					}];
					speech = 'Time selected is past! Please select a valid one..';
					
					callback(res,speech,returnContext,customData);
				}



			} else if(selectedDate) {
				
                returnContext = [{
                    "name":"has-date", 
                    "lifespan":2, 
                    "parameters":{}
                }];

                speech = 'Thanks for choosing ' + selectedDoctor.title + '. What is the best time that will work for you?';
                
                //customData = setCustomDataForChooseDoctor(selectedDoctor,rootUrl);
				
				callback(res,speech,returnContext,customData);

            } else if(selectedTime) {
				
                returnContext = [{
                    "name":"has-time", 
                    "lifespan":2, 
                    "parameters":{}
                }];

                speech = 'Thanks for choosing ' + selectedDoctor.title + '. On which date should I book the appointment?';
                
                //customData = setCustomDataForChooseDoctor(selectedDoctor,rootUrl);
				
				callback(res,speech,returnContext,customData);

            } else {
                returnContext = [{
                    "name":"has-nothing", 
                    "lifespan":2, 
                    "parameters":{}
                }];

                speech = 'Thanks for choosing ' + selectedDoctor.title + '. When do you want to book the appointment?';
                
                //customData = setCustomDataForChooseDoctor(selectedDoctor,rootUrl);
				 
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

/*function setCustomDataForChooseDoctor(selectedDoctor, rootUrl){
    
    
    var  customData = {
        "facebook": {
            "attachment":{
              "type":"template",
              "payload":{
                "template_type":"generic",
                "elements":[
                   {
                    "title":selectedDoctor.title,
                    "image_url":rootUrl + "/images/"+ selectedDoctor.image,
                    "subtitle":"What is the best time that will work for you?",

                    "buttons":[
                      {
                        "type":"web_url",
                        "url":"https://xxx.xxx",
                        "title":"View Portfolio"
                      }              
                    ]      
                  }
                ]
              }
            }                                                                       
        }
    };
    
    return customData;
    
    
    
}*/


function insertMeeting(preselectedDepartmentContext, res){
    
    var speech = '';
    var returnContext = [];
    var customData = [];
    
    var selectedDate = preselectedDepartmentContext.parameters.date || preselectedDepartmentContext.parameters.deptDate;
    var selectedTime = preselectedDepartmentContext.parameters.time || preselectedDepartmentContext.parameters.deptTime;

    var timeArr = selectedTime.split(':');
    var dateTime = moment(selectedDate);
    dateTime = dateTime.set({
       'hour' : timeArr[0],
       'minute'  : timeArr[1],
       'second' : timeArr[2]
    });


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
        
            var  customData = {
                "facebook": [
                    {
                        "attachment":{
                          "type":"template",
                          "payload":{
                            "template_type":"generic",
                            "elements":[
                               {
                                "title":getDoctorByCode(newMeeting.doctor_name).title,
                                "image_url":rootUrl + "/images/"+ getDoctorByCode(newMeeting.doctor_name).image,
                                "subtitle":dateTime.format("MMMM Do YYYY, h:mm a"),

                                "buttons":[
                                  {
                                    "type":"web_url",
                                    "url":"https://xxx.xxx",
                                    "title":"View Portfolio"
                                  }              
                                ]      
                              }
                            ]
                          }
                        }                                                                       
                    },
                    {
                        "text": "Thanks for booking the appointment! See you!"
                    }
                ]
            };
        
        
        
        
        
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

