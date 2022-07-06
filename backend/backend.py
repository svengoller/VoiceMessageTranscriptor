import json
import requests
import shelve
import requests
import os
import shelve
from google.cloud import speech
from flask import Flask, request
from flask_cors import CORS, cross_origin

# Google Authentication/API
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = ***REMOVED***
api_key = ***REMOVED***  # Ai21 Api Key



app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

######### methods ###########################################################
def summarize(text):
    with shelve.open("ai21_generic_replies_storage", "c") as db:
        with  open("summarization_template.txt", "r") as f1:
            yn_template= f1.read()
        if not (text in db):
            print("not in database")
            response = requests.post("https://api.ai21.com/studio/v1/j1-jumbo/complete",
                                    headers={"Authorization": "Bearer "+api_key},
                                    json={
                                        "prompt": yn_template + text + "\nsummary:",
                                        "numResults": 1,
                                        "maxTokens": 49,
                                        "temperature": 0.3,
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
        print(res_text)
        return res_text


def speech_to_text_local_audio(config, audio):
    print('starting speech to text')
    with shelve.open("speech_to_text_db", "c") as db:
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
        for i, result in enumerate(response.results):
            alternative = result.alternatives[0]
            transcription = alternative.transcript
            list = []
            for i, word in enumerate(alternative.words):
                list.append({"word": word.word, "confidence": word.confidence, "start_time": word.start_time, "stop_time": word.end_time})  # start isn't json serializable
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
    audio = "data/" + request.get_json(force = True)['filename']
    transcription_dict = speech_to_text_local_audio(config_wav, audio)
    return json.dumps(transcription_dict, default=str)


config_wav = speech.RecognitionConfig(sample_rate_hertz=48000,
                                      enable_automatic_punctuation=True,
                                      language_code='en-US',
                                      audio_channel_count=1,
                                      enable_word_time_offsets=True,
                                      enable_word_confidence=True
                                      )
    

if __name__ == "__main__":
    app.run(debug=True, port=5000)


"""
response = speech_to_text_local_audio(config_wav, "data/shortaudio.wav")
print("audio transcription : " + response["transcription"])
print("summary: " + summarize(response["transcription"]))
"""