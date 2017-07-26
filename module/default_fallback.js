const fs = require('fs');
const masterDepartmentList = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));

module.exports = {
    
    
    showFallback: function(res,callback) {

        var  speech = '';
        var returnContext = [];
        var customData = [];


        speech = "I'm afraid I don't understand.";                    
                    
        /* facebook specific starts */

        customData = {
            "facebook": {
                "text": "I'm afraid I don't understand! If you want to book an appointment, choose a department to proceed: \n"+
                        "-------------- \n"                                                                       
              }
        };


        masterDepartmentList.forEach(function(dept){
            customData.facebook.text += dept.title + '\n';          

        });


        callback(res,speech,returnContext,customData);

    }

    
    
};