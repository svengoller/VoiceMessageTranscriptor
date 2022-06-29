import json
import requests
import re
import shelve
from collections.abc import Mapping
import requests
import os
import shelve
from google.cloud import speech_v1 as speech
from flask import Flask,request
from flask_cors import CORS, cross_origin

# Google Authentication/API
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = ***REMOVED***
api_key = ***REMOVED***  # Ai21 Api Key



app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


######### api #################################################################

@app.route('/test_func', methods = ['POST'])
@cross_origin()
def test_func():
    text = request.get_json(force = True)['text']
    return json.dumps({"text":"helllllo"})


@app.route('/summarize', methods = ['POST'])
@cross_origin()
def summarize():
    text = request.get_json(force = True)['text']
    db = shelve.open("ai21_generic_replies_storage.db")
    with  open("summarization_template.txt", "r") as f1:
        yn_template= f1.read()
    print("template: " + str(type(yn_template)))
    if not (text in db):
        response = requests.post("https://api.ai21.com/studio/v1/j1-jumbo/complete",
                                 headers={"Authorization": "Bearer "+api_key},
                                 json={
                                     "prompt": yn_template + text + "\nsummary:",
                                     "numResults": 1,
                                     "maxTokens": 49,
                                     "temperature": 0.4,
                                     "topKReturn": 0,
                                     "topP": 0.98,
                                     "countPenalty": {
                                         "scale": 0,
                                         "applyToNumbers": False,
                                         "applyToPunctuations": False,
                                         "applyToStopwords": False,
                                         "applyToWhitespaces": False,
                                         "applyToEmojis": False
                                     },
                                     "frequencyPenalty": {
                                         "scale": 0,
                                         "applyToNumbers": False,
                                         "applyToPunctuations": False,
                                         "applyToStopwords": False,
                                         "applyToWhitespaces": False,
                                         "applyToEmojis": False
                                     },
                                     "presencePenalty": {
                                         "scale": 0,
                                         "applyToNumbers": False,
                                         "applyToPunctuations": False,
                                         "applyToStopwords": False,
                                         "applyToWhitespaces": False,
                                         "applyToEmojis": False
                                     },
                                     "stopSequences": ["---"]
                                 }
                                 )

        db[text] = response
    else:
        response = db[text]
    db.close()
    data = response.json()
    res_text = data['completions'][0]['data']['text']
    return json.dumps({"original":text, "summarization":res_text})


@app.route('/transcribe', methods = ['POST'])
@cross_origin()
def speech_to_text_local_audio(config, audio):
    db = shelve.open("speech_to_text_replies_storage.db")
    if not (audio in db):
        client = speech.SpeechClient()
        with open(audio, 'rb') as f1:
            byte_data = f1.read()
        audio_wav = speech.RecognitionAudio(content=byte_data)
        response = client.recognize(config=config,
                                    audio=audio_wav)
        db[audio] = response
    else:
        response = db[audio]
    db.close()
    for i, result in enumerate(response.results):
        alternative = result.alternatives[0]
        transcription = alternative.transcript
        list = []
        for i, word in enumerate(alternative.words):
            list.append(
                {"word": word.word, "confidence": word.confidence, "time": word.start_time})

    return json.dumps({"transcription": transcription, "words": list})

"""
config_wav = speech.RecognitionConfig(sample_rate_hertz=48000,
                                      enable_automatic_punctuation=True,
                                      language_code='en-US',
                                      audio_channel_count=2,
                                      enable_word_time_offsets=True,
                                      enable_word_confidence=True
                                      )

response = speech_to_text_local_audio(config_wav, "data/shortaudio.wav")
print("audio transcription : " + response["transcription"])
print("summary: " + summarize(response["transcription"]))
"""