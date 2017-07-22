
## Bookjent

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Webhook implementation for a pseudo-intelligent booking assistant. Powered by Api.ai.
> Since this is a POC, it's rough around the edges. But it tinkers with the powerful features API.ai provides and can be used as a starting point before undertaking a more serious approach.


## Installation

1) Open an api.ai account and import the zip.
2) deploy this project on Heroku.
3) Go to fulfilment tab in Api.ai console and put Heroku webhook url.
4) Go to Integration tab. You can check the basic flow in Web Demo or integrate Facbook Messenger.

## Screenshots

![alt text](https://raw.githubusercontent.com/urbangeek/bookjent/master/public/images/screenshot.png "Bookjent Screenshot")


## Layers
#### Bot UI 
Whatever end users see. The same bot can cater different UI like Facebook Messenger, KiK, Slack, twitter etc. All of them got different design implementation. Here, we have covered FB messenger only.
#### Bot backend
API.ai generates and deploys integration for popular channels like Actions On Google, Messenger etc. The source code is also available on Github.
#### API.ai agent 
The export is included here (bookjent.zip)
#### Webhook implementation
Included
#### Database
Powered by mLab
