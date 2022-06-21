import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { mockup_messages } from './Messages';

export default function App() {
  return (
    <SafeAreaView style = {{flex: 1, backgroundColor: 'lightgrey'}}>
      <ChatMockup>
        <Text>Hey there!</Text>
      </ChatMockup>
    </SafeAreaView>
  );
}

/**
 *  Chat App Mockup
 */
const ChatMockup = (props) => {
  return( 
    <View style = {styles.container}>
      <TopBar/>
        <FlatList 
          style={styles.messagesContainer}
          data={mockup_messages}
          keyExtractor={(item, index) => index}
          renderItem={({item}) => <Message message = {item}/>}
        />
      <BottomBar/>
    </View>
  )
}

/**
 * 
 *  TopBar displaying a group chat etc
 */
const TopBar = (props) => {
  return(
    <View style={styles.topBar}>
      <Icon name='arrow-back-ios' size = {30} style = {styles.icon}/>
      <Icon name='group' size = {30} style = {styles.groupIcon}/>

      <View style={styles.groupTextContainer}>
        <Text style={styles.groupName} numberOfLines = {1}>CS Course 2022</Text>
        <Text stlye={styles.groupParticipants} numberOfLines = {1}>Nadia, Maurice, Rahul, Brian, Alex, Tim, John, Mary, Anna</Text>
      </View>

      <Icon name='video-call'  size = {30} style = {styles.icon}/>
      <Icon name='call'  size = {30} style = {styles.icon}/>
    </View>
  )
}

/**
 * BottomBar displaying TextInput, etc
 */
const BottomBar = (props) => {
  return(
    <View style={styles.bottomBar}>
      <Icon name='add'  size = {30} style = {styles.icon}/>
      <TextInput style = {styles.textInput} editable={false}/>
      <Icon name='photo-camera' size = {30} style = {styles.icon}/>
      <Icon name='mic' size = {30} style = {styles.icon}/>
    </View>
  )
}

/**
 * Message Component (incoming and outgoing)
 */
const Message = (props) => {
  const message = props.message

  return (
    <View style = {[styles.textMessage, message.sender != undefined ? styles.incomingMessage : styles.outgoingMessage]}>
        <SenderText {...props}/>
        {message.text == undefined ? <VoiceMessage {...props}/> : <TextMessage {...props}/>}
    </View>
  )
}

/**
 * VoiceMessage Component 
 */
const VoiceMessage = (props) => {
  const message = props.message 

  return (
    <View style = {styles.voiceMessage}>
      <Icon name = {'play-arrow'} size = {30} style = {styles.icon}/>
    </View>
  )
}

/**
 * TextMessage Component
 */
const TextMessage = (props) => {
  const message = props.message

  return (
    <Text style = {styles.regularFont}>
      {props.message.text}
    </Text>
  )
}

const SenderText = (props) => {
  if (props.message.sender != undefined) {
    return (
      <Text style = {styles.senderFont}>
        {props.message.sender}
      </Text>
    )
  } else return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // from left to right
    alignItems: 'center', // center vertically

    paddingHorizontal: 10,

    height: 80,
    width: '100%',

    backgroundColor: 'lightgrey',
  },

  messagesContainer: {
    flex:1, 
    backgroundColor: 'beige',
    padding: 5,
  },

  groupTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',

    padding: 10,
    margin: 10,
  },

  voiceMessage: {
    width: '100%',

    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  textMessage: {
    width: '80%',

    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
  },
  incomingMessage: {
    backgroundColor: '#c2c2c2',
    alignSelf: 'flex-start'
  },
  outgoingMessage: {
    backgroundColor: '#95b5e8',
    alignSelf: 'flex-end'
  },

  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',

    paddingHorizontal: 10,

    height: 80,
    width: '100%',

    backgroundColor: 'lightgrey',
  },

  textInput: {
    flex: 1,

    margin: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,

    borderWidth: 0.5,
    backgroundColor: 'lightgrey',
    borderRadius: 20,
  },
  

  // Icons
  icon: {
    padding: 10
  },
  groupIcon: {
    backgroundColor: 'grey',
    padding: 10,
    borderRadius: 40,  // padding + size = round
  },

  // Fonts
  regularFont: {
    fontSize: 15,
  },
  senderFont: {
    fontSize: 15,
    fontWeight: '500',
  },
  groupName: {
    fontSize: 17,
    fontWeight: '500',
  },
  groupParticipants: {
    fontSize: 15,
  },
});
