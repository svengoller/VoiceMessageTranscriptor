import { StatusBar } from 'expo-status-bar';
import { COLORS, styles } from './Styling';
import {
  StyleSheet, Text, View, FlatList, KeyboardAvoidingView,
  TextInput, Platform, SafeAreaView, Animated, Easing, PanResponder, Pressable, Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { mockup_messages } from './Messages';
import { Audio } from 'expo-av';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { audio_mode, RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from './AudioConfigs';

/******************** LOGIC  ******************/
Audio.setAudioModeAsync(audio_mode)

const flask_ip = 'https://allesserver.de:8080'

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
    return fetchTranscriptionFromBlob(uri['uri'], uid)
  }

}

async function fetchTranscriptionFromBlob(uri, filename) {
  var data = new FormData()
  if (Platform.OS == 'ios') {
    //fetching the audio file for ios devices
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
    <SafeAreaView style={styles.container} >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}>
        <ChatMockup messages={messages} setMessages={setMessages} reply={reply} setReply={setReply}/>
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
      <Icon name='arrow-back-ios' size={20} style={styles.icon} />
      <View style={styles.groupIcon}><Icon name='group' size={30}/></View>

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
  const [replyText, setReplyText] = useState('')
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
    setReplyText('')
    Keyboard.dismiss()
  }

  function closeReply() {
    props.setReply(undefined)
    setReplyText('')
    Keyboard.dismiss()
  }

  return (
    <View style = {{backgroundColor: COLORS.background}}>
      {reply != undefined ? <ReplyComponent message={reply} closeReply={closeReply} /> : null}
      <View style={styles.bottomBar}>
        <Icon name='add' size={30} style={styles.icon} />
        <TextInput style={styles.textInput} editable={true} onChangeText={newText => setReplyText(newText)} value={replyText} />
        {replyText == '' ? <Microphone {...props} /> : <Icon name='send' size={30} style={styles.icon} onPress={sendText} />}
        <Icon name='photo-camera' size={30} style={styles.icon} />
      </View>
    </View>


  )
}

