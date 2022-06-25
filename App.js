import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, SafeAreaView, Animated, Easing, PanResponder} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { mockup_messages } from './Messages';
import { Audio } from 'expo-av';
import React, { useEffect, useState, useRef } from 'react';
import { audio_mode } from './AudioConfigs';

/******************** LOGIC  ******************/
Audio.setAudioModeAsync(audio_mode)

/********************* UI *********************/

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
  const [sound, setSound] = useState()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinishedPlaying, setIsFinishedPlaying] = useState(false)
  const [progressBarWidth, setProgressBarWidth] = useState(-1)

  const progressAnim = useRef(new Animated.Value(0)).current;  // also used for pan?

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        progressAnim.setOffset(progressAnim._value);
      },
      onPanResponderMove: Animated.event(
        [
          null,
          {dx: progressAnim}
        ]
      ),
      onPanResponderRelease: () => {
        progressAnim.flattenOffset();
      }
    })
  ).current;


  const start_animation = (current, duration) => {
    Animated.timing(progressAnim, {
      toValue: progressBarWidth,
      duration: duration - current,
      easing: Easing.linear
    }).start()
  }

  const stop_animation = () => {
    progressAnim.stopAnimation();
  }

  const reset_animation = () => {
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 0,
      easing: Easing.linear
    }).start()
  }
  
  const source = message.audio
  const initialStatus = {
    progressUpdateIntervalMillis: 1000,
    positionMillis: 0,  // TODO: change if it should start at another place
    rate: 1, 
  }
  const onPlaybackStatusUpdate = (status) => {
    // TODO: maybe animations? Stopping if it is after a certain point (cutting)

    setIsPlaying(status.isPlaying)
    if (status.didJustFinish) {
      setIsFinishedPlaying(true)
      reset_animation()
    }
    if (status.isPlaying && isFinishedPlaying) setIsFinishedPlaying(false)
  }

  useEffect(() => {
    console.log(isFinishedPlaying)
  }, [isFinishedPlaying])
  
  useEffect(() => {
    const load_sound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        source,
        initialStatus,
        onPlaybackStatusUpdate,
        //downloadFirst  // defaults to true
      )
      setSound(sound)
    }

    load_sound()
  }, [])

  async function play() {
    if (isFinishedPlaying) {
      await sound.replayAsync()
    } else {
      await sound.playAsync()
    }
    const {positionMillis, durationMillis } = await sound.getStatusAsync()
    start_animation(positionMillis, durationMillis)
  }

  async function pause() {
    stop_animation()
    await sound.pauseAsync()
  }

  return (
    <View style = {styles.voiceMessage}>
      {
        isPlaying ?
        <Icon name = {'pause'} size = {30} style = {styles.icon} onPress={pause}/>
        : 
        <Icon name = {'play-arrow'} size = {30} style = {styles.icon} onPress={play}/>
      }
      <View style = {{flex: 1, height: 30, borderWidth: 0.5, justifyContent: 'center'}}
        onLayout = {({nativeEvent}) => {setProgressBarWidth(nativeEvent.layout.width)}}>
        <Animated.View 
          style = {{width: 25, height: 25, borderRadius: 25, backgroundColor: 'red', transform:[{translateX: progressAnim}]}}
          {...panResponder.panHandlers}
        >

        </Animated.View>
      </View>
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
