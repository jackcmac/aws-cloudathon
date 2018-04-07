import React from 'react';
import { StyleSheet, Text, View, Button, Image } from 'react-native';
import { Audio, ImagePicker } from 'expo';
//import Sound from 'react-native-sound';

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
    /*
    Sound.setCategory('Playback');
    var audio = new Sound('johncena.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
      console.log('duration in seconds: ' + whoosh.getDuration());
    });
    audio.play((success) => {
      if (success) {
        console.log('playback successful');
      } else {
        console.log('playback failed');
        whoosh.reset();
      }
    });
    */
    const soundObject = new Audio.Sound();
    try {
      await soundObject.loadAsync(require('./johncena.mp3'));
      await soundObject.playAsync();
      console.log('playback successful');
    } catch (error) {
      console.log('playback failed');
    }
  };

}