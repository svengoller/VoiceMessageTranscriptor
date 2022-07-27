import json
from sunau import AUDIO_FILE_ENCODING_ALAW_8, AUDIO_FILE_ENCODING_LINEAR_16, AUDIO_FILE_ENCODING_LINEAR_32
import requests
import shelve
import requests
import filecmp
import glob
import os
import datetime
import shelve
from google.cloud import speech
from flask import Flask, request
from flask_cors import CORS, cross_origin

# Google Authentication/API
# os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = # path to google api key json
# api_key =  # Ai21 Api Key



app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

######### methods ###########################################################
def summarize(text):
    print("trying to summarize")
    with shelve.open("ai21_generic_replies_storage.db", "c") as db:
        with  open("summarization_template3.txt", "r") as f1:
            yn_template= f1.read()
        if not (text in db):
            print("NOT IN DB")
            response = requests.post("https://api.ai21.com/studio/v1/j1-jumbo/complete",
                                    headers={"Authorization": "Bearer "+api_key},
                                    json={
                                        "prompt": yn_template + text + "\nsummary:",
                                        "numResults": 1,
                                        "maxTokens": 49,
                                        "temperature": 0.1,
                                        "topKReturn": 0,
                                        "topP": 1,
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
        data = response.json()
        res_text = data['completions'][0]['data']['text']
        if (res_text[0] == ' '): res_text = res_text[1:]
        print("Summary: " + res_text)
        return res_text


def speech_to_text_local_audio(config, audio):
    print('starting speech to text')
    with shelve.open("speech_to_text_db.db", "c") as db:
        if not (audio in db):
            print("NOT IN DB")
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
        print(response.results)
        transcription=""
        list = []
        for i, result in enumerate(response.results):
            alternative = result.alternatives[0]
            transcription = alternative.transcript
            list = []
            for i, word in enumerate(alternative.words):
                list.append({
                    "word": word.word, 
                    "confidence": word.confidence, 
                    "start_time": word.start_time.total_seconds()*1000, 
                    "stop_time": word.end_time.total_seconds()*1000
                }) 
        return {'text': transcription, 'words': list}

######### api #################################################################
@app.route('/summarize', methods = ['POST'])
@cross_origin()
def summarize_api():
    text = request.get_json(force = True)['text']
    summary = summarize(text)
    response = json.dumps({"original":text, "summary":summary})
    return response


@app.route('/transcribe', methods = ['POST'])
@cross_origin()
def speech_to_text_api():
    print('transcribing...')
    audio = "data/" + request.get_json(force = True)['filename']
    transcription_dict = speech_to_text_local_audio(config_wav2, audio)
    return json.dumps(transcription_dict, default=str)


@app.route('/transcribe_blob',methods = ['POST'])
@cross_origin()
def test(): 
    current_date_and_time = datetime.datetime.now()
    current_date_and_time_string = str(current_date_and_time)
    file = request.files['file']
    filename = "data/"+ file.filename
    file.save(filename)
    file_split = file.filename.split(".")
    config = config_webm
    if file_split[-1]=='wav':
        config = config_wav2
    transcription_dict = speech_to_text_local_audio(config,filename)
    print("transcription: " + transcription_dict['text'])
    return json.dumps(transcription_dict, default=str)


config_wav = speech.RecognitionConfig(sample_rate_hertz=48000,
                                      enable_automatic_punctuation=True,
                                      language_code='en-US',
                                      audio_channel_count=1,
                                      enable_word_time_offsets=True,
                                      enable_word_confidence=True
                                      )

config_wav2 = speech.RecognitionConfig(sample_rate_hertz=48000,
                                        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                                      enable_automatic_punctuation=True,
                                      language_code='en-US',
                                      audio_channel_count=1,
                                      enable_word_time_offsets=True,
                                      enable_word_confidence=True
                                      )


config_webm = speech.RecognitionConfig(sample_rate_hertz=48000,
                                      enable_automatic_punctuation=True,
                                      language_code='en-US',
                                      audio_channel_count=1,
                                      enable_word_time_offsets=True,
                                      enable_word_confidence=True
                                      )
    

if __name__ == "__main__":
    app.run(debug=True, port=5001, host='0.0.0.0')


"""
response = speech_to_text_local_audio(config_wav, "data/shortaudio.wav")
print("audio transcription : " + response["transcription"])
print("summary: " + summarize(response["transcription"]))
"""