import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, PermissionsAndroid, Alert } from 'react-native';
import useBleStore, { SERVICE_UUID } from '../store/bleStore';

const IS_WEB = Platform.OS === 'web';

const MOCK_DEVICE = { id: 'mock-esp32', name: 'SK8Sense ESP32 (Demo)' };

async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return (
      result['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
      result['android.permission.BLUETOOTH_CONNECT'] === 'granted'
    );
  } else {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return result === 'granted';
  }
}

export default function ConnectScreen({ navigation }) {
  const { manager, setManager, isScanning, setScanning, devices, addDevice, setConnectedDevice } =
    useBleStore();
  const [mockScanning, setMockScanning] = useState(false);
  const [mockDevices, setMockDevices] = useState([]);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    if (IS_WEB) return;
    const { BleManager } = require('react-native-ble-plx');
    const mgr = new BleManager();
    setManager(mgr);
    return () => mgr.destroy();
  }, []);

  // Web demo: simulate a 1.5s scan that finds the mock device
  const startMockScan = () => {
    setMockScanning(true);
    setMockDevices([]);
    setTimeout(() => {
      setMockDevices([MOCK_DEVICE]);
      setMockScanning(false);
    }, 1500);
  };

  const connectMock = () => {
    setConnectedDevice(MOCK_DEVICE);
    navigation.navigate('Dashboard');
  };

  if (IS_WEB) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Nearby Boards</Text>
        <Text style={styles.demoTag}>DEMO MODE</Text>
        {mockScanning && (
          <View style={styles.scanRow}>
            <ActivityIndicator color="#e94560" />
            <Text style={styles.scanText}>Scanning...</Text>
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={startMockScan} disabled={mockScanning}>
          <Text style={styles.buttonText}>SCAN FOR BOARD</Text>
        </TouchableOpacity>
        <FlatList
          data={mockDevices}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.deviceRow}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <TouchableOpacity style={styles.connectBtn} onPress={connectMock}>
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            !mockScanning && <Text style={styles.emptyText}>Press "Scan for Board" to start</Text>
          }
        />
      </View>
    );
  }

  const startScan = async () => {
    if (!manager || isScanning) return;
    const granted = await requestBluetoothPermissions();
    if (!granted) {
      setPermissionError(true);
      Alert.alert(
        'Bluetooth permissie geweigerd',
        'Ga naar Instellingen → Apps → SK8Sense → Rechten en geef Bluetooth en Locatie toegang.',
      );
      return;
    }
    setPermissionError(false);
    setScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) { setScanning(false); return; }
      if (device) addDevice(device);
    });
  };

  const connect = async (device) => {
    manager.stopDeviceScan();
    setScanning(false);
    try {
      const connected = await device.connect();
      await connected.requestMTU(185);
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
      {permissionError && (
        <Text style={styles.errorText}>Bluetooth permissie geweigerd — check app instellingen</Text>
      )}
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
        ListEmptyComponent={<Text style={styles.emptyText}>No devices found yet</Text>}
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
    marginBottom: 4,
  },
  demoTag: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
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
  list: { flex: 1 },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  deviceName: { color: '#fff', fontSize: 14, flex: 1 },
  connectBtn: {
    backgroundColor: '#e94560',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  connectBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40 },
  errorText: { color: '#e94560', fontSize: 13, marginBottom: 10 },
});
