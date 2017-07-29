const fs = require('fs');
const masterDepartmentList = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));

module.exports = {
    
    
    sayHello: function(res,callback) {

        var speech = 'Hi there!';
        var returnContext = [];
        var customData = [];


        /* facebook specific starts */

        var customData = {
            "facebook": {
                "text": "Hi there! I'm Eve 💁 your friendly booking guide. Choose a department to proceed: \n"+
                "-------------- \n"                                                                
            }
        };


        masterDepartmentList.forEach(function(dept){
            customData.facebook.text += dept.title + '\n';          

        });


        return callback(res,speech,returnContext,customData);

    }

    
    
};