/**
 * Class Create Circular Screen
 * Create new circular for the class
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ClassCreateCircularScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Circular - Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

export default ClassCreateCircularScreen;