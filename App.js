import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TextInput, SafeAreaView, Animated, Easing, PanResponder, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { mockup_messages } from './Messages';
import { Audio } from 'expo-av';
import React, { useEffect, useState, useRef } from 'react';
import { audio_mode } from './AudioConfigs';

/******************** LOGIC  ******************/
Audio.setAudioModeAsync(audio_mode)

const flask_ip = 'http://192.168.2.104:5000'  // SVEN: My local ip adress of flask (for using it on the phone)

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

function fetchTranscription(filename) {
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
}

/********************* UI *********************/

export default function App() {
  const [messages, setMessages] = useState(mockup_messages)

  return (
    <SafeAreaView style = {{flex: 1, backgroundColor: 'lightgrey'}}>
      <ChatMockup messages = {messages} setMessages = {setMessages}/>
    </SafeAreaView>
  );
}

/**
 *  Chat App Mockup
 */
const ChatMockup = (props) => {
  const scrollview_ref = useRef();

  return( 
    <View style = {styles.container}>
      <TopBar/>
        <FlatList 
          ref = {scrollview_ref}
          style={styles.messagesContainer}
          data={props.messages}
          keyExtractor={(item, index) => index}
          renderItem={({item}) => <Message message = {item} scrollview_ref={scrollview_ref} {...props}/>}
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
  const [isFinishedPlaying, setIsFinishedPlaying] = useState(true)  // also true before it is played
  const [progressBarWidth, setProgressBarWidth] = useState(-1)
  const [showTranscription, setShowTranscription] = useState(false)
  const [remainingTimeText, setRemainingTimeText] = useState()
  const CIRCLE_RADIUS  = 25
  const [playAtPos, setPlayAtPos] = useState(-1) // if this is changed a useEffect hook skips in the voice message
  const timestamp_ref = useRef()
  const [playAtMillis, setPlayAtMillis] = useState(-1)
  const messageIsCut = message.start_time || message.stop_time
  const [duration, setDuration] = useState(messageIsCut ? message.stop_time - message.start_time : -1)
  const [shouldStop, setShouldStop] = useState(false)


  function timeToString(millis) {
    const minutes = Math.floor(millis / 60000)
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }

  useEffect(() => {
    setDuration(messageIsCut ? message.stop_time - message.start_time : -1)
  }, [messageIsCut])
  

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

  const set_time = async (setToMillis, end_time) => {
    await sound.setPositionAsync(setToMillis)
    if (isPlaying) start_animation(setToMillis, end_time)
  }

  useEffect(() => {
    console.log("PLAY AT TIME: " + playAtPos)
    if (playAtPos < 0 && playAtMillis < 0) return


    let setToMillis =  playAtMillis < 0 && playAtPos >= 0 ? playAtPos/progressBarWidth * duration: playAtMillis
    if (message.start_time >= 0) setToMillis = setToMillis + message.start_time
    set_time(setToMillis, message.stop_time ? message.stop_time : duration)
    if (playAtMillis > 0) animate_to_time(setToMillis, duration)  // only do this when setting time with word-click
    setPlayAtPos(-1)
    setPlayAtMillis(-1)
  }, [playAtPos, playAtMillis])

  const start_animation = (current_time, end_time) => {
    Animated.timing(progressAnim, {
      toValue: progressBarWidth,
      duration: end_time - current_time,
      easing: Easing.linear,
    }).start()
  }

  const stop_animation = () => {
    progressAnim.stopAnimation();
  }

  const animate_to_time = (current_time, duration) => {
    const time = message.start_time ? current_time - message.start_time : current_time
    const position = time / duration * progressBarWidth
    progressAnim.setValue(position)
  }

  const reset_animation = () => {
    progressAnim.setValue(0)
  }
  
  const source = message.audio
  console.log(message.start_time)
  const initialStatus = {
    progressUpdateIntervalMillis: 500,  // TODO: maybe even less since this is responsible for stopping audio
    positionMillis: message.start_time ? message.start_time : 0,  // TODO: change if it should start at another place
    rate: 1, 
  }
  const onPlaybackStatusUpdate = async (status) => {
    // TODO: maybe animations? Stopping if it is after a certain point (cutting)
    if (status.positionMillis >= message.stop_time) {
      setShouldStop(true)
      setIsFinishedPlaying(true)
    }

    setIsPlaying(status.isPlaying)
    if (status.durationMillis > 0 && !messageIsCut) {
      setDuration(status.durationMillis)
      //console.log("SETTING DURATION: " + duration)
    }
    const isAtBeginning = (status.positionMillis == 0 || status.positionMillis == message.start_time)
    const current_time_str = timeToString(message.start_time ? status.positionMillis - message.start_time : status.positionMillis)
    const duration_str = timeToString(messageIsCut ? duration : status.durationMillis)
    setRemainingTimeText(isAtBeginning ? duration_str : current_time_str)   // durationMillis doesn't work on web... but on ios
    if (status.didJustFinish) {
      setIsFinishedPlaying(true)
      reset_animation()
    }
  }
  
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

    if(isFinishedPlaying) {
      load_sound()
      reset_animation()
      setIsFinishedPlaying(false)
    }
  }, [isFinishedPlaying])


  useEffect(() => {
    async function stop() {
      await sound.setStatusAsync({shouldPlay: false, positionMillis: message.start_time ? message.start_time : 0})
    }

    if (shouldStop) {
      stop()
      setShouldStop(false)
    }
  }, [shouldStop])


  async function play() {
    if (isFinishedPlaying && false) {
      await sound.replayAsync()
      if (message.start_time) await setPositionAsync(message.start_time)
      setIsFinishedPlaying(false)
    } else {
      await sound.playAsync()
      setIsFinishedPlaying(false)
    }
    const {positionMillis, durationMillis } = await sound.getStatusAsync()
    console.log("Status: " + duration > -1 ? duration : durationMillis)
    start_animation(positionMillis, message.stop_time ?  message.stop_time : durationMillis)
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
      fetchTranscription(props.message.filename)
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
      {
      showSummary && summary ?
        <Text style={styles.regularFont}>summary.summary</Text>
      :
        <TranscriptionWordwise {...props} transcription = {transcription}/>
      }
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
  const [selectionEndpoints, setSelectionEndpoints] = useState({first: -1, last: -1})
  const selectingWords = selectionEndpoints.first > -1 && selectionEndpoints.last > -1

  const words = props.transcription.words
  const [messages, setMessages] = [props.messages, props.setMessages]
  console.log(props.message)
  const messageIsCut = props.message.start_time && props.message.stop_time

  function toggleWordSelection(index) {
    let _selectionEndpoints = {...selectionEndpoints}
    if (selectingWords) {
      if (index === selectionEndpoints.first - 1) {
        _selectionEndpoints.first = index
      } else if (index === selectionEndpoints.last + 1) {
        _selectionEndpoints.last = index
      } else {
        if (index === selectionEndpoints.first) {
          _selectionEndpoints.first = index + 1
        } else if (index === selectionEndpoints.last) {
          _selectionEndpoints.last = index - 1
        }
        if (_selectionEndpoints.first > _selectionEndpoints.last) {
          _selectionEndpoints.first = -1
          _selectionEndpoints.last = -1
        }
      }
    } else {
      _selectionEndpoints.first = index
      _selectionEndpoints.last = index
    }
    console.log(_selectionEndpoints)
    setSelectionEndpoints(_selectionEndpoints)
  }

  function toMillis(time_str) {
    const array = time_str.split(":")
    const milliseconds = parseInt(array[0] * 60 * 60, 10) + parseInt(array[1] * 60, 10) + parseFloat(array[2], 10) * 1000
    return milliseconds
  }

  return(
      <View style = {{flex: 1, flexDirection: 'column'}}>
        <View style = {{flex: 1,flexDirection: 'row', flexWrap: 'wrap'}}>
          {
            words.map((word, index) => {
              const start_millis = toMillis(word.start_time)
              const isSelected = index >= selectionEndpoints.first && index <= selectionEndpoints.last
              const isSelectable = selectingWords && (index === selectionEndpoints.first-1 || index ===selectionEndpoints.last+1)

              const isInCut = !messageIsCut || (props.message.start_time <= toMillis(word.start_time) && props.message.stop_time >= toMillis(word.stop_time))

              console.log(messageIsCut)

              if (isInCut) 
                return ( 
                  <Pressable 
                    key = {index}
                    onPress = {() => {
                      if (isSelectable || selectingWords)  // TODO: vllt einschränken (z.B. is unSelectable)
                        toggleWordSelection(index)
                      else if (!selectingWords)
                        props.setPlayAtMillis(start_millis)
                    }}
                    onLongPress = {() => {
                      toggleWordSelection(index)
                    }}
                    style = {{backgroundColor: isSelected ? 'lightblue' : 'transparent'}}>
                      <Text style={styles.regularFont}>{word.word + " "}</Text>
                  </Pressable>
                )
            })
          }
        </View>
        {
        selectingWords ? 
          <Icon name="reply" size={30} style={{alignSelf: 'flex-end'}}
            onPress = {() => {
              let _messages = [...messages]
              let shortended_message = {...props.message}
              shortended_message.start_time = toMillis(words[selectionEndpoints.first].start_time)
              shortended_message.stop_time = toMillis(words[selectionEndpoints.last].stop_time)
              shortended_message.sender = undefined // TODO: mark as reply
              _messages.push(shortended_message)
              setMessages(_messages)
            }}/>
        :
          null
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
