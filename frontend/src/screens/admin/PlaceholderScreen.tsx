/**
 * Placeholder Screen Component
 * Used as a temporary placeholder for screens under development
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
  description?: string;
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, description }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚧</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <Text style={styles.subtext}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
});

export default PlaceholderScreen;