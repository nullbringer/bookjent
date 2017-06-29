'use strict';

const express = require('express');
const bodyParser = require('body-parser');


const restService = express();
restService.use(bodyParser.json());

restService.post('/hook', function (req, res) {

    console.log('hook request');

    try {
        var speech = 'empty speech';

        if (req.body) {
            var requestBody = req.body;

            if (requestBody.result) {
                speech = '';
                
                
                switch(requestBody.result.parameters.department){
                        
                    case 'Cardiology':
                            speech = 'Cardiology Doctors: Dipanik, Moumita';
                            break;
                    case 'Paediatrics':
                            speech = 'Paediatrics Doctors: Avinash, Anindita';
                            break;
                    case 'Neurology':
                            speech = 'Neurology Doctors: Taiseef, Sutrishna';
                            break;
                            
                    default:
                            speech = 'General Doctors: Biswajit';
                }
                            
                                  

              /*  if (requestBody.result.fulfillment) {
                    speech += requestBody.result.fulfillment.speech;
                    speech += ' ';
                }*/

                if (requestBody.result.action) {
                    speech += 'action: ' + requestBody.result.action;
                }
                                
                
            }
        }

        console.log('result: ', speech);

        return res.json({
            speech: speech,
            displayText: speech,
            source: 'bookjent'
        });
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

restService.listen((process.env.PORT || 5000), function () {
    console.log("Server listening");
});