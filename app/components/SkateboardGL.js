import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

const BW = 112;  // board width
const BH = 240;  // board height

function useAnim(initial) {
  return useRef(new Animated.Value(initial)).current;
}

function pulse(anim, lo, hi, dur = 900) {
  return Animated.loop(Animated.sequence([
    Animated.timing(anim, { toValue: hi, duration: dur, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    Animated.timing(anim, { toValue: lo, duration: dur, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
  ]));
}

function stop(...anims) {
  anims.forEach(a => { a.stopAnimation(); a.setValue(0); });
}

// Foot silhouette (top-down view)
function Foot({ x, y, rotation, opacity, scaleY = 1, color = '#fff' }) {
  return (
    <Animated.View style={[
      styles.foot,
      {
        left: x, top: y,
        opacity,
        transform: [
          { rotate: rotation },
          { scaleY },
        ],
        backgroundColor: color,
      }
    ]}>
      <View style={styles.footToe} />
    </Animated.View>
  );
}

export default function SkateboardGL({ stepIndex = 0, phase = 'steps', trickColor = '#4CAF50', style }) {
  // Board transforms
  const boardY    = useAnim(0);
  const boardSc   = useAnim(1);
  const boardRotZ = useAnim(0);

  // FSR zones
  const zTail = useAnim(0);
  const zNose = useAnim(0);
  const zHeel = useAnim(0);
  const zToe  = useAnim(0);

  // Feet
  const bfX     = useAnim(0);   // back foot x offset
  const bfY     = useAnim(0);   // back foot Y along board
  const bfPressY= useAnim(1);   // back foot vertical press (scaleY)
  const bfOp    = useAnim(1);
  const ffX     = useAnim(0);   // front foot x
  const ffY     = useAnim(0);   // front foot Y along board (negative = toward nose)
  const ffOp    = useAnim(1);
  const ffPressY= useAnim(1);

  useEffect(() => {
    // Clean up everything
    stop(boardY, boardSc, boardRotZ, zTail, zNose, zHeel, zToe,
         bfX, bfY, bfPressY, bfOp, ffX, ffY, ffOp, ffPressY);
    boardSc.setValue(1);
    bfPressY.setValue(1); ffPressY.setValue(1);
    bfOp.setValue(1); ffOp.setValue(1);

    if (phase === 'combine') {
      // Full trick: pop → fly → flip → land
      Animated.loop(Animated.sequence([
        // Load
        Animated.parallel([
          Animated.timing(zTail, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(bfPressY, { toValue: 0.7, duration: 200, useNativeDriver: true }),
          Animated.timing(bfY, { toValue: 6, duration: 200, useNativeDriver: true }),
        ]),
        // Pop & rise
        Animated.parallel([
          Animated.timing(boardY, { toValue: -55, duration: 380, useNativeDriver: true }),
          Animated.timing(boardSc, { toValue: 0.82, duration: 280, useNativeDriver: true }),
          Animated.timing(zTail, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(bfPressY, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(bfOp, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(ffOp, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(zHeel, { toValue: 0.9, duration: 220, useNativeDriver: true }),
        ]),
        // Flip (spin board)
        Animated.parallel([
          Animated.timing(boardRotZ, { toValue: 360, duration: 380, useNativeDriver: true }),
          Animated.timing(zHeel, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        // Peak
        Animated.delay(100),
        // Land
        Animated.parallel([
          Animated.timing(boardY, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(boardSc, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(boardRotZ, { toValue: 0, duration: 1, useNativeDriver: true }),
          Animated.timing(bfOp, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(ffOp, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
        // Impact flash all zones
        Animated.parallel([
          Animated.timing(zTail, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(zNose, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(zHeel, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(zToe,  { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(zTail, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(zNose, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(zHeel, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(zToe,  { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
        Animated.delay(550),
      ])).start();
      return;
    }

    switch (stepIndex) {
      case 0: // Foot Position — skating stance, idle
        pulse(zTail, 0.08, 0.45, 1000).start();
        pulse(zHeel, 0.06, 0.38, 1200).start();
        pulse(boardRotZ, -1.5, 1.5, 2200).start();
        break;

      case 1: // Pop — tail slap
        Animated.loop(Animated.sequence([
          // Load — back foot presses
          Animated.parallel([
            Animated.timing(zTail, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(bfPressY, { toValue: 0.65, duration: 180, useNativeDriver: true }),
            Animated.timing(bfY, { toValue: 8, duration: 180, useNativeDriver: true }),
          ]),
          // Pop — board lifts
          Animated.parallel([
            Animated.timing(boardY, { toValue: -50, duration: 320, useNativeDriver: true }),
            Animated.timing(boardSc, { toValue: 0.85, duration: 260, useNativeDriver: true }),
            Animated.timing(zTail, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(bfPressY, { toValue: 1, duration: 160, useNativeDriver: true }),
            Animated.timing(bfY, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]),
          // Peak
          Animated.delay(180),
          // Land
          Animated.parallel([
            Animated.timing(boardY, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(boardSc, { toValue: 1, duration: 240, useNativeDriver: true }),
          ]),
          // Impact
          Animated.parallel([
            Animated.timing(zTail, { toValue: 0.7, duration: 100, useNativeDriver: true }),
            Animated.timing(zNose, { toValue: 0.4, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(zTail, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(zNose, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.delay(350),
        ])).start();
        break;

      case 2: // Slide — front foot drags up toward nose
        Animated.loop(Animated.sequence([
          // Board lifts
          Animated.parallel([
            Animated.timing(boardY, { toValue: -40, duration: 420, useNativeDriver: true }),
            Animated.timing(boardSc, { toValue: 0.88, duration: 380, useNativeDriver: true }),
            Animated.timing(zHeel, { toValue: 0.6, duration: 320, useNativeDriver: true }),
          ]),
          // Front foot slides toward nose (upward in top-down = toward nose)
          Animated.parallel([
            Animated.timing(ffY, { toValue: -50, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
            Animated.timing(zHeel, { toValue: 1.0, duration: 400, useNativeDriver: true }),
            Animated.timing(zToe,  { toValue: 0.4, duration: 400, useNativeDriver: true }),
          ]),
          Animated.delay(200),
          // Reset
          Animated.parallel([
            Animated.timing(boardY, { toValue: 0, duration: 380, useNativeDriver: true }),
            Animated.timing(boardSc, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(ffY, { toValue: 0, duration: 350, useNativeDriver: true }),
            Animated.timing(zHeel, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(zToe,  { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.delay(300),
        ])).start();
        break;

      case 3: // Level Out — board flat in air, front foot on nose
        Animated.timing(boardY, { toValue: -45, duration: 500, useNativeDriver: true }).start();
        Animated.timing(boardSc, { toValue: 0.84, duration: 450, useNativeDriver: true }).start();
        Animated.timing(ffY, { toValue: -52, duration: 480, useNativeDriver: true }).start();
        pulse(zNose, 0.4, 1.0, 700).start();
        pulse(boardRotZ, -2, 2, 1800).start();
        break;

      case 4: // Landing — stomp
        Animated.loop(Animated.sequence([
          // Fall
          Animated.parallel([
            Animated.timing(boardY, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(boardSc, { toValue: 1.0, duration: 250, useNativeDriver: true }),
          ]),
          // Impact — board briefly squashes then bounces
          Animated.timing(boardSc, { toValue: 1.06, duration: 80, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(boardSc, { toValue: 1.0, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.elastic(1.5)) }),
            Animated.timing(zTail, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(zNose, { toValue: 0.7, duration: 100, useNativeDriver: true }),
            Animated.timing(zHeel, { toValue: 0.5, duration: 100, useNativeDriver: true }),
            Animated.timing(zToe,  { toValue: 0.5, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(zTail, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(zNose, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(zHeel, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.timing(zToe,  { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          Animated.delay(600),
          // Board rises again for next loop
          Animated.timing(boardY, { toValue: -42, duration: 350, useNativeDriver: true }),
          Animated.timing(boardSc, { toValue: 0.86, duration: 300, useNativeDriver: true }),
          Animated.delay(150),
        ])).start();
        break;

      default:
        pulse(boardRotZ, -1, 1, 2400).start();
    }

    return () => stop(boardY, boardSc, boardRotZ, zTail, zNose, zHeel, zToe,
                      bfX, bfY, bfPressY, bfOp, ffX, ffY, ffOp, ffPressY);
  }, [stepIndex, phase]);

  const rotStr = boardRotZ.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

  return (
    <View style={[styles.scene, style]}>
      {/* Shadow under board */}
      <Animated.View style={[styles.shadow, {
        transform: [{ scaleX: boardSc }, { scaleY: boardSc }],
        opacity: boardY.interpolate({ inputRange: [-60, 0], outputRange: [0.1, 0.45] }),
      }]} />

      {/* Board */}
      <Animated.View style={[styles.boardWrap, {
        transform: [
          { perspective: 800 },
          { translateY: boardY },
          { scale: boardSc },
          { rotate: rotStr },
        ],
      }]}>
        {/* Deck */}
        <View style={styles.deck}>
          {/* Grip tape */}
          <View style={styles.grip} />

          {/* Nose zone (FSR1) */}
          <Animated.View style={[styles.zoneNose, { opacity: zNose, backgroundColor: trickColor }]} />

          {/* Heel zone (FSR2) */}
          <Animated.View style={[styles.zoneHeel, { opacity: zHeel, backgroundColor: trickColor }]} />

          {/* Toe zone (FSR3) */}
          <Animated.View style={[styles.zoneToe, { opacity: zToe, backgroundColor: trickColor }]} />

          {/* Tail zone (FSR4) */}
          <Animated.View style={[styles.zoneTail, { opacity: zTail, backgroundColor: trickColor }]} />

          {/* Concave edge lines */}
          <View style={[styles.concave, { left: 9 }]} />
          <View style={[styles.concave, { right: 9 }]} />

          {/* Center stripe */}
          <View style={styles.centerLine} />

          {/* Bolts */}
          {[{ top: 50, left: 26 }, { top: 50, right: 26 }, { bottom: 50, left: 26 }, { bottom: 50, right: 26 }].map((p, i) => (
            <View key={i} style={[styles.bolt, p]} />
          ))}

          {/* Back foot (regular stance — tail area, perpendicular) */}
          <Animated.View style={[styles.footBack, {
            opacity: bfOp,
            transform: [
              { translateX: bfX },
              { translateY: bfY },
              { scaleY: bfPressY },
            ],
          }]}>
            <View style={styles.footBackToe} />
          </Animated.View>

          {/* Front foot (angled ~45° toward heel side, front trucks area) */}
          <Animated.View style={[styles.footFront, {
            opacity: ffOp,
            transform: [
              { translateX: ffX },
              { translateY: ffY },
            ],
          }]}>
            <View style={styles.footFrontTip} />
          </Animated.View>
        </View>

        {/* Trucks & wheels */}
        {[{ top: -12 }, { bottom: -12 }].map((pos, i) => (
          <View key={i} style={[styles.truck, pos]}>
            <View style={styles.wheel} />
            <View style={styles.truckBar} />
            <View style={styles.wheel} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20,
  },
  shadow: {
    position: 'absolute',
    width: BW * 0.9, height: 18,
    backgroundColor: '#000',
    borderRadius: 30,
    bottom: 8,
  },
  boardWrap: {
    alignItems: 'center',
  },

  // Deck
  deck: {
    width: BW, height: BH,
    borderRadius: 22,
    backgroundColor: '#1e1208',
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#3a2510',
  },
  grip: {
    position: 'absolute', inset: 5,
    borderRadius: 18,
    backgroundColor: '#111111',
  },
  concave: {
    position: 'absolute', top: 14, bottom: 14,
    width: 3, backgroundColor: '#1c1c1c', borderRadius: 2, zIndex: 1,
  },
  centerLine: {
    position: 'absolute', top: 60, bottom: 60,
    left: '47%', right: '47%',
    backgroundColor: '#1a1a1a', borderRadius: 2,
  },
  bolt: {
    position: 'absolute', width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: '#3a3020',
    borderWidth: 1, borderColor: '#6a5830',
  },

  // FSR Zones
  zoneNose: {
    position: 'absolute', top: 8, left: '14%', right: '14%', height: 52,
    borderRadius: 14, opacity: 0,
  },
  zoneTail: {
    position: 'absolute', bottom: 8, left: '14%', right: '14%', height: 58,
    borderRadius: 14, opacity: 0,
  },
  zoneHeel: {
    position: 'absolute', left: 8, top: '28%', bottom: '26%',
    width: 28, borderRadius: 14, opacity: 0,
  },
  zoneToe: {
    position: 'absolute', right: 8, top: '28%', bottom: '26%',
    width: 28, borderRadius: 14, opacity: 0,
  },

  // Back foot (tail area — perpendicular to board)
  footBack: {
    position: 'absolute',
    bottom: 66, left: '12%', right: '12%',
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'flex-end', justifyContent: 'center',
  },
  footBackToe: {
    width: 16, height: 24, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginRight: 2,
  },

  // Front foot (angled ~45° — skate stance over front trucks)
  footFront: {
    position: 'absolute',
    top: 66,
    left: '22%',
    width: 26, height: 72,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '-42deg' }],
    alignItems: 'center', justifyContent: 'flex-end',
  },
  footFrontTip: {
    width: 20, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: 2,
  },

  // Trucks
  truck: {
    position: 'absolute', left: -8, right: -8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 14,
  },
  truckBar: {
    flex: 1, height: 10, backgroundColor: '#7a7a7a',
    borderRadius: 5, marginHorizontal: 2,
  },
  wheel: {
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: '#eeeeee',
    borderWidth: 2, borderColor: '#aaaaaa',
  },
});
