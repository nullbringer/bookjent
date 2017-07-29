/* NOT USED */


const fs = require('fs');
const mongodb = require("mongodb");
const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));

module.exports = {
    
    
     createConnction: function(res,callback) {
    
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

        });
         
     }
    
    
};