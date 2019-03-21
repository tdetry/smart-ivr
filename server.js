const express = require('express')
const dialogflow = require('dialogflow')
const VoiceResponse = require('twilio').twiml.VoiceResponse
const morgan = require('morgan')
const bodyParser = require('body-parser')

const app = express()

const port = process.env.PORT
const projectId = process.env.GCLOUD_PROJECT

// Loggin
app.use(morgan('combined'))

// Body parsing
app.use(bodyParser.urlencoded({
    extended: true
}));

// Dialogflow integration
async function getAnswer(query, userId, type) {
  
      // A unique identifier for the given session based on phone number -to be encrypted..
      const sessionId = userId;
    
      // Create a new session
      const sessionClient = new dialogflow.SessionsClient()
      const sessionPath = sessionClient.sessionPath(projectId, sessionId)
    
      // Dialogflow request
      let request = {
        session: sessionPath,
        queryInput: {},
      };

      // Type text
      if (type === 'text') {
        request.queryInput.text = {
          text: query,
          languageCode: 'en-US',
        };
      // Type event
      } else {
        request.queryInput.event = {
          name: query,
          languageCode: 'en-US',
        };
      }
    
      // Send request
      const responses = await sessionClient.detectIntent(request)
      
      return responses[0].queryResult
}

app.get('/twilio/hook', async (req, res, next) => {
  try { 

    const { body } = req
    let answer

    // Check if we received transcript or if it's start of conversation.
    if (body.CallStatus === 'ringing') { 
        // Query Dialogflow
        answer = await getAnswer('Welcome', body.From, 'event')
    } else { 
        answer = await getAnswer(body.SpeechResult, body.From, 'text')
    }

    // Prepare Twilio response (Twiml gather)
    const response = new VoiceResponse()
    const gather = response.gather({
        input: 'speech',
    });
    gather.say(answer.fulfillmentText)

    // Send response to Twilio
    res.type('text/xml')
    res.status(200)
      .send(response.toString())
      .end();

  } catch (error) { 
    return next(error)
  }
})

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found')
})

// Basic error handler
app.use((err, req, res, next) => {
  res.status(500).send(err.message || 'Something broke!')
})

// Start application
app.listen(port, () => console.log(`App listening on port ${port}!`))