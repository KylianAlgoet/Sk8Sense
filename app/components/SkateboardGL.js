import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

const W = 110;   // deck width
const H = 250;   // deck height

function useLoop(create, deps) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current = create();
    return () => ref.current && ref.current.stop();
  }, deps);
}

export default function SkateboardGL({ stepIndex = 0, phase = 'steps', trickColor = '#4CAF50', style }) {
  // 3-axis rotation + lift
  const rotX = useRef(new Animated.Value(-12)).current;
  const rotY = useRef(new Animated.Value(0)).current;
  const rotZ = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  // Pressure zones
  const tail = useRef(new Animated.Value(0)).current;
  const nose = useRef(new Animated.Value(0)).current;
  const heel = useRef(new Animated.Value(0)).current;
  const toe  = useRef(new Animated.Value(0)).current;
  const all  = useRef(new Animated.Value(0)).current;

  const zones = [tail, nose, heel, toe, all];

  function reset() {
    rotX.stopAnimation(); rotY.stopAnimation();
    rotZ.stopAnimation(); lift.stopAnimation();
    zones.forEach((z) => z.stopAnimation());
    rotX.setValue(-12); rotY.setValue(0);
    rotZ.setValue(0);   lift.setValue(0);
    zones.forEach((z) => z.setValue(0));
  }

  function pulse(anim, freq = 1200, lo = 0, hi = 1) {
    return Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: hi, duration: freq, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(anim, { toValue: lo, duration: freq, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ]));
  }

  function wobble(anim, amp = 5, speed = 2000) {
    return Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: amp,  duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(anim, { toValue: -amp, duration: speed, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ]));
  }

  useEffect(() => {
    reset();

    if (phase === 'combine') {
      // Full trick loop: pop → fly → spin → land
      Animated.loop(Animated.sequence([
        // Load / crouch
        Animated.parallel([
          Animated.timing(rotX, { toValue: -28, duration: 300, useNativeDriver: true }),
          Animated.timing(tail, { toValue: 1,   duration: 250, useNativeDriver: true }),
        ]),
        // Pop + rise
        Animated.parallel([
          Animated.timing(lift, { toValue: -70, duration: 380, useNativeDriver: true }),
          Animated.timing(rotX, { toValue: -12, duration: 300, useNativeDriver: true }),
          Animated.timing(tail, { toValue: 0,   duration: 200, useNativeDriver: true }),
          Animated.timing(heel, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        ]),
        // Flip / spin
        Animated.parallel([
          Animated.timing(rotZ, { toValue: 360, duration: 380, useNativeDriver: true }),
          Animated.timing(heel, { toValue: 0,   duration: 280, useNativeDriver: true }),
        ]),
        // Peak hang time
        Animated.delay(120),
        // Rotate back + descend
        Animated.parallel([
          Animated.timing(rotZ, { toValue: 0,   duration: 1,   useNativeDriver: true }),
          Animated.timing(lift, { toValue: 0,   duration: 280, useNativeDriver: true }),
        ]),
        // Impact flash
        Animated.timing(all, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(all, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.delay(500),
      ])).start();
      return;
    }

    switch (stepIndex) {
      case 0: // Foot Position
        wobble(rotY, 7, 2200).start();
        pulse(heel, 900, 0.1, 0.7).start();
        pulse(tail, 700, 0.05, 0.45).start();
        break;

      case 1: // The Pop
        Animated.loop(Animated.sequence([
          Animated.parallel([
            Animated.timing(tail, { toValue: 1,   duration: 220, useNativeDriver: true }),
            Animated.timing(rotX, { toValue: -30, duration: 220, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(lift, { toValue: -55, duration: 320, useNativeDriver: true }),
            Animated.timing(rotX, { toValue: -12, duration: 280, useNativeDriver: true }),
            Animated.timing(tail, { toValue: 0,   duration: 180, useNativeDriver: true }),
          ]),
          Animated.timing(lift, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.delay(350),
        ])).start();
        wobble(rotY, 4, 2000).start();
        break;

      case 2: // The Slide
        Animated.loop(Animated.sequence([
          Animated.parallel([
            Animated.timing(lift, { toValue: -50, duration: 420, useNativeDriver: true }),
            Animated.timing(rotX, { toValue: -22, duration: 350, useNativeDriver: true }),
            Animated.timing(heel, { toValue: 1,   duration: 350, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(rotX, { toValue: -12, duration: 350, useNativeDriver: true }),
            Animated.timing(heel, { toValue: 0,   duration: 280, useNativeDriver: true }),
          ]),
          Animated.timing(lift, { toValue: 0, duration: 380, useNativeDriver: true }),
          Animated.delay(280),
        ])).start();
        break;

      case 3: // Level Out
        Animated.loop(Animated.sequence([
          Animated.parallel([
            Animated.timing(lift, { toValue: -65, duration: 450, useNativeDriver: true }),
            Animated.timing(nose, { toValue: 1,   duration: 380, useNativeDriver: true }),
            Animated.timing(rotX, { toValue: 0,   duration: 380, useNativeDriver: true }),
          ]),
          wobble(rotY, 8, 500),
          Animated.timing(nose, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(lift, { toValue: 0, duration: 420, useNativeDriver: true }),
          Animated.delay(300),
        ])).start();
        break;

      case 4: // Landing
        Animated.loop(Animated.sequence([
          Animated.timing(lift, { toValue: -45, duration: 350, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(lift, { toValue: 0,   duration: 250, useNativeDriver: true }),
            Animated.timing(all,  { toValue: 1,   duration: 150, useNativeDriver: true }),
          ]),
          Animated.timing(all, { toValue: 0, duration: 380, useNativeDriver: true }),
          Animated.delay(480),
        ])).start();
        wobble(rotY, 3, 1800).start();
        break;

      default:
        wobble(rotY, 5, 2000).start();
    }

    return reset;
  }, [stepIndex, phase]);

  // Interpolations
  const rx = rotX.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const ry = rotY.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });
  const rz = rotZ.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  // Shadow opacity / scale based on lift
  const shadowOp = lift.interpolate({ inputRange: [-80, 0], outputRange: [0.08, 0.5] });
  const shadowSc = lift.interpolate({ inputRange: [-80, 0], outputRange: [0.55, 1] });

  return (
    <View style={[s.scene, style]}>
      {/* Drop shadow */}
      <Animated.View style={[s.shadow, { opacity: shadowOp, transform: [{ scaleX: shadowSc }] }]} />

      <Animated.View style={[s.boardRoot, {
        transform: [
          { perspective: 900 },
          { rotateX: rx },
          { rotateY: ry },
          { rotateZ: rz },
          { translateY: lift },
        ],
      }]}>

        {/* ── Wheels (behind deck) ── */}
        {[[-W / 2 - 7, 50], [W / 2 - 9, 50], [-W / 2 - 7, H - 66], [W / 2 - 9, H - 66]].map(([x, y], i) => (
          <View key={i} style={[s.wheel, { left: x, top: y }]} />
        ))}

        {/* ── Trucks ── */}
        <View style={[s.truck, { top: 46 }]} />
        <View style={[s.truck, { bottom: 46 }]} />

        {/* ── Deck ── */}
        <View style={s.deck}>
          {/* Veneer edge */}
          <View style={s.veneer} />
          {/* Grip tape */}
          <View style={s.grip} />

          {/* Concave lines */}
          <View style={[s.concave, { left: 9 }]} />
          <View style={[s.concave, { right: 9 }]} />

          {/* Pressure zones */}
          <Animated.View style={[s.zoneTail, { opacity: tail, backgroundColor: trickColor }]} />
          <Animated.View style={[s.zoneNose, { opacity: nose, backgroundColor: trickColor }]} />
          <Animated.View style={[s.zoneHeel, { opacity: heel, backgroundColor: trickColor }]} />
          <Animated.View style={[s.zoneToe,  { opacity: toe,  backgroundColor: trickColor }]} />
          <Animated.View style={[s.zoneAll,  { opacity: all,  backgroundColor: trickColor }]} />

          {/* Back foot silhouette */}
          <Animated.View style={[s.footBack, { opacity: tail.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.65] }) }]} />
          {/* Front foot silhouette */}
          <Animated.View style={[s.footFront, { opacity: heel.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.5] }) }]} />

          {/* Bolts */}
          {[{ top: 46, left: 22 }, { top: 46, right: 22 }, { bottom: 46, left: 22 }, { bottom: 46, right: 22 }].map((p, i) => (
            <View key={i} style={[s.bolt, p]} />
          ))}

          {/* Center graphic line */}
          <View style={s.centerLine} />
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  scene: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
  },
  boardRoot: {
    width: W + 24, height: H + 24,
    alignItems: 'center', justifyContent: 'center',
  },
  shadow: {
    position: 'absolute', bottom: 4,
    width: W * 0.85, height: 18,
    backgroundColor: '#000', borderRadius: 40,
  },

  // Wheels
  wheel: {
    position: 'absolute', width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#3a3a3a',
    borderWidth: 2, borderColor: '#555',
  },
  // Trucks (horizontal bars)
  truck: {
    position: 'absolute', left: -6,
    width: W + 12, height: 11,
    backgroundColor: '#6a6a6a', borderRadius: 5,
    zIndex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, elevation: 3,
  },

  // Deck
  deck: {
    width: W, height: H,
    borderRadius: 24,
    backgroundColor: '#2a1508',
    overflow: 'hidden',
    zIndex: 2,
    borderWidth: 2, borderColor: '#4a2e12',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, elevation: 6,
  },
  veneer: {
    position: 'absolute', inset: 0,
    borderRadius: 23,
    backgroundColor: '#3d2010',
  },
  grip: {
    position: 'absolute', inset: 5,
    borderRadius: 19,
    backgroundColor: '#0e0e0e',
  },
  concave: {
    position: 'absolute', top: 16, bottom: 16,
    width: 3, backgroundColor: '#1a1a1a', borderRadius: 2, zIndex: 3,
  },

  // Pressure zones
  zoneTail:  { position: 'absolute', bottom: 10, left: '18%', right: '18%', height: 52, borderRadius: 16 },
  zoneNose:  { position: 'absolute', top: 10,    left: '18%', right: '18%', height: 46, borderRadius: 16 },
  zoneHeel:  { position: 'absolute', left: 7,    top: '30%',  bottom: '28%', width: 30, borderRadius: 15 },
  zoneToe:   { position: 'absolute', right: 7,   top: '30%',  bottom: '28%', width: 30, borderRadius: 15 },
  zoneAll:   { position: 'absolute', inset: 8,   borderRadius: 18 },

  // Foot silhouettes
  footBack: {
    position: 'absolute', bottom: 26, left: '18%', right: '18%',
    height: 28, backgroundColor: '#fff', borderRadius: 10,
  },
  footFront: {
    position: 'absolute', top: '36%', left: '12%', right: '12%',
    height: 22, backgroundColor: '#fff', borderRadius: 8,
    transform: [{ rotate: '-7deg' }],
  },

  bolt: {
    position: 'absolute', width: 6, height: 6,
    borderRadius: 3, backgroundColor: '#5a3a18',
    borderWidth: 1, borderColor: '#8a6030',
  },
  centerLine: {
    position: 'absolute', left: '48%', right: '48%',
    top: 80, bottom: 80,
    backgroundColor: '#1a1a1a', borderRadius: 2,
  },
});
