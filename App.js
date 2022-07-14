import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, FlatList, KeyboardAvoidingView,
  TextInput, Platform, SafeAreaView, Animated, Easing, PanResponder, Pressable, Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { mockup_messages } from './Messages';
import { Audio } from 'expo-av';
import React, { useEffect, useState, useRef } from 'react';
import { audio_mode } from './AudioConfigs';

/******************** LOGIC  ******************/
Audio.setAudioModeAsync(audio_mode)

const flask_ip = 'http://192.168.2.111:5001'  // SVEN: My local ip adress of flask (for using it on the phone)

const RECORDING_OPTIONS_PRESET_HIGH_QUALITY = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
    sampleRate: 48000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

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

function fetchTranscription(filename, uri, uid) {
  if (filename != undefined) {
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
  } else {
    console.log("uri:" + uri['uri'])
    return fetchTranscriptionFromBlob(uri['uri'], uid)
  }

}

async function fetchTranscriptionFromBlob(uri, filename) {
  var data = new FormData()
  if (Platform.OS == 'ios') {
    //fetching the audio file for ios devices
    console.log("uri: " + uri)
    data.append('file', {
      uri,
      type: "audio/wav",
      name: filename
    });
  } else {
    //assuming that if the Platform is not ios, it is web
    let blob = await fetch(uri).then(r => r.blob());
    data.append('file', blob, filename)
  }
  console.log(uri)
  return fetch(flask_ip + '/transcribe_blob', {
    method: 'POST',
    body: data
  })
}

/********************* UI *********************/

export default function App() {
  const [messages, setMessages] = useState(mockup_messages)
  const [reply, setReply] = useState(undefined)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'lightgrey' }} >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}>
        <ChatMockup messages={messages} setMessages={setMessages} reply={reply} setReply={setReply} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 *  Chat App Mockup
 */
const ChatMockup = (props) => {
  const scrollview_ref = useRef();

  return (
    <View style={styles.container}>
      <TopBar />
      <FlatList
        ref={scrollview_ref}
        style={styles.messagesContainer}
        data={props.messages}
        keyExtractor={(item, index) => index}
        renderItem={({ item }) => <Message message={item} scrollview_ref={scrollview_ref} {...props} />}
      />
      <BottomBar {...props} />
    </View>
  )
}

/**
 * 
 *  TopBar displaying a group chat etc
 */
const TopBar = (props) => {
  return (
    <View style={styles.topBar}>
      <Icon name='arrow-back-ios' size={30} style={styles.icon} />
      <Icon name='group' size={30} style={styles.groupIcon} />

      <View style={styles.groupTextContainer}>
        <Text style={styles.groupName} numberOfLines={1}>CS Course 2022</Text>
        <Text stlye={styles.groupParticipants} numberOfLines={1}>Nadia, Maurice, Rahul, Brian, Alex, Tim, John, Mary, Anna</Text>
      </View>

      <Icon name='video-call' size={30} style={styles.icon} />
      <Icon name='call' size={30} style={styles.icon} />
    </View>
  )
}

/**
 * BottomBar displaying TextInput, etc
 */
const BottomBar = (props) => {
  const [replyText, setText] = useState('')
  const [messages, setMessages] = [props.messages, props.setMessages]
  let reply = props.reply

  function sendText() {
    let _messages = [...messages]
    if (reply != undefined) {
      reply.reply_text = replyText;
      _messages.push(reply)
      props.setReply(undefined)
    } else {
      _messages.push({ text: replyText })
    }
    setMessages(_messages)
    setText('')
    Keyboard.dismiss()
  }

  function closeReply() {
    props.setReply(undefined)
    setText('')
    Keyboard.dismiss()
  }

  return (
    <View >
      {reply != undefined ? <ReplyComponent message={reply} closeReply={closeReply} /> : null}
      <View style={styles.bottomBar}>
        <Icon name='add' size={30} style={styles.icon} />
        <TextInput style={styles.textInput} editable={true} onChangeText={newText => setText(newText)} value={replyText} />
        {replyText == '' ? <Microphone {...props} /> : <Icon name='send' size={30} style={styles.icon} onPress={sendText} />}
        <Icon name='photo-camera' size={30} style={styles.icon} />
      </View>
    </View>


  )
}

