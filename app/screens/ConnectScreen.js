import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Animated, Easing, Platform, PermissionsAndroid, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useBleStore from '../store/bleStore';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';

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
    const loops = [ring(r1, 0), ring(r2, 600), ring(r3, 1200)];
    loops.forEach(loop => loop.start());
    return () => {
      loops.forEach(loop => loop.stop());
      [r1,r2,r3].forEach(r => r.stopAnimation(() => r.setValue(0)));
    };
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
        <Ionicons name={scanning ? 'radio' : 'radio-outline'} size={32} color={scanning ? ACCENT : TEXT.t3} />
      </View>
    </View>
  );
}

const sr = StyleSheet.create({
  wrap: { width: 110, height: 110, alignItems:'center', justifyContent:'center', marginBottom:8 },
  ring: { position:'absolute', width:70, height:70, borderRadius:35, borderWidth:1.5, borderColor:ACCENT, backgroundColor:`${ACCENT}0F` },
  center: { width:68, height:68, borderRadius:34, ...PANEL.base, alignItems:'center', justifyContent:'center' },
  centerActive: { borderColor:`${ACCENT}55`, backgroundColor:BG.b3 },
});

// Full-screen overlay shown while connecting and right after a successful connection —
// makes the handshake feel deliberate instead of an instant silent jump to Dashboard.
function ConnectionOverlay({ status, deviceName }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let spinLoop;
    if (status === 'connecting') {
      spin.setValue(0);
      spinLoop = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
      );
      spinLoop.start();
    } else if (status === 'connected') {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    }
    return () => {
      spinLoop?.stop();
      spin.stopAnimation();
      pop.stopAnimation();
    };
  }, [status]);

  if (!status) return null;

  const spinStyle = { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };
  const popStyle = { transform: [{ scale: pop }] };

  return (
    <View style={ov.overlay}>
      <View style={ov.card}>
        {status === 'connecting' ? (
          <>
            <View style={ov.ringWrap}>
              <Animated.View style={[ov.ring, spinStyle]} />
              <Ionicons name="bluetooth" size={26} color={ACCENT} />
            </View>
            <Text style={ov.title}>CONNECTING…</Text>
            <Text style={ov.sub}>Pairing with {deviceName}</Text>
          </>
        ) : (
          <>
            <Animated.View style={[ov.successCircle, popStyle]}>
              <Ionicons name="checkmark" size={30} color="#0A0A0B" />
            </Animated.View>
            <Text style={[ov.title, { color: '#4CAF50' }]}>CONNECTED</Text>
            <Text style={ov.sub}>{deviceName} is live — taking you to your board</Text>
          </>
        )}
      </View>
    </View>
  );
}

const ov = StyleSheet.create({
  overlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#000000d8', alignItems:'center', justifyContent:'center', zIndex:50 },
  card: { width:240, alignItems:'center', gap:6 },
  ringWrap: { width:64, height:64, alignItems:'center', justifyContent:'center', marginBottom:18 },
  ring: { position:'absolute', width:64, height:64, borderRadius:32, borderWidth:2.5, borderColor:`${ACCENT}33`, borderTopColor:ACCENT },
  successCircle: { width:56, height:56, borderRadius:28, backgroundColor:'#4CAF50', alignItems:'center', justifyContent:'center', marginBottom:12 },
  title: { color:TEXT.t1, fontSize:15, fontFamily:FONT.display, letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 },
  sub: { color:TEXT.t3, fontSize:12, fontFamily:FONT.body, textAlign:'center', lineHeight:18, paddingHorizontal:12 },
});

