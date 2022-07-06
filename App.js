import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, SafeAreaView, Animated, Easing, PanResponder, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { mockup_messages } from './Messages';
import { Audio } from 'expo-av';
import React, { useEffect, useState, useRef } from 'react';
import { audio_mode } from './AudioConfigs';

/******************** LOGIC  ******************/
Audio.setAudioModeAsync(audio_mode)

const flask_ip = 'http://127.0.0.1:5001'

function fetchSummary(text) {
  return fetch(flask_ip + '/summarize', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'text': text,
    })
  })
}

function fetchTranscription(filename,uri) {
  if(filename != undefined){
    return fetch(flask_ip + '/transcribe', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'filename': filename,
      })
    })
  }else{
    return fetchTranscriptionFromBlob(uri['uri'])
  }
  
}

async function fetchTranscriptionFromBlob(uri_locater){
  console.log("filename : " + filename)
  let blob = await fetch(uri_locater).then(r => r.blob());
  var data = new FormData()
  data.append('file', blob)
  console.log(data['name'])
  return fetch(flask_ip + '/transcribe_blob', {
    method: 'POST',
    body:data
  })
}

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
  const scrollview_ref = useRef();

  const [messages, setMessages] = React.useState(mockup_messages);

  return( 
    <View style = {styles.container}>
      <TopBar/>
        <FlatList 
          ref = {scrollview_ref}
          style={styles.messagesContainer}
          data={messages}
          keyExtractor={(item, index) => index}
          renderItem={({item}) => <Message message = {item} scrollview_ref={scrollview_ref}/>}
        />
      <BottomBar message_list = {messages} message_list_changer={setMessages}/>
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
      <Microphone {...props}/>
    </View>
  )
}


/**
 * Microphone icon being able to record audio
 */