const ReplyComponent = (props) => {

  function play() {

  }

  function closeReply() {
    props.closeReply()
  }
  return (
    <View style={{ width: '100%', padding: 10, borderRadius: 10, backgroundColor: '#c2c2c2' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SenderText {...props} />
        <Icon name={'close'} size={25} onPress={closeReply} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
        <Icon name={'play-arrow'} size={25} onPress={play} />
        <Text numberOfLines={1} style={[{ flex: 1 }, styles.regularFont]}>{props.message.shortened_transcription_text}</Text>
      </View>
    </View>

  )
}


/**
 * Microphone icon being able to record audio
 */
const Microphone = (props) => {
  const [recording, setRecording] = useState();
  const [timer, setTimer] = useState();

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
        RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );

      setTimer(Date.now())
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
    console.log('Stopping recording..');
    setRecording(undefined);
    const timer_stop = Date.now()
    await recording.stopAndUnloadAsync();
    const uri_locater = recording.getURI();

    let filename = Date.now() + ".wav";
    if (Platform.OS != 'ios') {
      filename = Date.now() + ".webm";
    }
    let new_messagelist = [...props.messages]
    new_messagelist.push({
      audio: { uri: uri_locater },
      uid: filename,
      start_time: 0,
      stop_time: timer_stop - timer
    })
    props.setMessages(new_messagelist) //call the setMessages from the ChatMockup View, so it can update the List


  }

  return (
    <Icon name='mic' size={30}
      style={recording ? styles.mic_rec : styles.icon}
      onPress={recording ? stopRecording : startRecording} />
  )
}


/**
 * Message Component (incoming and outgoing)
 */
