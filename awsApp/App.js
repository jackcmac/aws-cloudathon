import React from 'react';
import { YellowBox } from 'react-native';
import { StyleSheet, Text, View, Button, Image, TouchableOpacity, Switch } from 'react-native';
import { Audio, ImagePicker, Constants, Camera, Permissions } from 'expo';
import { RNS3 } from 'react-native-aws3';
import creds from "./credentials/awsConfig.json";

YellowBox.ignoreWarnings([
  'Warning: componentWillMount is deprecated',
  'Warning: componentWillReceiveProps is deprecated',
]);

const options = {
  keyPrefix: "uploads/",
  bucket: creds.bucket,
  region: creds.region,
  accessKey: creds.accessKey,
  secretKey: creds.secretKey,
  successActionStatus: 201
}

export default class App extends React.Component {
  state = {
    id: Constants.deviceId,
    image: null,
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
    translate: false
  };

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === 'granted' });
  }

  render() {
    /*let { image } = this.state;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Button
          title="Pick an image from camera roll"
          onPress={this._pickImage}
        />
        {image &&
          <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />}
        <Button
          title="Click to play sound"
          onPress={this._playSound}
        />

      </View>
    );*/
    const { hasCameraPermission } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={{ flex: 1 }}>
              <Button 
                title=""
                onPress={this._pickImage}>
              </Button>
              <Button 
                title="Upload File"
                onPress={this._pickImage}>
              </Button>

            </TouchableOpacity>

          </View>
          <Camera style={{ flex: 8 }} type={this.state.type} ref={ref => { this.camera = ref; }}>
            <TouchableOpacity onPress={this.snap} style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, marginBottom: 10, color: 'white' }}>
                {' '}Tap to Analyze{' '}
              </Text>
            </TouchableOpacity>
          </Camera>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 18, marginBottom: 10, color: 'black' }}>
              {' '}Translate to Spanish?{' '}
            </Text>
            <Switch onValueChange={this.changeTranslate}
              value={this.state.translate}>
            </Switch>
          </View >
        </View >
      );
    }

  }

  changeTranslate = (value) => {
    this.setState({ translate: value })
  }

  snap = async () => {
    if (this.camera) {

      const shutterSound = new Audio.Sound();
      await shutterSound.loadAsync(require('./shutter.mp3'));
      await shutterSound.playAsync();


      let photo = await this.camera.takePictureAsync();
      console.log(photo);
      let data = {
        uri: photo.uri,
        name: "image" + this.state.id + ".png",
        type: "image/png"
      }
      RNS3.put(data, options).then(response => {
        if (response.status !== 201)
          throw new Error("Failed to upload image to S3");
        console.log(response.body);
        setTimeout(() => {
          this._playSound();
        }, 10000);
      });
    }
  }

  _pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    console.log(result);

    if (!result.cancelled) {
      let data = {
        uri: result.uri,
        name: "image" + this.state.id + ".png",
        type: "image/png"
      }
      RNS3.put(data, options).then(response => {
        if (response.status !== 201)
          throw new Error("Failed to upload image to S3");
        console.log(response.body);
        setTimeout(() => {
          this._playSound();
        }, 10000);
        /**
         * {
         *   postResponse: {
         *     bucket: "your-bucket",
         *     etag : "9f620878e06d28774406017480a59fd4",
         *     key: "uploads/image.png",
         *     location: "https://your-bucket.s3.amazonaws.com/uploads%2Fimage.png"
         *   }
         * }
         */
      });
      //this.setState({ image: result.uri });
    }
    console.log("dink");


  };

  _playSound = async () => {
    console.log("playing");
    const soundObject = new Audio.Sound();
    try {
      await soundObject.loadAsync({ uri: 'https://s3.amazonaws.com/rekognitionapptest/image' + this.state.id + '.png' + ((this.state.translate) ? 'Translated' : '') + '.mp3' });
      await soundObject.playAsync();
      console.log('playback successful');
    } catch (error) {
      console.log('playback failed', error);
    }

  };

}
