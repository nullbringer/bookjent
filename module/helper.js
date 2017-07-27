const fs = require('fs');
const masterDepartmentList = JSON.parse(fs.readFileSync('data/departments.json', 'utf8'));
const masterDoctorList = JSON.parse(fs.readFileSync('data/doctors.json', 'utf8'));


module.exports = {
    
    
    getDepartmentNameByCode: function(code) {

        var fiteredDepartmentList = masterDepartmentList.filter(function(dept){
            return (dept.value === code);
        });
        
        if(fiteredDepartmentList.length) {            
            return fiteredDepartmentList[0].title;            
        }
        
        return;

    },
    
    getDepartmentByCode: function(code) {

        var fiteredDepartmentList = masterDepartmentList.filter(function(dept){
            return (dept.value === code);
        });
        
        if(fiteredDepartmentList.length) {            
            return fiteredDepartmentList[0];            
        }
        
        return;

    },
    
    getDoctorByCode: function(docCode){
    
        var filteredDoctorList = masterDoctorList.filter(function(doc){
            return (doc.value === docCode);
        });
        
        if(filteredDoctorList.length){
            return filteredDoctorList[0];
        }
        
        return;
    
    },
    
    getDoctorlistByDepartment: function(dept){
    
        var filteredDoctorList = masterDoctorList.filter(function(doc){
            return (doc.department === dept);
        });
                    
        return filteredDoctorList;
    
    },
    
    
    
    getContextByName: function(contextList,contextToFind){
        

        var filteredContextList = contextList.filter(function(context){
            return context.name === contextToFind;
        });


        if(filteredContextList.length){
            return filteredContextList[0];
        }

        return;
    
    }

    
    
};