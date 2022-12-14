// Mock up of messages. If sender == undefined the message was sent by the user
// if text == undefined its a voice message
export const mockup_messages = [
    {
        sender: 'Alexander',
        text: 'When is the IUI Homework due?'
    },
    {
        sender: 'Nadia',
        text: 'Hey Alex, I think we have until Thursday 10pm. But I\'m not entirely sure. Can someone back me up?'
    },
    {
        text: 'Yeah, I think so too!'
    },
    {
        sender: 'Sven',
        // is a voice message therefore no text
        audio: require('./assets/voice_messages/1658058389100.wav'),
        filename: "1658058389100.wav",
        start_time: 0,
        stop_time: 20330,
    },
    // {
        // is a voice message therefore no text
        // audio: require('./assets/voice_messages/maurice_reply.wav'),
        // filename: 'maurice_reply.wav',
        // start_time: 5000,
        // stop_time: 8000,
    // }
]