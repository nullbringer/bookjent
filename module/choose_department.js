const fs = require('fs');
const masterDepartmentList = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const masterDoctorList = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));

var helper = require('./helper.js');

module.exports = {
    
    
    getResponse: function(requestBody,rootUrl,res,callback) {

        var speech = '';
        var returnContext = [];
        var customData = [];

        var requestedDepartment = helper.getDepartmentByCode(requestBody.result.parameters.department); 
        var doctorForDept = helper.getDoctorlistByDepartment(requestBody.result.parameters.department);            
  

        var doctorNames = [];
        
        doctorForDept.forEach(function(doc){            
            doctorNames.push(doc.title);

        });             

        if(doctorNames.length){

            speech = 'Available doctors from ' + requestedDepartment.title + ' department are: ' + doctorNames.join(','); 

            /* facebook specific starts */                                                

            customData = {
                "facebook": [                                
                    {
                        "text": "Available doctors from " + requestedDepartment.title + " department are: "
                    },                                
                    {
                        "attachment":{
                          "type":"template",
                          "payload":{
                            "template_type":"generic",
                            "elements":[]
                          }
                        }                                                                       
                    }]
            };


            doctorForDept.forEach(function(doc){                           

                var el = {

                    "title": doc.title,
                    "image_url": rootUrl + "/images/" + doc.image,
                    "subtitle": helper.getDepartmentNameByCode(doc.department),
                    "buttons": [
                      {
                        "type": "postback",
                        "title": "Choose " + doc.title,
                        "payload": doc.title
                      }              
                    ]      
                  };

                customData.facebook[1].attachment.payload.elements.push(el);                       

            });    


            /* facebook specific ends */     


            var preselectedDepartmentContext = helper.getContextByName(requestBody.result.contexts,'getdoctorsbydepartment-followup');
            var timeManager = helper.getContextByName(requestBody.result.contexts,'time-manager');


            var selectedDate = preselectedDepartmentContext.parameters.date;
            var selectedTime = preselectedDepartmentContext.parameters.time;


            if(timeManager) {
                
                selectedDate = selectedDate || timeManager.parameters.stack_date;
                selectedTime = selectedTime || timeManager.parameters.stack_time;

            }


             returnContext = [{ 
                    "name":"time-manager", 
                    "lifespan":5, 
                    "parameters":{
                        "stack_date":selectedDate,
                        "stack_time":selectedTime
                    }
            }];                                                

        } else {
            
            speech = 'No doctors are available for ' + requestedDepartment.title;
        }  

        return callback(res,speech,returnContext,customData);
                    

    }

    
    
};