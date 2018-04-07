from __future__ import print_function

import boto3
from decimal import Decimal
import json
import urllib
import traceback
from contextlib import closing
import time

print('Loading function')

rekognition = boto3.client('rekognition')
polly = boto3.client('polly')
s3 = boto3.resource('s3')
s3Client = boto3.client('s3')
translate = boto3.client("translate")

# --------------- Helper Functions to call Rekognition APIs ------------------


def detect_faces(bucket, key):
    response = rekognition.detect_faces(Image={"S3Object": {"Bucket": bucket, "Name": key}}, Attributes=["ALL"])
    return response


def detect_labels(bucket, key):
    response = rekognition.detect_labels(Image={"S3Object": {"Bucket": bucket, "Name": key}})
    return response
    
def detect_text(bucket, key):
    response = rekognition.detect_text(Image={"S3Object": {"Bucket": bucket, "Name": key}})

    # Sample code to write response to DynamoDB table 'MyTable' with 'PK' as Primary Key.
    # Note: role used for executing this Lambda function should have write access to the table.
    #table = boto3.resource('dynamodb').Table('MyTable')
    #labels = [{'Confidence': Decimal(str(label_prediction['Confidence'])), 'Name': label_prediction['Name']} for label_prediction in response['Labels']]
    #table.put_item(Item={'PK': key, 'Labels': labels})
    return response


def outputAudio(inputText, bucket, key, type):
    print("InsideOutputAudio")
    if type == "translated":
        audioResponse = polly.synthesize_speech(OutputFormat="mp3", SampleRate='8000', Text=inputText, VoiceId="Enrique")
    else:
        audioResponse = polly.synthesize_speech(OutputFormat="mp3", SampleRate='8000', Text=inputText, VoiceId="Joanna")
    print(audioResponse)
    if "AudioStream" in audioResponse:
        with closing(audioResponse["AudioStream"]) as stream:
            data = stream.read()
            if type == "translated":
                results = s3.Bucket(bucket).put_object(Body=data, ContentType="audio/mpeg", StorageClass="STANDARD", Key=str(key).split("/")[1] +"Translated.mp3", ACL='public-read')
            else:
                results = s3.Bucket(bucket).put_object(Body=data, ContentType="audio/mpeg", StorageClass="STANDARD", Key=str(key).split("/")[1] +".mp3", ACL='public-read')
            print(results)
            return results
    else:
        return "ERROR"
        
def outputTranslation(inputText, bucket, key):
    translationResponse = translate.translate_text(Text=inputText, SourceLanguageCode="en", TargetLanguageCode="es")
    if "TranslatedText" in translationResponse:
        translatedText = translationResponse["TranslatedText"]
        some_binary_data = translatedText.encode('utf-8')
        s3.Object(bucket, str(key).split("/")[1] + 'Translated.txt').put(Body=some_binary_data)
        return translatedText


# --------------- Main handler ------------------


def lambda_handler(event, context):
    '''Demonstrates S3 trigger that uses
    Rekognition APIs to detect faces, labels and index faces in S3 Object.
    '''
    #print("Received event: " + json.dumps(event, indent=2))

    # Get the object from the event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.unquote_plus(event['Records'][0]['s3']['object']['key'].encode('utf8'))
    print(bucket)
    print(key)
    textLines = ""
    combinedText = ""
    labelText = ""
    try:
        # Calls rekognition DetectFaces API to detect faces in S3 object
        response = detect_text(bucket, key)
        labels = detect_labels(bucket, key)
        faces = detect_faces(bucket, key)
        print("faces are")
        print(faces)
        validFaces = []
        if len(faces['FaceDetails']) > 0:
            for item in faces['FaceDetails']:
                valFace = {}
                if float(item['Confidence']) > float(95):
                    if float(item['Gender']['Confidence']) > float(95):
                        valFace['gender'] = item['Gender']['Value']
                    else:
                        valFace['gender'] = "Unknown Gender"
                    
                    for emotion in item['Emotions']:
                        if float(emotion['Confidence']) > float(90):
                            valFace['emotion'] = emotion['Type']
                        else:
                            valFace['emotion'] = "Unknown Emotion"
                    
                    valFace['ageRange'] = str(item['AgeRange']['Low']) + "-" + str(item['AgeRange']['High'])
                    validFaces.append(valFace)
            if len(validFaces) > 0:
                labelTextFace = "This picture contains: "
                for entry in validFaces:
                    count = 0
                    if count == (len(validFaces)-1):
                        if len(validFaces) == 1:
                            labelTextFace += ", and a " + " " + entry['gender'] + " " + " between the ages of " + entry['ageRange'] + "."
                        else:
                            labelTextFace += "a " + " " + entry['gender'] + " " + " between the ages of " + entry['ageRange'] + "."
                    else:
                        labelTextFace += " a "
                        labelTextFace += entry['gender'] + " " + " between the ages of " + entry['ageRange'] + ","
                    count += 1
                combinedText += labelTextFace
            else:
                labelTextFace = "There are no faces detected in the image. "
                combinedText += labelTextFace
        else:
            combinedText += "There are no faces detected in the image. "
        validLabels = []
        if len(labels) != 0:
            # Do stuff to get the labels and order them into some form of text.
            for item in labels['Labels']:
                if float(item["Confidence"]) >= float(90):
                    validLabels.append(item['Name'])
            if len(validLabels) > 0:
                count = 0
                for entry in validLabels:
                    if count == (len(validLabels)-1):
                        labelText += ", and a " + entry + "."
                    else:
                        labelText += " a "
                        labelText += entry + ","
                    count += 1
                combinedText += labelText
            else:
               labelText = "There are no recognizable objects in the image."
               combinedText += labelText 
        else:
            labelText = "There are no recognizable objects in the image."
            combinedText += labelText
        print(combinedText)
        print("After detect Text")

        # Calls rekognition DetectLabels API to detect labels in S3 object
        #response = detect_labels(bucket, key)

        # Calls rekognition IndexFaces API to detect faces in S3 object and index faces into specified collection
        #response = index_faces(bucket, key)

        # Print response to console.
        print(response)
        for thing in response['TextDetections']:
         if thing['Type'] == "LINE":
            print("Inside of if statement")
            textLines += thing['DetectedText'] + " "
            some_binary_data = textLines.encode('utf-8')
            s3.Object(bucket, str(key).split("/")[1] + '.txt').put(Body=some_binary_data)
            s3.Bucket(bucket).delete_objects(Delete={'Objects': [{'Key': key}]})
            # Add text from image into combinedText variable for turning into audio
        print(textLines)
        if textLines != "":
            combinedText += " And the text found in the image is: " + textLines
            output = outputAudio(combinedText, bucket, key, "")
            translationOutput = outputTranslation(textLines, bucket, key)
            print(output)
            print(translationOutput)
            combinedTranslate = labelText + translationOutput
            temp = outputAudio(combinedTranslate, bucket, key, "translated")
        else:
            combinedText += " And image does not contain any detectable text."
            output = outputAudio(combinedText, bucket, key, "")

        return response
    except Exception as e:
        print("Exception")
        print(''.join(traceback.format_exc(e)))
        raise e