const Microphone = (props) => {
  const [recording, setRecording] = React.useState();

  async function startRecording() {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      }); 
      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
         Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );   
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri_locater = recording.getURI(); 
    
    console.log('Recording stopped and stored at', uri_locater)
    const filename = Date.now() + ".webm";
    let new_messagelist = [...props.message_list]
    new_messagelist.push({audio:{uri:uri_locater},uid:filename})
    props.message_list_changer(new_messagelist) //call the setMessages from the ChatMockup View, so it can update the List

    /*
    let blob = await fetch(uri_locater).then(r => r.blob());
    console.log(blob)
    console.log("starting fetching")
    fetchTest(blob)
      .then(async (response) => {console.log(response.json())})
      .catch((error) => console.error(error))
      */
      
  }

  return (
    <Icon name='mic' size={30} 
    style = {recording ? styles.mic_rec:styles.icon}
    onPress={recording ? stopRecording : startRecording}/>
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
  const [showTranscription, setShowTranscription] = useState(false)
  const [remainingTimeText, setRemainingTimeText] = useState()
  const [duration, setDuration] = useState(-1)
  const CIRCLE_RADIUS  = 25
  const [playAtPos, setPlayAtPos] = useState(-1) // if this is changed a useEffect hook skips in the voice message
  const [setToPos, setSetToPos] = useState(-1)
  const timestamp_ref = useRef()
  const [playAtMillis, setPlayAtMillis] = useState(-1)

  function timeToString(millis) {
    const minutes = Math.floor(millis / 60000)
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }

  const progressAnim = useRef(new Animated.Value(0)).current;  // also used for pan?

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        progressAnim.setOffset(progressAnim._value);
        props.scrollview_ref.current.setNativeProps({scrollEnabled: 'false'})  // disable scrolling while 'dragging the time'
      },
      onPanResponderMove: Animated.event(
        [
          null,
          {dx: progressAnim}
        ],
      ),
      onPanResponderRelease: (event, gestureState) => {
        props.scrollview_ref.current.setNativeProps({scrollEnabled: 'true'})
        progressAnim.flattenOffset();
        timestamp_ref.current.measure((fx, fy, w, h, px, py) => {setPlayAtPos(fx)})  // TODO: this probably isn't the way to go
      }
    })
  ).current;

  const set_time = async (setToMillis, duration) => {
    await sound.setPositionAsync(setToMillis)
    if (isPlaying) start_animation(setToMillis, duration)
  }

  useEffect(() => {
    console.log("PLAY AT TIME: " + playAtPos)
    if (playAtPos < 0 && playAtMillis < 0) return
    
    const setToMillis =  playAtMillis < 0 ? playAtPos/progressBarWidth * duration : playAtMillis
    set_time(setToMillis, duration)
    animate_to_time(setToMillis, duration)
    setPlayAtPos(-1)
    setPlayAtMillis(-1)
  }, [playAtPos, playAtMillis])

  const start_animation = (current, duration) => {
    Animated.timing(progressAnim, {
      toValue: progressBarWidth,
      duration: duration - current,
      easing: Easing.linear,
    }).start()
  }

  const stop_animation = () => {
    progressAnim.stopAnimation();
  }

  const animate_to_time = (current_time, duration) => {
    const position = current_time / duration * progressBarWidth
    progressAnim.setValue(position)
  }

  const reset_animation = () => {
    progressAnim.setValue(0)
  }
  
  const source = message.audio
  const initialStatus = {
    progressUpdateIntervalMillis: 1000,
    positionMillis: 0,  // TODO: change if it should start at another place
    rate: 1, 
  }
  const onPlaybackStatusUpdate = async (status) => {
    // TODO: maybe animations? Stopping if it is after a certain point (cutting)

    setIsPlaying(status.isPlaying)
    if (status.durationMillis > 0) {
      setDuration(status.durationMillis)
      //console.log("SETTING DURATION: " + duration)
    }
    setRemainingTimeText(timeToString(status.positionMillis == 0 && status.durationMillis ? status.durationMillis : status.positionMillis))   // durationMillis doesn't work on web... but on ios
    if (status.didJustFinish) {
      setIsFinishedPlaying(true)
      reset_animation()
    }
  }

  useEffect(() => {
    //console.log(isFinishedPlaying)
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
      setIsFinishedPlaying(false)
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
    <View>
      <View style = {styles.voiceMessage}>
        {
          isPlaying ?
          <Icon name = {'pause'} size = {30} style = {styles.icon} onPress={pause}/>
          : 
          <Icon name = {'play-arrow'} size = {30} style = {styles.icon} onPress={play}/>
        }
        <View style = {{flex: 1, height: 30, borderWidth: 0.5, justifyContent: 'center'}}
          onLayout = {({nativeEvent}) => {setProgressBarWidth(nativeEvent.layout.width - CIRCLE_RADIUS)}}>
          <Animated.View
            ref = {timestamp_ref}
            style = {{width: CIRCLE_RADIUS, height: CIRCLE_RADIUS, borderRadius: CIRCLE_RADIUS, backgroundColor: 'red', 
              transform:[{translateX: progressAnim.interpolate({
                inputRange: [0, progressBarWidth > 0 ? progressBarWidth : 100], // TODO: maybe a dirty workaround :o
                outputRange: [0, progressBarWidth > 0 ? progressBarWidth : 100],
                extrapolate: 'clamp'
              })}]
            }}
            {...panResponder.panHandlers}
          >

          </Animated.View>
        </View>
      </View>
      <View style = {{flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 50, alignItems: 'center'}}>
        <Text>{remainingTimeText}</Text>
        <Pressable 
          style = {styles.transcriptionPressable}
          onPress={() => {
            setShowTranscription(!showTranscription)
          }}>
            <Text>{showTranscription ? 'hide transcription' : 'show transcription'}</Text>
            <Icon name={showTranscription ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={15} style = {{marginLeft: 5}}/>
        </Pressable>
      </View>
      {
        showTranscription ? 
          <Transcription {...props} setPlayAtMillis = {setPlayAtMillis}/>
        :
          null
      }
    </View>
  )
}

const Transcription = (props) => {
  const [transcription, setTranscription] = useState()
  const [isLoading, setIsLoading] = useState(true)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState()

  useEffect(() => {
    if (!transcription)
      fetchTranscription(props.message.filename,props.message.audio,props.message.uid)
      .then(async (response) => {setTranscription(await response.json())})
      .then(() => {setIsLoading(false)})
      .catch((error) => console.error(error))
  }, [props.message.filename])

  useEffect(() => {
    if (transcription && showSummary && !summary) {
      fetchSummary(transcription.text)
      .then(async (response) => {setSummary(await response.json())})
      .then(() => {setIsLoading(false)})
      .catch((error) => console.error(error))
    }
  }, [transcription, showSummary])

  if (!transcription) 
    return (
      <Text>Loading replies ...</Text>
    )
  
  return (
    <View>
      <View style={{flexDirection: 'row', width: '100%'}}>
        <View style={styles.separator}/>
      </View>
      <Text style={styles.regularFont}>{showSummary && summary ? summary.summary : <TranscriptionWordwise {...props} transcription = {transcription}/>}</Text>
      <View style = {{flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20}}>
        <Pressable 
          style = {styles.transcriptionPressable}
          onPress={() => {
            setShowSummary(!showSummary)
          }}>
            <Text>{showSummary ? 'show original' : 'show summary'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const TranscriptionWordwise = (props) => {
  const words = props.transcription.words

  console.log(props.transcription.text)

  function toMillis(time_str) {
    const array = time_str.split(":")
    const milliseconds = parseInt(array[0] * 60 * 60, 10) + parseInt(array[1] * 60, 10) + parseFloat(array[2], 10) * 1000
    return milliseconds
  }

  return(
    <View style = {{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
      {
        words.map((word, index) => {
          const start_millis = toMillis(word.start_time)
          return <Pressable onPress = {() => {
            props.setPlayAtMillis(start_millis)
          }}><Text>{word.word + " "}</Text></Pressable>
        })
      }
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

  // Pressables
  transcriptionPressable : {
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'center',

    borderWidth:0.5,
    padding: 5,
    borderRadius: 5,
  },
  

  // Separator
  separator : {
    flex: 1,
    height: 0.5,
    margin: 20,
    backgroundColor: 'grey',
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
  mic_rec:{
    padding: 10,
    color:'green'
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
