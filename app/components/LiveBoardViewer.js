import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

// Clean 2D top-down board with perspective transforms.
// No WebView, no GLB, no CDN. Works instantly and reliably.

const W = 116;
const H = 258;

export default function LiveBoardViewer({ pitch = 0, roll = 0, trickGlow = 0, simulated = false, style }) {
  const aPitch = useRef(new Animated.Value(0)).current;
  const aRoll  = useRef(new Animated.Value(0)).current;
  const aGlow  = useRef(new Animated.Value(0)).current;
  const aSim   = useRef(new Animated.Value(0)).current;
  const aBounce= useRef(new Animated.Value(1)).current;

  // Smooth pitch/roll — 80ms lerp for live feel
  useEffect(() => {
    Animated.parallel([
      Animated.timing(aPitch, { toValue: pitch, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(aRoll,  { toValue: roll,  duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [pitch, roll]);

  // Trick glow + bounce
  useEffect(() => {
    if (trickGlow > 0) {
      Animated.sequence([
        Animated.timing(aBounce, { toValue: 1.06, duration: 80, useNativeDriver: true }),
        Animated.spring(aBounce, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(aGlow, { toValue: 1, duration: 90, useNativeDriver: false }),
        Animated.timing(aGlow, { toValue: 0, duration: 550, useNativeDriver: false }),
      ]).start();
    }
  }, [trickGlow]);

  // Simulated idle rotation
  useEffect(() => {
    if (simulated) {
      Animated.loop(Animated.sequence([
        Animated.timing(aSim, { toValue: 14,  duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(aSim, { toValue: -14, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    } else {
      aSim.stopAnimation(); aSim.setValue(0);
    }
  }, [simulated]);

  const px  = aPitch.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const rz  = aRoll.interpolate({  inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const sy  = aSim.interpolate({   inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });
  const glowOp   = aGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] });
  const glowColor= aGlow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(68,136,255,0)', 'rgba(68,136,255,0.85)'] });

  return (
    <View style={[s.container, style]}>
      {/* Status badge */}
      <View style={s.badge}>
        <View style={[s.badgeDot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
        <Text style={s.badgeText}>{simulated ? 'SIMULATED' : 'LIVE'}</Text>
      </View>

      {/* Board with perspective 3D tilt */}
      <View style={s.scene}>
        {/* Ground shadow — fades when board tilts */}
        <Animated.View style={[s.shadow, {
          opacity: aRoll.interpolate({ inputRange: [-45, 0, 45], outputRange: [0.15, 0.45, 0.15] }),
          transform: [{ scaleX: aBounce }],
        }]} />

        <Animated.View style={[s.boardWrap, {
          transform: [
            { perspective: 700 },
            { rotateX: px },
            { rotateZ: rz },
            { rotateY: sy },
            { scale: aBounce },
          ],
        }]}>
          {/* Top truck */}
          <View style={s.truckRow}>
            <View style={s.wheel} />
            <View style={s.truckBar} />
            <View style={s.wheel} />
          </View>

          {/* Deck */}
          <View style={s.deck}>
            {/* Grip tape */}
            <View style={s.grip} />

            {/* Concave edge lines */}
            <View style={[s.concave, { left: 9 }]} />
            <View style={[s.concave, { right: 9 }]} />

            {/* Nose zone glow */}
            <Animated.View style={[s.zoneNose, { opacity: glowOp, backgroundColor: glowColor }]} />

            {/* Tail zone glow */}
            <Animated.View style={[s.zoneTail, { opacity: glowOp, backgroundColor: glowColor }]} />

            {/* Heel zone */}
            <Animated.View style={[s.zoneHeel, { opacity: Animated.multiply(glowOp, 0.6), backgroundColor: glowColor }]} />

            {/* Toe zone */}
            <Animated.View style={[s.zoneToe, { opacity: Animated.multiply(glowOp, 0.6), backgroundColor: glowColor }]} />

            {/* Bolts */}
            {[{top:48,left:26},{top:48,right:26},{bottom:48,left:26},{bottom:48,right:26}].map((p,i)=>(
              <View key={i} style={[s.bolt, p]} />
            ))}

            {/* Back foot (regular stance — tail) */}
            <View style={s.footBack} />
            {/* Front foot (angled ~42° over front trucks) */}
            <View style={s.footFront} />

            {/* Live angle display */}
            <View style={s.angleOverlay}>
              <Text style={s.angleText}>{pitch >= 0 ? '+' : ''}{pitch.toFixed(1)}°</Text>
              <Text style={[s.angleText, { color: 'rgba(255,160,60,0.8)' }]}>{roll >= 0 ? '+' : ''}{roll.toFixed(1)}°</Text>
            </View>
          </View>

          {/* Bottom truck */}
          <View style={s.truckRow}>
            <View style={s.wheel} />
            <View style={s.truckBar} />
            <View style={s.wheel} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#0d0d1a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute', top: 9, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5, zIndex: 10,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3 },
  badgeText: { color: '#444', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  scene: { alignItems: 'center', justifyContent: 'center', flex: 1 },

  shadow: {
    position: 'absolute', bottom: 16,
    width: W * 0.78, height: 16,
    backgroundColor: '#000',
    borderRadius: 40,
  },

  boardWrap: { alignItems: 'center' },

  truckRow: {
    flexDirection: 'row', alignItems: 'center',
    width: W + 16, height: 14,
  },
  truckBar: {
    flex: 1, height: 11,
    backgroundColor: '#707070',
    borderRadius: 5,
    marginHorizontal: 3,
    borderWidth: 0.5, borderColor: '#999',
  },
  wheel: {
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: '#e8e8e8',
    borderWidth: 2, borderColor: '#aaa',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3,
  },

  deck: {
    width: W, height: H,
    borderRadius: 24,
    backgroundColor: '#1c1006',
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#3d2812',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, elevation: 6,
  },
  grip: {
    position: 'absolute', inset: 5, borderRadius: 20,
    backgroundColor: '#111111',
  },
  concave: {
    position: 'absolute', top: 14, bottom: 14,
    width: 3, backgroundColor: '#1d1d1d', borderRadius: 2,
  },

  zoneNose: { position: 'absolute', top: 8, left: '14%', right: '14%', height: 54, borderRadius: 15 },
  zoneTail: { position: 'absolute', bottom: 8, left: '14%', right: '14%', height: 60, borderRadius: 15 },
  zoneHeel: { position: 'absolute', left: 8, top: '28%', bottom: '26%', width: 26, borderRadius: 13 },
  zoneToe:  { position: 'absolute', right: 8, top: '28%', bottom: '26%', width: 26, borderRadius: 13 },

  bolt: {
    position: 'absolute', width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#3a2e18', borderWidth: 1, borderColor: '#7a6030',
  },

  footBack: {
    position: 'absolute', bottom: 68, left: '10%', right: '10%', height: 30,
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  footFront: {
    position: 'absolute', top: 68, left: '22%',
    width: 25, height: 70,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '-42deg' }],
  },

  angleOverlay: {
    position: 'absolute', bottom: 10, right: 9,
    alignItems: 'flex-end', gap: 1,
  },
  angleText: {
    color: 'rgba(100,180,255,0.75)',
    fontSize: 9, fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