const ReplyComponent = (props) => {

  function closeReply() {
    props.closeReply()
  }

  return (
    <View style={{ width: '100%', padding: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: COLORS.incomingMessage }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5 }}>
        <SenderText {...props} />
        <Icon name={'close'} size={20} onPress={closeReply} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 5 }}>
        <Icon name={'mic'} size={20} style={{paddingRight: 5}}/>
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
  const CIRCLE_RADIUS = 25

  const message = props.message
  const duration = message.stop_time - message.start_time
  const [currentTime, setCurrentTime] = useState(message.start_time)

  const [sound, setSound] = useState()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinishedPlaying, setIsFinishedPlaying] = useState(true)  // also true before itx is played
  const [progressBarWidth, setProgressBarWidth] = useState(-1)
  const [showTranscription, setShowTranscription] = useState(false)
  const [remainingTimeText, setRemainingTimeText] = useState()
  const [playAtPos, setPlayAtPos] = useState(-1) // if this is changed a useEffect hook skips in the voice message
  const timestamp_ref = useRef()
  const [playAtMillis, setPlayAtMillis] = useState(-1)
  const [shouldStop, setShouldStop] = useState(false)
  const [bookmarks, setBookmarks] = useState([])


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
        timestamp_ref.current.measure((fx, fy, w, h, px, py) => {setPlayAtPos(fx)})
      }
    })
  ).current;

  const set_time = async (setToMillis, end_time) => {
    await sound.setPositionAsync(setToMillis)
    if (isPlaying) start_animation(setToMillis, end_time)
  }

  useEffect(() => {
    if (playAtPos < 0 && playAtMillis < 0) return

    let setToMillis = playAtMillis < 0 && playAtPos >= 0 ? playAtPos / progressBarWidth * duration : playAtMillis
    set_time(setToMillis, message.stop_time)
    if (playAtMillis >= 0) animate_to_time(setToMillis, duration)  // only doing this when setting time with word-click

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
    const time = current_time - message.start_time
    const position = time / duration * progressBarWidth
    progressAnim.setValue(position)
  }

  const reset_animation = () => {
    progressAnim.setValue(0)
  }

  const source = message.audio
  const initialStatus = {
    progressUpdateIntervalMillis: 100,
    positionMillis: message.start_time,
    rate: 1,
  }
  const onPlaybackStatusUpdate = async (status) => {
    setCurrentTime(status.positionMillis)
    // TODO: maybe animations? Stopping if it is after a certain point (cutting)
    if (status.positionMillis >= message.stop_time) {
      setShouldStop(true)
      setIsFinishedPlaying(true)
    }

    setIsPlaying(status.isPlaying)
    const isAtBeginning = (status.positionMillis == 0 || status.positionMillis == message.start_time)
    const current_time_str = timeToString(status.positionMillis - message.start_time)
    const duration_str = timeToString(duration)
    setRemainingTimeText(isAtBeginning ? duration_str : current_time_str) 
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
      await sound.setStatusAsync({ shouldPlay: false, positionMillis: message.start_time})
    }

    if (shouldStop) {
      stop()
      setShouldStop(false)
    }
  }, [shouldStop])


  async function play() {
    await sound.playAsync()
    setIsFinishedPlaying(false)

    const { positionMillis, durationMillis } = await sound.getStatusAsync()
    start_animation(positionMillis, message.stop_time ? message.stop_time : durationMillis)
  }

  async function pause() {
    stop_animation()
    await sound.pauseAsync()
  }

  return (
    <View>
      <View style={message.reply_to ? { backgroundColor: COLORS.incomingMessage, padding: 5, marginVertical: 10, borderRadius: 5 } : null}>
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
                const position = (word.start_millis - message.start_time) / duration * progressBarWidth
                
                function deleteBookmark(){
                  let _bookmarks = [...bookmarks]
                  _bookmarks.splice(index,1)
                  setBookmarks(_bookmarks)
                }

                return (
                  <Pressable 
                    hitSlop={{left: 5, right: 5}}  // increases hittable space
                    onPress={() => setPlayAtMillis(word.start_millis)} 
                    onLongPress={deleteBookmark}
                    key={index} 
                    style={{
                      position: 'absolute',
                      height: '100%',
                      width: 3,
                      left: position,
                      backgroundColor: 'orange',
                    }} 
                  />
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
        {
          showTranscription || true ?
            <Transcription bookmarks={bookmarks} setBookmarks={setBookmarks} {...props} playAtMillis={playAtMillis} setPlayAtMillis={setPlayAtMillis} currentTime={currentTime}/>
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
  const [transcription, setTranscription] = useState(false)
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
      <Text>loading transcription ...</Text>
    )


  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {
          showSummary && summary ?
            <Text style={styles.regularFont}>{summary.summary}</Text>
            :
            <TranscriptionWordwise {...props} transcription={transcription} showTranscriptionState = {[showTranscription, setShowTranscription]}/>
        }
        {/* <Icon name="keyboard-arrow-up" size={30} onPress={() => { setShowTranscription(!showTranscription); setShowSummary(false) }} /> */}
      </View>
      {props.message.reply_to || !showTranscription ? null :
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20 }}>
          <Pressable
            style={[styles.summaryPressable]}
            onPress={() => {
              setShowSummary(!showSummary)
            }}>
              
            <Icon name={showSummary ? 'expand' : 'compress'} size={20}  style={{ paddingRight: 5 }}/>
            <Text>{showSummary ? 'show original' : 'show summary'}</Text>
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
  const messageIsCut = props.message.start_time >= 0 && props.message.stop_time >= 0
  const [currentWord, setCurrentWord] = useState()
  const lyrics_ref = useRef()
  const [viewableWords, setViewableWords] = useState([])
  const [showTranscription, setShowTranscription] = props.showTranscriptionState

  const words_in_cut = words.filter((word) => {
    return !messageIsCut || (props.message.start_time <= word.start_time && props.message.stop_time >= word.stop_time)
  })

  useEffect(() => {
    // find out what word is currently spoken
    const newCurrentWord = words.find(word => word.start_time <= props.currentTime && props.currentTime < word.stop_time)
    if (newCurrentWord != undefined) setCurrentWord(newCurrentWord)
  }, [props.currentTime])

  useEffect(() => {
    if (viewableWords[viewableWords.length - 1] === currentWord || !viewableWords.includes(currentWord))
      lyrics_ref.current?.scrollToItem({animated: true,item: currentWord, viewPosition: 0.1})
  }, [currentWord])

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
    setSelectionEndpoints(_selectionEndpoints)
  }

  const handleViewableItemsChanges = useCallback(({changed, viewableItems})=> {
    setViewableWords(viewableItems.map((viewableItem, index) => viewableItem.item))
  }, [])

  const WordComponent = ({item, index}) => {
    const word = item
    const start_millis = word.start_time
    const isSelected = index >= selectionEndpoints.first && index <= selectionEndpoints.last
    const isSelectable = selectingWords && (index === selectionEndpoints.first - 1 || index === selectionEndpoints.last + 1)

    let isPlayed =false;
    if(words[index-1]==undefined){
      isPlayed = Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-words[index+1].start_time)
    }else if(words[index+1]==undefined){
      isPlayed = Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-words[index-1].start_time)
    }else{
      isPlayed = Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-words[index-1].start_time) || 
      Math.abs(props.playAtMillis-start_millis)< Math.abs(props.playAtMillis-words[index+1].start_time)
    }
      
    return (
      <Pressable
        key={index}
        onPress={() => {
          if (isSelectable || selectingWords)  // TODO: vllt einschränken (z.B. is unSelectable)
            toggleWordSelection(index)
          else if (!selectingWords) {
            props.setPlayAtMillis(start_millis)
          }
        }}
        onLongPress={() => {
          toggleWordSelection(index)
        }}
        style={{ backgroundColor: isSelected ? COLORS.highlight : 'transparent' }}>
        <Text style={{fontSize:15, color: word === currentWord ? 'black' : 'black', fontWeight: word === currentWord ? 'normal' : 'normal'}}>{word.word + " "}</Text>
      </Pressable>
    )
  }

  return (
    <View style={{flex: 1, flexDirection: 'column'}}>
    <View style = {{flex: 1, flexDirection: 'row'}}>
      {showTranscription ? 
        <View style={{flex: 1,flexDirection: 'row', flexWrap: 'wrap'}}>
          {words_in_cut.map((item, index) => WordComponent({item, index}))}
        </View>
      :
        <FlatList
          onScrollToIndexFailed={() => {}}
          onViewableItemsChanged={handleViewableItemsChanges}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 100
          }}
          ref = {lyrics_ref}
          data = {words_in_cut}
          horizontal = {true}
          showsHorizontalScrollIndicator={false}
          keyExtractor = {(item, index) => index}
          renderItem = {WordComponent}
        />
      }
      {viewableWords.at(-1) === words_in_cut.at(-1) && viewableWords.at(0) === words_in_cut.at(0) ? null : 
        <Icon name={showTranscription ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={15} style = {{marginLeft: 5}} onPress={() => setShowTranscription(!showTranscription)}/>
      } 
      <View>
      </View>
    </View>
    {
        selectingWords ?
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderRadius: 5, marginVertical: 10 }}>
            <Pressable
              style={[styles.highlighedPressables]}
              onPress={() => {
                  let shortended_message = {...props.message}
                  shortended_message.reply_to = props.message.sender ? props.message.sender : 'Me'
                  shortended_message.shortened_transcription_text = concatWords()  // TODO: remove this ugly workaround
                  shortended_message.start_time = words[selectionEndpoints.first].start_time
                  shortended_message.stop_time = words[selectionEndpoints.last].stop_time
                  shortended_message.sender = undefined // TODO: mark as reply
                  setSelectionEndpoints({ first: -1, last: -1 })
                  setReply(shortended_message)
                }} >
              <Icon name="reply" size={20} style={{ paddingRight: 5}}/>
              <Text>Reply</Text>
            </Pressable>

            <Pressable 
              style={styles.highlighedPressables}
              onPress={() => {
              let _bookmarks = [...props.bookmarks]
              let word = words[selectionEndpoints.first]
              word.start_millis = word.start_time
              _bookmarks.push(word)
              setSelectionEndpoints({ first: -1, last: -1 })
              props.setBookmarks(_bookmarks)
            }}>
             <Icon name='bookmark' size={20} style={{ paddingRight: 5 }}/>
             <Text>Bookmark</Text>
            </Pressable>

            <Pressable 
              style={styles.highlighedPressables}
              onPress={() => {
                setSelectionEndpoints({ first: -1, last: -1 })
              }}>
             <Icon name='cancel' size={20}  style={{ paddingRight: 5 }}/>
             <Text>Cancel</Text>
            </Pressable>
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
  if (props.message.sender != undefined || props.message.reply_to != undefined) 
    return (
      <Text style={styles.senderFont}>
        {props.message.reply_to ? "Reply to: " + props.message.reply_to : props.message.sender}
      </Text>
    )
    
  return <View/> 
  // return (
  //   <Text style={styles.senderFont}>Me: </Text>
  // )
}

