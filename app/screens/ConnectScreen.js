import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Animated, Easing, Platform, PermissionsAndroid, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useBleStore from '../store/bleStore';

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
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return result === 'granted';
}

function ScanRings({ scanning }) {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) { [r1,r2,r3].forEach(r => r.setValue(0)); return; }
    const ring = (anim, delay) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    ring(r1, 0).start(); ring(r2, 600).start(); ring(r3, 1200).start();
  }, [scanning]);

  const ringStyle = (anim) => ({
    transform: [{ scale: anim.interpolate({ inputRange:[0,1], outputRange:[1,2.8] }) }],
    opacity: anim.interpolate({ inputRange:[0,0.4,1], outputRange:[0.6,0.3,0] }),
  });

  return (
    <View style={sr.wrap}>
      {scanning && (
        <>
          <Animated.View style={[sr.ring, ringStyle(r1)]} />
          <Animated.View style={[sr.ring, ringStyle(r2)]} />
          <Animated.View style={[sr.ring, ringStyle(r3)]} />
        </>
      )}
      <View style={[sr.center, scanning && sr.centerActive]}>
        <Ionicons name={scanning ? 'radio' : 'radio-outline'} size={32} color={scanning ? '#e94560' : '#555'} />
      </View>
    </View>
  );
}

const sr = StyleSheet.create({
  wrap: { width: 110, height: 110, alignItems:'center', justifyContent:'center', marginBottom:8 },
  ring: { position:'absolute', width:70, height:70, borderRadius:35, borderWidth:1.5, borderColor:'#e94560', backgroundColor:'rgba(233,69,96,0.06)' },
  center: { width:68, height:68, borderRadius:34, backgroundColor:'#16213e', borderWidth:1.5, borderColor:'#2a3a5a', alignItems:'center', justifyContent:'center' },
  centerActive: { borderColor:'#e9456055', backgroundColor:'#1e1428' },
});