const Message = (props) => {
  const message = props.message

  return (
    <View style={[styles.textMessage, message.sender != undefined ? styles.incomingMessage : styles.outgoingMessage]}>
      <SenderText {...props} />
      {message.text == undefined ? <VoiceMessage {...props} /> : <TextMessage {...props} />}
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
  const [isFinishedPlaying, setIsFinishedPlaying] = useState(true)  // also true before itx is played
  const [progressBarWidth, setProgressBarWidth] = useState(-1)
  const [showTranscription, setShowTranscription] = useState(false)
  const [remainingTimeText, setRemainingTimeText] = useState()
  const CIRCLE_RADIUS = 25
  const [playAtPos, setPlayAtPos] = useState(-1) // if this is changed a useEffect hook skips in the voice message
  const timestamp_ref = useRef()
  const [playAtMillis, setPlayAtMillis] = useState(-1)
  const messageIsCut = message.start_time || message.stop_time
  const [duration, setDuration] = useState(message.stop_time - message.start_time)
  const [shouldStop, setShouldStop] = useState(false)
  const [bookmarks, setBookmarks] = useState([])


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
        props.scrollview_ref.current.setNativeProps({ scrollEnabled: 'false' })  // disable scrolling while 'dragging the time'
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: progressAnim }
        ], { useNativeDriver: false }
      ),
      onPanResponderRelease: (event, gestureState) => {
        props.scrollview_ref.current.setNativeProps({ scrollEnabled: 'true' })
        progressAnim.flattenOffset();
        timestamp_ref.current.measure((fx, fy, w, h, px, py) => { setPlayAtPos(fx) })  // TODO: this probably isn't the way to go
      }
    })
  ).current;

  const set_time = async (setToMillis, end_time) => {
    await sound.setPositionAsync(setToMillis)
    if (isPlaying) start_animation(setToMillis, end_time)
  }

  useEffect(() => {
    if (playAtPos < 0 && playAtMillis < 0) return

    console.log("PLAYING AT MILLIS: " + playAtMillis)
    let setToMillis = playAtMillis < 0 && playAtPos >= 0 ? playAtPos / progressBarWidth * duration : playAtMillis
    if (message.start_time >= 0) setToMillis = setToMillis // + message.start_time
    set_time(setToMillis, message.stop_time ? message.stop_time : duration)
    if (playAtMillis >= 0) animate_to_time(setToMillis, duration)  // only do this when setting time with word-click
    setPlayAtPos(-1)
    setPlayAtMillis(-1)
  }, [playAtPos, playAtMillis])

  const start_animation = (current_time, end_time) => {
    Animated.timing(progressAnim, {
      toValue: progressBarWidth,
      duration: end_time - current_time,
      easing: Easing.linear,
      useNativeDriver: false
    }).start()
  }

  const stop_animation = () => {
    progressAnim.stopAnimation();
  }

  const animate_to_time = (current_time, duration) => {
    const time = message.start_time >= 0 ? current_time - message.start_time : current_time
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

    if (isFinishedPlaying) {
      load_sound()
      reset_animation()
      setIsFinishedPlaying(false)
    }
  }, [isFinishedPlaying])


  useEffect(() => {
    async function stop() {
      await sound.setStatusAsync({ shouldPlay: false, positionMillis: message.start_time ? message.start_time : 0 })
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

    const { positionMillis, durationMillis } = await sound.getStatusAsync()
    console.log("Message: " + message.stop_time)
    start_animation(positionMillis, message.stop_time ? message.stop_time : durationMillis)
  }

  async function pause() {
    stop_animation()
    await sound.pauseAsync()
  }

  return (
    <View>
      <View style={message.reply_to ? { backgroundColor: 'lightgrey', padding: 5, marginVertical: 10, borderRadius: 5 } : null}>
        <View style={styles.voiceMessage}>
          {
            isPlaying ?
              <Icon name={'pause'} size={30} style={styles.icon} onPress={pause} />
              :
              <Icon name={'play-arrow'} size={30} style={styles.icon} onPress={play} />
          }
          <View style={{ flex: 1, height: 30, borderWidth: 0, borderRadius: 25, justifyContent: 'center' }}
            onLayout={({ nativeEvent }) => { setProgressBarWidth(nativeEvent.layout.width - CIRCLE_RADIUS / 3) }}>
            <View style={{ borderWidth: 0.5, top: CIRCLE_RADIUS / 2, width: '100%' }} >
            </View>

            {
              bookmarks.map((word, index) => {
                let percent = "" + (Math.round((word.start_millis / duration) * 100, 2)) + "%";
                
                function deleteBookmark(){
                  let _bookmarks = [...bookmarks]
                  _bookmarks.splice(index,1)
                  setBookmarks(_bookmarks)
                }

                return (
                  <Pressable onPress={() => setPlayAtMillis(word.start_millis)} 
                    onLongPress={deleteBookmark}
                  key={index} style={{
                    position: 'absolute',
                    height: '100%',
                    width: 3,
                    left: percent,
                    backgroundColor: 'orange',
                  }} />
                )
              })
            }
            <Animated.View
              ref={timestamp_ref}
              style={{
                width: CIRCLE_RADIUS / 3, height: CIRCLE_RADIUS, borderRadius: CIRCLE_RADIUS, backgroundColor: 'red',
                transform: [{
                  translateX: progressAnim.interpolate({
                    inputRange: [0, progressBarWidth > 0 ? progressBarWidth : 100], // TODO: maybe a dirty workaround :o
                    outputRange: [0, progressBarWidth > 0 ? progressBarWidth : 100],
                    extrapolate: 'clamp'
                  })
                }]
              }}
              {...panResponder.panHandlers}
            >

            </Animated.View>
          </View>
          <Text style={{ paddingLeft: 10 }}>{remainingTimeText}</Text>
        </View>
        {/* <View style = {{flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: 50, alignItems: 'center'}}>
          <Pressable 
            style = {styles.transcriptionPressable}
            onPress={() => {
              setShowTranscription(!showTranscription)
            }}>
              <Text>{showTranscription ? 'hide transcription' : 'show transcription'}</Text>
              <Icon name={showTranscription ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={15} style = {{marginLeft: 5}}/>
          </Pressable>
        </View> */}
        {
          showTranscription || true ?
            <Transcription bookmarks={bookmarks} setBookmarks={setBookmarks} {...props} playAtMillis={playAtMillis}setPlayAtMillis={setPlayAtMillis} />
            :
            null
        }
      </View>
      <View>
        {
          message.reply_to != undefined ?
            <View>
              <Text style={styles.regularFont}>{message.reply_text}</Text>
            </View>
            :
            null
        }
      </View>
    </View>
  )
}

const Transcription = (props) => {
  const [showTranscription, setShowTranscription] = useState(false)
  const [transcription, setTranscription] = useState()
  const [isLoading, setIsLoading] = useState(true)
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState()

  useEffect(() => {
    if (!transcription)
      fetchTranscription(props.message.filename, props.message.audio, props.message.uid)
        .then(async (response) => { setTranscription(await response.json()) })
        .then(() => { setIsLoading(false) })
        .catch((error) => console.error(error))
  }, [props.message.filename])

  useEffect(() => {
    if (transcription && showSummary && !summary) {
      fetchSummary(transcription.text)
        .then(async (response) => { setSummary(await response.json()) })
        .then(() => { setIsLoading(false) })
        .catch((error) => console.error(error))
    }
  }, [transcription, showSummary])

  if (!transcription)
    return (
      <Text>Loading replies ...</Text>
    )

  if (!showTranscription)
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text numberOfLines={1} style={[styles.regularFont]}>{props.message.shortened_transcription_text ? props.message.shortened_transcription_text : transcription.text}</Text>
        <Icon name="keyboard-arrow-down" size={30} onPress={() => { setShowTranscription(!showTranscription) }} />
      </View>
    )


  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {
          showSummary && summary ?
            <Text style={styles.regularFont}>{summary.summary}</Text>
            :
            <TranscriptionWordwise {...props} transcription={transcription} />
        }
        <Icon name="keyboard-arrow-up" size={30} onPress={() => { setShowTranscription(!showTranscription); setShowSummary(false) }} />
      </View>
      {props.message.reply_to ? null :
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20 }}>
          <Pressable
            style={styles.transcriptionPressable}
            onPress={() => {
              setShowSummary(!showSummary)
            }}>
            <Text>{showSummary ? 'showx original' : 'show summary'}</Text>
          </Pressable>
        </View>
      }
    </View>
  )
}

