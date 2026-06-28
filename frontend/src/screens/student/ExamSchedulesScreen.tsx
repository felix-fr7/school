import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StudentExamSchedulesScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Exam Schedules</Text>
    <Text style={styles.subtext}>Coming soon...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  text: { fontSize: 16, color: '#333' },
  subtext: { fontSize: 14, color: '#666', marginTop: 8 },
});

export default StudentExamSchedulesScreen;