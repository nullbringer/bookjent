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

        //chooseDoctor(preselectedDepartmentContext,timeManager,res,rootUrl);     
        
        
        var doctorCode = preselectedDepartmentContext.parameters['dept-doctors'];


        var preselectedDeptValue = preselectedDepartmentContext.parameters.department;                    

        var departmentWiseDoctorList = helper.getDoctorlistByDepartment(preselectedDeptValue);            


        var docTitles = [];	

        var selectedDoctor = helper.getDoctorByCode(doctorCode);
            
        
                   
        if ( Object.keys(selectedDoctor).length > 0) {
            

            if (selectedDoctor.department === preselectedDepartmentContext.parameters.department) {


                var selectedDate = preselectedDepartmentContext.parameters.date;
                var selectedTime = preselectedDepartmentContext.parameters.time;


                if(timeManager)
                {                    
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

                            return callback(res,speech,returnContext,customData);




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

                           return callback(res,speech,returnContext,customData);


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

                                    return callback(res,speech,returnContext,customData);
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

                                    return callback(res,speech,returnContext,customData);
                                }
                            });                        


                        }
                    }		
                    else
                    {
                        returnContext.push(
                            {
                                "name":"has-time", 
                                "lifespan":2, 
                                "parameters":{}
                            }                                
                        );
                        speech = 'We do not heal the past by dwelling there! 😜 \nPlease select a date in future';

                        return callback(res,speech,returnContext,customData);
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



                    return callback(res,speech,returnContext,customData);

                } else if(selectedTime) {

                    returnContext.push(
                        {
                            "name":"has-time", 
                            "lifespan":2, 
                            "parameters":{}
                        }                                
                    );

                    speech = 'Okay. On which date should I book the appointment?';



                    return callback(res,speech,returnContext,customData);

                } else {
                     returnContext.push(
                        {
                            "name":"has-nothing", 
                            "lifespan":2, 
                            "parameters":{}
                        }                                
                    );

                    speech = 'Okay. When do you want to book the appointment with ' + selectedDoctor.title + '?';


                    return callback(res,speech,returnContext,customData);
                }




            }  else {
                
                console.log('doctor - dept not matching!')
                
                speech = 'Please choose from following list of doctors: ';

                for (var doc of departmentWiseDoctorList) {
                    docTitles.push[doc.title];

                }

                speech += docTitles.join(',');

                return callback(res,speech,returnContext,customData);


            }

        } else {
            
            console.log('doctor not found!')
            
            speech = 'Please choose from following list of doctors:';

            for (var doc of departmentWiseDoctorList) {
                docTitles.push[doc.title];           
            }
            speech += docTitles.join(',');

            return callback(res,speech,returnContext,customData);

        }
        
        
    }


}