export default function ConnectScreen({ navigation }) {
  const { manager, setManager, isScanning, setScanning, devices, addDevice, setConnectedDevice } = useBleStore();
  const [mockDevices, setMockDevices] = useState([]);
  const [mockScanning, setMockScanning] = useState(false);
  const [permError, setPermError] = useState(false);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    if (IS_WEB) return;
    const { BleManager } = require('react-native-ble-plx');
    const mgr = new BleManager();
    setManager(mgr);
    return () => mgr.destroy();
  }, []);

  const startMockScan = () => {
    setMockScanning(true); setMockDevices([]);
    setTimeout(() => { setMockDevices([MOCK_DEVICE]); setMockScanning(false); }, 1500);
  };

  const startScan = async () => {
    if (!manager || isScanning) return;
    const granted = await requestBluetoothPermissions();
    if (!granted) {
      setPermError(true);
      Alert.alert('Bluetooth permission denied', 'Go to Settings → Apps → SK8Sense → Permissions.');
      return;
    }
    setPermError(false); setScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) { setScanning(false); return; }
      if (device) addDevice(device);
    });
  };

  const connect = async (device) => {
    setConnecting(device.id);
    if (IS_WEB) { setConnectedDevice(device); navigation.navigate('Dashboard'); return; }
    manager.stopDeviceScan(); setScanning(false);
    try {
      const connected = await device.connect();
      await connected.requestMTU(185);
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(connected);
      navigation.navigate('Dashboard');
    } catch (e) { setConnecting(null); }
  };

  const scanning = IS_WEB ? mockScanning : isScanning;
  const deviceList = IS_WEB ? mockDevices : devices;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#aaa" />
        </TouchableOpacity>
        <Text style={s.title}>Find Board</Text>
        {IS_WEB && <View style={s.demoBadge}><Text style={s.demoText}>DEMO</Text></View>}
      </View>

      <View style={s.scanSection}>
        <ScanRings scanning={scanning} />
        <Text style={s.scanStatus}>
          {scanning ? 'Scanning for boards...'
            : deviceList.length > 0 ? `${deviceList.length} board${deviceList.length > 1 ? 's' : ''} found`
            : 'Ready to scan'}
        </Text>
        {permError && <Text style={s.permError}>Bluetooth permission denied — check app settings</Text>}
      </View>

      <FlatList
        data={deviceList}
        keyExtractor={(item) => item.id}
        style={s.list}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          !scanning ? (
            <View style={s.emptyWrap}>
              <Ionicons name="bluetooth-outline" size={36} color="#2a3a5a" />
              <Text style={s.emptyText}>No boards found</Text>
              <Text style={s.emptySub}>Make sure your board is powered on</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.deviceCard} onPress={() => connect(item)} activeOpacity={0.8} disabled={!!connecting}>
            <View style={s.deviceIcon}>
              <Ionicons name="radio" size={20} color="#e94560" />
            </View>
            <View style={s.deviceInfo}>
              <Text style={s.deviceName}>{item.name || 'Unknown Device'}</Text>
              <Text style={s.deviceId}>{item.id.slice(0, 20)}...</Text>
            </View>
            {connecting === item.id
              ? <View style={s.connectingDot} />
              : <View style={s.connectBtn}><Text style={s.connectBtnText}>Connect</Text></View>
            }
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={[s.scanBtn, scanning && s.scanBtnActive]}
        onPress={IS_WEB ? startMockScan : startScan}
        disabled={scanning}
        activeOpacity={0.85}
      >
        <Ionicons name={scanning ? 'pause-circle-outline' : 'radio-outline'} size={18} color="#fff" />
        <Text style={s.scanBtnText}>{scanning ? 'SCANNING...' : 'SCAN FOR BOARD'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#1a1a2e', paddingTop:52 },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:20, marginBottom:4, gap:12 },
  backBtn: { width:36, height:36, borderRadius:18, backgroundColor:'#16213e', alignItems:'center', justifyContent:'center' },
  title: { color:'#fff', fontSize:22, fontWeight:'bold', flex:1 },
  demoBadge: { backgroundColor:'#FFD70018', borderRadius:6, paddingHorizontal:8, paddingVertical:3 },
  demoText: { color:'#FFD700', fontSize:10, fontWeight:'bold', letterSpacing:1 },
  scanSection: { alignItems:'center', paddingVertical:20, gap:6 },
  scanStatus: { color:'#aaa', fontSize:14 },
  permError: { color:'#e94560', fontSize:12, textAlign:'center', paddingHorizontal:24 },
  list: { flex:1 },
  listContent: { paddingHorizontal:20, paddingTop:4 },
  emptyWrap: { alignItems:'center', paddingTop:28, gap:8 },
  emptyText: { color:'#555', fontSize:15, fontWeight:'600' },
  emptySub: { color:'#333', fontSize:12, textAlign:'center' },
  deviceCard: { backgroundColor:'#16213e', borderRadius:12, padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:'#1e2d4a' },
  deviceIcon: { width:40, height:40, borderRadius:20, backgroundColor:'#e9456018', alignItems:'center', justifyContent:'center' },
  deviceInfo: { flex:1 },
  deviceName: { color:'#fff', fontSize:14, fontWeight:'600' },
  deviceId: { color:'#444', fontSize:11, marginTop:2 },
  connectBtn: { backgroundColor:'#e94560', borderRadius:8, paddingHorizontal:14, paddingVertical:7 },
  connectBtnText: { color:'#fff', fontSize:12, fontWeight:'bold' },
  connectingDot: { width:10, height:10, borderRadius:5, backgroundColor:'#4CAF50' },
  scanBtn: { margin:20, backgroundColor:'#e94560', borderRadius:12, paddingVertical:15, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, shadowColor:'#e94560', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, elevation:6 },
  scanBtnActive: { backgroundColor:'#444' },
  scanBtnText: { color:'#fff', fontSize:14, fontWeight:'bold', letterSpacing:1 },
});
