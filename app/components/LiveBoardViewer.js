import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

// Pure React Native — zero bridge latency, instant response to sensor data.
// Perspective transforms give the 3D tilt effect without any WebView overhead.

export default function LiveBoardViewer({ pitch=0, roll=0, f1=0, f2=0, f3=0, f4=0, simulated=false, style }) {
  const aP = useRef(new Animated.Value(0)).current;
  const aR = useRef(new Animated.Value(0)).current;
  const aS = useRef(new Animated.Value(0)).current;

  // FSR zone animated opacities
  const aN = useRef(new Animated.Value(0)).current; // nose
  const aH = useRef(new Animated.Value(0)).current; // heel
  const aO = useRef(new Animated.Value(0)).current; // toe
  const aT = useRef(new Animated.Value(0)).current; // tail

  // Smooth pitch/roll — 60ms for live feel
  useEffect(() => {
    Animated.parallel([
      Animated.timing(aP, { toValue: pitch, duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(aR, { toValue: roll,  duration: 60, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [pitch, roll]);

  // FSR zone glow — direct mapping, no smoothing needed
  useEffect(() => {
    const normalize = (v) => Math.min(Math.max((v - 300) / 700, 0), 1);
    Animated.parallel([
      Animated.timing(aN, { toValue: normalize(f1), duration: 50, useNativeDriver: false }),
      Animated.timing(aH, { toValue: normalize(f2), duration: 50, useNativeDriver: false }),
      Animated.timing(aO, { toValue: normalize(f3), duration: 50, useNativeDriver: false }),
      Animated.timing(aT, { toValue: normalize(f4), duration: 50, useNativeDriver: false }),
    ]).start();
  }, [f1, f2, f3, f4]);

  // Simulated idle rotation
  useEffect(() => {
    if (simulated) {
      Animated.loop(Animated.sequence([
        Animated.timing(aS, { toValue: 12,  duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(aS, { toValue: -12, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    } else { aS.stopAnimation(); aS.setValue(0); }
  }, [simulated]);

  const px = aP.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const rz = aR.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const sy = aS.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });

  return (
    <View style={[s.container, style]}>
      {/* Status dot */}
      <View style={s.badge}>
        <View style={[s.dot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
      </View>

      <View style={s.scene}>
        {/* Shadow */}
        <Animated.View style={[s.shadow, {
          opacity: aP.interpolate({ inputRange: [-30, 0, 30], outputRange: [0.2, 0.45, 0.2] }),
        }]} />

        {/* Board with 3D perspective tilt */}
        <Animated.View style={[s.boardWrap, {
          transform: [
            { perspective: 750 },
            { rotateX: px },
            { rotateZ: rz },
            { rotateY: sy },
          ],
        }]}>
          {/* Top truck */}
          <View style={s.truckRow}>
            <View style={s.wheel} /><View style={s.axle} /><View style={s.wheel} />
          </View>

          {/* Deck */}
          <View style={s.deck}>
            {/* Grip tape */}
            <View style={s.grip} />
            {/* Concave edge strips */}
            <View style={[s.edge, { left: 8 }]} />
            <View style={[s.edge, { right: 8 }]} />

            {/* FSR pressure zones — glow with real sensor data */}
            <Animated.View style={[s.zoneNose, {
              opacity: aN,
              backgroundColor: '#4CAF50',
              shadowColor: '#4CAF50',
              shadowRadius: aN.interpolate({ inputRange:[0,1], outputRange:[0,12] }),
              shadowOpacity: aN,
            }]} />
            <Animated.View style={[s.zoneTail, {
              opacity: aT,
              backgroundColor: '#e94560',
              shadowColor: '#e94560',
              shadowRadius: aT.interpolate({ inputRange:[0,1], outputRange:[0,12] }),
              shadowOpacity: aT,
            }]} />
            <Animated.View style={[s.zoneHeel, {
              opacity: aH,
              backgroundColor: '#2196F3',
            }]} />
            <Animated.View style={[s.zoneToe, {
              opacity: aO,
              backgroundColor: '#FF9800',
            }]} />

            {/* Bolt holes */}
            {[{top:46,left:24},{top:46,right:24},{bottom:46,left:24},{bottom:46,right:24}].map((p,i) => (
              <View key={i} style={[s.bolt, p]} />
            ))}

            {/* Foot silhouettes */}
            <View style={s.footBack} />
            <View style={s.footFront} />

            {/* Live angles */}
            <View style={s.overlay}>
              <Text style={s.overlayP}>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°P</Text>
              <Text style={s.overlayR}>{roll >= 0 ? '+' : ''}{roll.toFixed(1)}°R</Text>
            </View>
          </View>

          {/* Bottom truck */}
          <View style={s.truckRow}>
            <View style={s.wheel} /><View style={s.axle} /><View style={s.wheel} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const BW = 112, BH = 246;
const s = StyleSheet.create({
  container: { backgroundColor: '#0d0d1a', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 9, right: 11, zIndex: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  scene: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  shadow: { position: 'absolute', bottom: 12, width: BW * 0.8, height: 14, backgroundColor: '#000', borderRadius: 30, opacity: 0.4 },

  boardWrap: { alignItems: 'center' },
  truckRow: { flexDirection: 'row', alignItems: 'center', width: BW + 16, height: 14 },
  axle: { flex: 1, height: 11, backgroundColor: '#787878', borderRadius: 5, marginHorizontal: 3, borderWidth: 0.5, borderColor: '#999' },
  wheel: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#f0ebe0', borderWidth: 2, borderColor: '#bbb' },

  deck: { width: BW, height: BH, borderRadius: 24, backgroundColor: '#1c1208', overflow: 'hidden', borderWidth: 1.5, borderColor: '#3d2812' },
  grip: { position: 'absolute', inset: 5, borderRadius: 20, backgroundColor: '#101010' },
  edge: { position: 'absolute', top: 12, bottom: 12, width: 3, backgroundColor: '#1c1c1c', borderRadius: 2 },

  zoneNose: { position: 'absolute', top: 8, left: '13%', right: '13%', height: 54, borderRadius: 14 },
  zoneTail: { position: 'absolute', bottom: 8, left: '13%', right: '13%', height: 60, borderRadius: 14 },
  zoneHeel: { position: 'absolute', left: 8, top: '26%', bottom: '24%', width: 28, borderRadius: 14 },
  zoneToe:  { position: 'absolute', right: 8, top: '26%', bottom: '24%', width: 28, borderRadius: 14 },

  bolt: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#3a2e18', borderWidth: 1, borderColor: '#7a6030' },
  footBack: { position: 'absolute', bottom: 70, left: '10%', right: '10%', height: 28, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 9 },
  footFront: { position: 'absolute', top: 68, left: '22%', width: 26, height: 72, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 9, transform: [{ rotate: '-42deg' }] },

  overlay: { position: 'absolute', bottom: 9, right: 8, alignItems: 'flex-end', gap: 1 },
  overlayP: { color: 'rgba(100,180,255,0.7)', fontSize: 9, fontWeight: 'bold' },
  overlayR: { color: 'rgba(255,160,60,0.7)', fontSize: 9, fontWeight: 'bold' },
});
