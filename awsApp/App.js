import React from 'react';
import { StyleSheet, Text, View, Button, Image } from 'react-native';
import { Audio, ImagePicker } from 'expo';

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