import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useBleStore, { SERVICE_UUID, CHAR_UUID } from '../store/bleStore';

const SENSOR_KEYS = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];

export default function DashboardScreen({ navigation }) {
  const { connectedDevice, sensorData, setSensorData, disconnect } = useBleStore();
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!connectedDevice) return;

    subscriptionRef.current = connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      CHAR_UUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        try {
          const json = atob(characteristic.value);
          const parsed = JSON.parse(json);
          setSensorData(parsed);
        } catch {
          // ignore malformed frames
        }
      }
    );

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [connectedDevice]);

  const handleDisconnect = () => {
    subscriptionRef.current?.remove();
    connectedDevice?.cancelConnection();
    disconnect();
    navigation.navigate('Home');
  };

  const trickActive = sensorData.trick !== 'none';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Sensor Data</Text>

      <View style={styles.grid}>
        {SENSOR_KEYS.map((key) => (
          <View key={key} style={styles.cell}>
            <Text style={styles.cellLabel}>{key.toUpperCase()}</Text>
            <Text style={styles.cellValue}>
              {typeof sensorData[key] === 'number' ? sensorData[key].toFixed(2) : sensorData[key]}
            </Text>
          </View>
        ))}
      </View>

      {trickActive && (
        <View style={styles.trickBanner}>
          <Text style={styles.trickText}>TRICK DETECTED: {sensorData.trick.toUpperCase()}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
        <Text style={styles.disconnectText}>DISCONNECT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: '#e94560',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  cell: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    width: '30%',
    alignItems: 'center',
  },
  cellLabel: {
    color: '#e94560',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cellValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trickBanner: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  trickText: {
    color: '#1a1a2e',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 'auto',
  },
  disconnectText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
