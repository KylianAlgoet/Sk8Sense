import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import useBleStore, { SERVICE_UUID } from '../store/bleStore';

export default function ConnectScreen({ navigation }) {
  const { manager, setManager, isScanning, setScanning, devices, addDevice, setConnectedDevice } =
    useBleStore();

  useEffect(() => {
    const mgr = new BleManager();
    setManager(mgr);
    return () => mgr.destroy();
  }, []);

  const startScan = () => {
    if (!manager || isScanning) return;
    setScanning(true);
    manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
      if (error) {
        setScanning(false);
        return;
      }
      if (device) addDevice(device);
    });
  };

  const connect = async (device) => {
    manager.stopDeviceScan();
    setScanning(false);
    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(connected);
      navigation.navigate('Dashboard');
    } catch (e) {
      console.error('Connection failed:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Boards</Text>
      {isScanning && (
        <View style={styles.scanRow}>
          <ActivityIndicator color="#e94560" />
          <Text style={styles.scanText}>Scanning...</Text>
        </View>
      )}
      <TouchableOpacity style={styles.button} onPress={startScan} disabled={isScanning}>
        <Text style={styles.buttonText}>SCAN FOR BOARD</Text>
      </TouchableOpacity>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.deviceRow}>
            <Text style={styles.deviceName}>{item.name || item.id}</Text>
            <TouchableOpacity style={styles.connectBtn} onPress={() => connect(item)}>
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No devices found yet</Text>
        }
      />
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scanText: {
    color: '#aaa',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  deviceName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  connectBtn: {
    backgroundColor: '#e94560',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
  },
});