export default function ConnectScreen({ navigation, route }) {
  // Where to land after a successful pairing — e.g. Practice sends { stack: 'Learn', screen: 'Practice', params: {...} }
  // so the rider returns to the lesson they came from instead of always landing on the Dashboard.
  const returnTo = route?.params?.returnTo || null;
  const { manager, setManager, isScanning, setScanning, devices, addDevice, setConnectedDevice } = useBleStore();
  const [mockDevices, setMockDevices] = useState([]);
  const [mockScanning, setMockScanning] = useState(false);
  const [permError, setPermError] = useState(false);
  const [connecting, setConnecting] = useState(null);
  // Drives the full-screen handshake overlay: null → 'connecting' → 'connected' → navigate
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectingName, setConnectingName] = useState('');
  const mountedRef = useRef(true);
  const timersRef = useRef([]);

  function setSafeTimeout(callback, delay) {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(timer => timer !== id);
      if (mountedRef.current) callback();
    }, delay);
    timersRef.current.push(id);
    return id;
  }

  useEffect(() => {
    if (IS_WEB) return;
    const { BleManager } = require('react-native-ble-plx');
    const mgr = new BleManager();
    setManager(mgr);
    return () => mgr.destroy();
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    useBleStore.getState().manager?.stopDeviceScan?.();
    useBleStore.getState().setScanning(false);
  }, []);

  const startMockScan = () => {
    setMockScanning(true); setMockDevices([]);
    setSafeTimeout(() => { setMockDevices([MOCK_DEVICE]); setMockScanning(false); }, 1500);
  };

  const startScan = async () => {
    if (!manager || isScanning) return;
    const granted = await requestBluetoothPermissions();
    if (!mountedRef.current) return;
    if (!granted) {
      setPermError(true);
      Alert.alert('Bluetooth permission denied', 'Go to Settings → Apps → SK8Sense → Permissions.');
      return;
    }
    setPermError(false); setScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (!mountedRef.current) return;
      if (error) {
        setScanning(false);
        console.warn('[BLE] scan error:', error.message, error.errorCode, error.reason);
        Alert.alert('Scan failed', error.message || 'Could not start the Bluetooth scan.');
        return;
      }
      if (device) addDevice(device);
    });
  };

  const connect = async (device) => {
    setConnecting(device.id);
    setConnectingName(device.name || 'your board');
    setConnectStatus('connecting');

    const finishWithSuccess = (connectedDevice) => {
      if (!mountedRef.current) return;
      setConnectedDevice(connectedDevice);
      setConnectStatus('connected');
      // Let the rider see the "Connected" confirmation before jumping to where they were headed.
      // No returnTo means they came here to just pair the board — drop them on Home so they
      // can choose for themselves: start a session or head into Learning.
      setSafeTimeout(() => {
        if (returnTo?.stack) {
          navigation.getParent()?.navigate(returnTo.stack, { screen: returnTo.screen, params: returnTo.params });
        } else if (returnTo?.screen) {
          navigation.navigate(returnTo.screen, returnTo.params);
        } else {
          navigation.navigate('Home');
        }
      }, 1100);
    };

    if (IS_WEB) {
      // Mock handshake — give the overlay a moment so it doesn't feel instant/fake
      setSafeTimeout(() => finishWithSuccess(device), 900);
      return;
    }

    manager.stopDeviceScan(); setScanning(false);
    try {
      const connected = await device.connect();
      await connected.requestMTU(185);
      await connected.discoverAllServicesAndCharacteristics();
      finishWithSuccess(connected);
    } catch (e) {
      if (!mountedRef.current) return;
      setConnecting(null);
      setConnectStatus(null);
      Alert.alert('Connection failed', 'Could not pair with the board — make sure it\'s powered on and in range, then try again.');
    }
  };

  const scanning = IS_WEB ? mockScanning : isScanning;
  const deviceList = IS_WEB ? mockDevices : devices;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={TEXT.t2} />
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
              <Ionicons name="bluetooth-outline" size={36} color={LINE.dim} />
              <Text style={s.emptyText}>No boards found</Text>
              <Text style={s.emptySub}>Make sure your board is powered on</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.deviceCard} onPress={() => connect(item)} activeOpacity={0.8} disabled={!!connecting}>
            <View style={s.deviceIcon}>
              <Ionicons name="radio" size={20} color={ACCENT} />
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
        <Ionicons name={scanning ? 'pause-circle-outline' : 'radio-outline'} size={18} color={T.ACCENT_INK} />
        <Text style={s.scanBtnText}>{scanning ? 'SCANNING...' : 'SCAN FOR BOARD'}</Text>
      </TouchableOpacity>

      <ConnectionOverlay status={connectStatus} deviceName={connectingName} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:BG.base, paddingTop:52 },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:SPACE.xl, marginBottom:4, gap:SPACE.md },
  backBtn: { ...BTN.icon },
  title: { color:TEXT.t1, fontSize:22, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:-0.5, flex:1 },
  demoBadge: { backgroundColor:`${T.AMBER}18`, borderRadius:R, paddingHorizontal:8, paddingVertical:3 },
  demoText: { color:T.AMBER, fontSize:10, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase' },
  scanSection: { alignItems:'center', paddingVertical:20, gap:6 },
  scanStatus: { color:TEXT.t2, fontSize:14, fontFamily:FONT.body },
  permError: { color:ACCENT, fontSize:12, fontFamily:FONT.body, textAlign:'center', paddingHorizontal:24 },
  list: { flex:1 },
  listContent: { paddingHorizontal:SPACE.xl, paddingTop:4 },
  emptyWrap: { alignItems:'center', paddingTop:28, gap:8 },
  emptyText: { color:TEXT.t2, fontSize:15, fontFamily:FONT.bodySb },
  emptySub: { color:TEXT.t3, fontSize:12, fontFamily:FONT.body, textAlign:'center' },
  deviceCard: { ...PANEL.raised, padding:SPACE.md, marginBottom:10, flexDirection:'row', alignItems:'center', gap:12 },
  deviceIcon: { width:40, height:40, borderRadius:20, backgroundColor:`${ACCENT}18`, alignItems:'center', justifyContent:'center' },
  deviceInfo: { flex:1 },
  deviceName: { color:TEXT.t1, fontSize:14, fontFamily:FONT.bodySb },
  deviceId: { color:TEXT.t3, fontSize:11, marginTop:2, fontFamily:FONT.mono },
  connectBtn: { ...BTN.base, ...BTN.primary, paddingVertical:7, paddingHorizontal:14 },
  connectBtnText: { ...BTN.primaryText, fontSize:12 },
  connectingDot: { width:10, height:10, borderRadius:5, backgroundColor:'#4CAF50' },
  scanBtn: { margin:SPACE.xl, ...BTN.base, ...BTN.primary, shadowColor:ACCENT, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, elevation:6 },
  scanBtnActive: { backgroundColor:BG.b4 },
  scanBtnText: { ...BTN.primaryText, fontSize:14 },
});