const TranscriptionWordwise = (props) => {
  const [selectionEndpoints, setSelectionEndpoints] = useState({ first: -1, last: -1 })
  const selectingWords = selectionEndpoints.first > -1 && selectionEndpoints.last > -1

  const words = props.transcription.words
  const [messages, setMessages] = [props.messages, props.setMessages]
  const [reply, setReply] = [props.reply, props.setReply]
  console.log(props.message)
  const messageIsCut = props.message.start_time >= 0 && props.message.stop_time >= 0

  function concatWords() {
    let text = ''
    for (const x of Array(selectionEndpoints.last - selectionEndpoints.first + 1).keys()) {
      const i = x + selectionEndpoints.first
      text = text + ' ' + words[i].word
    }
    return text
  }

  function toggleWordSelection(index) {
    let _selectionEndpoints = { ...selectionEndpoints }
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

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {
          words.map((word, index) => {
            const start_millis = toMillis(word.start_time)
            const isSelected = index >= selectionEndpoints.first && index <= selectionEndpoints.last
            const isSelectable = selectingWords && (index === selectionEndpoints.first - 1 || index === selectionEndpoints.last + 1)
            const isInCut = !messageIsCut || (props.message.start_time <= toMillis(word.start_time) && props.message.stop_time >= toMillis(word.stop_time))

            let isPlayed =false;
            console.log("playmillis")
            console.log(props.playAtMillis)
            if(words[index-1]==undefined){
              isPlayed = Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-toMillis(words[index+1].start_time))
            }else if(words[index+1]==undefined){
              isPlayed = Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-toMillis(words[index-1].start_time))
            }else{
              isPlayed = Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-toMillis(words[index-1].start_time)) || 
              Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-toMillis(words[index+1].start_time))
            }
            //console.log(messageIsCut)

            if (isInCut)
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    if (isSelectable || selectingWords)  // TODO: vllt einschränken (z.B. is unSelectable)
                      toggleWordSelection(index)
                    else if (!selectingWords)
                      props.setPlayAtMillis(start_millis)
                  }}
                  onLongPress={() => {
                    toggleWordSelection(index)
                  }}
                  style={{ backgroundColor: isSelected ? 'lightblue' : 'transparent' }}>
                  <Text style={{fontSize:15,color: 'black'}}>{word.word + " "}</Text>
                </Pressable>
              )
          })
        }
      </View>
      {
        selectingWords ?
          <View style={{ flexDirection: 'row-reverse' }}>
            <Icon name="reply" size={30} style={{ alignSelf: 'flex-end' }}
              onPress={() => {
                setSelectionEndpoints({ first: -1, last: -1 })
                let shortended_message = { ...props.message }
                console.log("messages: ")
                console.log(props.messages)
                shortended_message.reply_to = props.message.sender
                shortended_message.shortened_transcription_text = concatWords()  // TODO: remove this ugly workaround
                shortended_message.start_time = toMillis(words[selectionEndpoints.first].start_time)
                shortended_message.stop_time = toMillis(words[selectionEndpoints.last].stop_time)
                shortended_message.sender = undefined // TODO: mark as reply
                setReply(shortended_message)
              }} />
            <Icon name='bookmark' size={30} style={{ alignSelf: 'flex-end' }} onPress={() => {
              setSelectionEndpoints({ first: -1, last: -1 })
              let _bookmarks = [...props.bookmarks]
              console.log("bookmarks")
              console.log(_bookmarks)
              let word = words[selectionEndpoints.first]
              word.start_millis = toMillis(word.start_time)
              _bookmarks.push(word)
              props.setBookmarks(_bookmarks)
            }}></Icon>
          </View>
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
    <Text style={styles.regularFont}>
      {props.message.text}
    </Text>
  )
}

const SenderText = (props) => {
  if (props.message.sender != undefined || props.message.reply_to != undefined) {
    return (
      <Text style={styles.senderFont}>
        {props.message.reply_to ? "Reply to: " + props.message.reply_to : props.message.sender}
      </Text>
    )
  } else return (
    <Text style={styles.senderFont}>Me: </Text>)
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

  replyTextInput: {
    backgroundColor: 'lightgrey',
    flexDirection: 'row',
    padding: 10,

    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  messagesContainer: {
    flex: 1,
    backgroundColor: 'beige',
    padding: 5
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

    backgroundColor: 'white',
  },

  textInput: {
    flex: 1,

    margin: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,

    borderWidth: 0.5,
    backgroundColor: 'white',
    borderRadius: 20,
  },

  // Pressables
  transcriptionPressable: {
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 0.5,
    padding: 5,
    borderRadius: 5,
  },


  // Separator
  separator: {
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
  mic_rec: {
    padding: 10,
    color: 'green'
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
