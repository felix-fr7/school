import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const StudentHomeworkDetailScreen: React.FC = () => (
  <ScrollView style={styles.container}>
    <Text style={styles.placeholder}>Homework Details</Text>
    <Text style={styles.subtext}>Full homework details will be shown here</Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  placeholder: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subtext: { fontSize: 14, color: '#666', marginTop: 8 },
});

export default StudentHomeworkDetailScreen;