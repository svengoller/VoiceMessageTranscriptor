// Mock up of messages. If sender == undefined the message was sent by the user
// if text == undefined its a voice message
export const mockup_messages = [
    {
        sender: 'Alex',
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
        sender: 'Brian'
        // is a voice message therefore no text
    },
    {
        
    }
]