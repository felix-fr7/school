/**
 * Class Edit Student Screen
 * Edit student details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ClassEditStudentScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Edit Student - Coming Soon</Text>
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

export default ClassEditStudentScreen;