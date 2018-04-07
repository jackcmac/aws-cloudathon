import React from 'react';
import { StyleSheet, Text, View, Button, Image } from 'react-native';
import { ImagePicker } from 'expo';
import SoundPlayer from 'react-native-sound-player';
import { RNS3 } from 'react-native-aws3';

const options = {
  keyPrefix: "uploads/",
  bucket: "your-bucket",
  region: "us-east-1",
  accessKey: "your-access-key",
  secretKey: "your-secret-key",
  successActionStatus: 201
}

export default class App extends React.Component {
  state = {
    image: null,
  };

  render() {
    let { image } = this.state;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Button
          title="Pick an image from camera roll"
          onPress={this._pickImage}
        />
        {image &&
          <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />}

        <Button
          title="Play the mp3 file"
          onPress={this._playSound}
        />
      </View>
    );
  }

  _pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
    });

    console.log(result);

    if (!result.cancelled) {
      this.setState({ image: result.uri });
    }
  };

  _playSound = async () => {
    try {
      SoundPlayer.playSoundFile('johncena', 'mp3');
    } catch (e) {
      console.log(`cannot play the sound file`, e);
    }
  };

}
