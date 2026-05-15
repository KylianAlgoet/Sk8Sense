import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native';

// Pure React Native board — responds instantly to pitch/roll via perspective transforms.
// No WebView, no GLB loading, no CDN dependency.

const BW = 108;
const BH = 230;

export default function LiveBoardViewer({
  pitch = 0,
  roll = 0,
  yaw = 0,
  trickGlow = 0,
  simulated = false,
  style,
}) {
  const animPitch = useRef(new Animated.Value(0)).current;
  const animRoll  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const simRotY   = useRef(new Animated.Value(0)).current;

  // Smooth live pitch/roll
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animPitch, { toValue: pitch, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(animRoll,  { toValue: roll,  duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [pitch, roll]);

  // Trick glow flash
  useEffect(() => {
    if (trickGlow > 0) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [trickGlow]);

  // Simulated idle rotation when no real sensor
  useEffect(() => {
    if (simulated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(simRotY, { toValue: 18,  duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(simRotY, { toValue: -18, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();
    } else {
      simRotY.stopAnimation();
      simRotY.setValue(0);
    }
  }, [simulated]);

  const pitchDeg = animPitch.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const rollDeg  = animRoll.interpolate({  inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const simDeg   = simRotY.interpolate({   inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });
  const glowColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(68,136,255,0)', 'rgba(68,136,255,0.35)'] });

  return (
    <View style={[s.container, style]}>
      {/* Status label */}
      <View style={s.statusRow}>
        <View style={[s.statusDot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
        <Text style={s.statusText}>{simulated ? 'SIMULATED' : 'LIVE SENSOR'}</Text>
      </View>

      {/* 3D-perspective board */}
      <View style={s.scene}>
        {/* Shadow */}
        <View style={s.shadow} />

        <Animated.View style={[s.boardWrap, {
          transform: [
            { perspective: 700 },
            { rotateX: pitchDeg },   // pitch: nose up/down
            { rotateZ: rollDeg },    // roll: left/right tilt
            { rotateY: simDeg },     // idle sim rotation
          ],
        }]}>
          {/* Wheels top */}
          <View style={s.truckWrap}>
            <View style={s.wheel} /><View style={s.truckBar} /><View style={s.wheel} />
          </View>

          {/* Deck */}
          <Animated.View style={[s.deck, { shadowColor: glowColor }]}>
            <View style={s.grip} />

            {/* Concave edges */}
            <View style={[s.concave, { left: 8 }]} />
            <View style={[s.concave, { right: 8 }]} />

            {/* Nose zone */}
            <Animated.View style={[s.zoneNose, { opacity: glowAnim, backgroundColor: '#4488ff' }]} />

            {/* Tail zone */}
            <Animated.View style={[s.zoneTail, { opacity: glowAnim, backgroundColor: '#4488ff' }]} />

            {/* Bolts */}
            {[{ top: 44, left: 24 }, { top: 44, right: 24 }, { bottom: 44, left: 24 }, { bottom: 44, right: 24 }].map((p, i) => (
              <View key={i} style={[s.bolt, p]} />
            ))}

            {/* Back foot (regular stance — tail) */}
            <View style={s.footBack} />
            {/* Front foot (angled, front trucks) */}
            <View style={s.footFront} />

            {/* Live sensor overlay */}
            <View style={s.sensorOverlay}>
              <Text style={s.sensorVal}>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}° P</Text>
              <Text style={s.sensorVal}>{roll >= 0 ? '+' : ''}{roll.toFixed(1)}° R</Text>
            </View>
          </Animated.View>

          {/* Wheels bottom */}
          <View style={s.truckWrap}>
            <View style={s.wheel} /><View style={s.truckBar} /><View style={s.wheel} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d1a', borderRadius: 10 },

  statusRow: { position: 'absolute', top: 8, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, zIndex: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  scene: { alignItems: 'center', justifyContent: 'center', height: '100%' },

  shadow: {
    position: 'absolute', bottom: 14,
    width: BW * 0.8, height: 14,
    backgroundColor: '#000', borderRadius: 30, opacity: 0.4,
  },

  boardWrap: { alignItems: 'center' },

  truckWrap: {
    flexDirection: 'row', alignItems: 'center',
    width: BW + 14, height: 13,
  },
  truckBar: { flex: 1, height: 10, backgroundColor: '#7a7a7a', borderRadius: 5, marginHorizontal: 2 },
  wheel: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#eeeeee', borderWidth: 2, borderColor: '#aaa' },

  deck: {
    width: BW, height: BH,
    borderRadius: 22,
    backgroundColor: '#1e1208',
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#3a2510',
  },
  grip: { position: 'absolute', inset: 5, borderRadius: 17, backgroundColor: '#111' },
  concave: { position: 'absolute', top: 12, bottom: 12, width: 3, backgroundColor: '#1c1c1c', borderRadius: 2 },

  zoneNose: { position: 'absolute', top: 7, left: '15%', right: '15%', height: 48, borderRadius: 13 },
  zoneTail: { position: 'absolute', bottom: 7, left: '15%', right: '15%', height: 54, borderRadius: 13 },

  bolt: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#3a2e18', borderWidth: 1, borderColor: '#6a5830' },

  // Back foot — perpendicular at tail
  footBack: {
    position: 'absolute', bottom: 62, left: '10%', right: '10%', height: 28,
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  // Front foot — angled at front trucks
  footFront: {
    position: 'absolute', top: 62, left: '20%',
    width: 24, height: 68,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '-42deg' }],
  },

  sensorOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    alignItems: 'flex-end', gap: 2,
  },
  sensorVal: { color: 'rgba(68,200,255,0.7)', fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' },
});
