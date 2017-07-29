const fs = require('fs');
const masterDepartmentList = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const masterDoctorList = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));

const moment = require('moment');

var helper = require('./helper.js');



module.exports = {
    
    
    getResponse: function(db,requestBody,rootUrl,res,callback) {
        
        var speech = '';
        var returnContext = [];
        var customData = [];        
        
        var preselectedDepartmentContext = helper.getContextByName(requestBody.result.contexts,'getdoctorsbydepartment-followup');
        var timeManager = helper.getContextByName(requestBody.result.contexts,'time-manager'); 
        
                  
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


        db.collection('meeting_default').insertOne(newMeeting, function(err, doc) {

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

            return callback(res,speech,returnContext,customData);
        });
        
        
        
    }
}