import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';
const ORBIT_CDN = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/controls/OrbitControls.js';

function buildHTML(trickColor) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0a0a0a;overflow:hidden;touch-action:none}
  canvas{display:block;width:100vw;height:100vh}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script src="${THREE_CDN}"></script>
<script src="${ORBIT_CDN}"></script>
<script>
// ── Renderer ──────────────────────────────────────────────
var W = window.innerWidth, H = window.innerHeight;
var renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('c'),
  antialias: true,
});
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0a);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Scene & Camera ────────────────────────────────────────
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(46, W/H, 0.01, 100);
camera.position.set(2.2, 3.2, 5.5);
camera.lookAt(0, 0, 0);

// ── Controls ──────────────────────────────────────────────
var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enableZoom = false;
controls.enablePan = false;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.65;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;

// ── Lights ────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

var key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(4, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 30;
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 8;
key.shadow.camera.bottom = -3;
scene.add(key);

var fill = new THREE.DirectionalLight(0x8899dd, 0.4);
fill.position.set(-5, 2, -3);
scene.add(fill);

var rim = new THREE.DirectionalLight(0xffffff, 0.5);
rim.position.set(0, -2, -5);
scene.add(rim);

var ACCENT = new THREE.Color('${trickColor}');
var accentLight = new THREE.PointLight(ACCENT, 0.0, 7);
accentLight.position.set(0, 1.5, 1);
scene.add(accentLight);

// ── Ground ────────────────────────────────────────────────
var groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 22),
  new THREE.MeshPhongMaterial({ color: 0x0f0f0f, shininess: 3 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -1.35;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

var fakeShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.4, 5.6),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
);
fakeShadow.rotation.x = -Math.PI / 2;
fakeShadow.position.y = -1.34;
scene.add(fakeShadow);

// ── Materials ─────────────────────────────────────────────
var mDeck  = new THREE.MeshPhongMaterial({ color: 0x2d1a08, shininess: 22 });
var mGrip  = new THREE.MeshPhongMaterial({ color: 0x0d0d0d, shininess: 1  });
var mVeneer= new THREE.MeshPhongMaterial({ color: 0x3d2410, shininess: 10 });
var mTruck = new THREE.MeshPhongMaterial({ color: 0xa0a0a0, shininess: 110 });
var mAxle  = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 140 });
var mWheel = new THREE.MeshPhongMaterial({ color: 0xeeeeee, shininess: 60  });
var mHub   = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 120 });
var mBolt  = new THREE.MeshPhongMaterial({ color: 0x777777, shininess: 200 });

function makeZoneMat() {
  return new THREE.MeshPhongMaterial({
    color: 0x000000,
    emissive: ACCENT,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0.9,
  });
}

// ── Board group ───────────────────────────────────────────
var boardGroup = new THREE.Group();
scene.add(boardGroup);

// Dimensions
var DW = 2.0,  DH = 0.092, DL = 5.0;   // deck
var KL = 1.05, KH = 0.092;              // kick length

// ── Deck body ─────────────────────────────────────────────
var deckBody = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, DL - KL * 1.6), mDeck);
boardGroup.add(deckBody);

// Nose kick (angles upward ~12°)
var noseKick = new THREE.Mesh(new THREE.BoxGeometry(DW, KH, KL), mDeck);
noseKick.position.set(0, 0.072, -(DL/2 - KL/2) + 0.05);
noseKick.rotation.x = 0.21;
boardGroup.add(noseKick);

// Tail kick (angles upward ~17°)
var tailKick = new THREE.Mesh(new THREE.BoxGeometry(DW, KH, KL * 1.1), mDeck);
tailKick.position.set(0, 0.10, (DL/2 - KL*1.1/2) + 0.05);
tailKick.rotation.x = -0.30;
boardGroup.add(tailKick);

// Veneer strip (visible wood layers on side)
[-DH/2, DH/2].forEach(function(y) {
  var v = new THREE.Mesh(new THREE.BoxGeometry(DW, 0.012, DL - KL * 1.6), mVeneer);
  v.position.set(0, y, 0);
  boardGroup.add(v);
});

// Grip tape (flat center)
var grip = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.06, 0.022, DL - KL * 1.6), mGrip);
grip.position.set(0, DH/2 + 0.011, 0);
boardGroup.add(grip);

// Nose grip
var noseGrip = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.06, 0.022, KL), mGrip);
noseGrip.position.set(0, DH/2 + 0.011 + 0.072, -(DL/2 - KL/2) + 0.05);
noseGrip.rotation.x = 0.21;
boardGroup.add(noseGrip);

// Tail grip
var tailGrip = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.06, 0.022, KL * 1.1), mGrip);
tailGrip.position.set(0, DH/2 + 0.011 + 0.10, (DL/2 - KL*1.1/2) + 0.05);
tailGrip.rotation.x = -0.30;
boardGroup.add(tailGrip);

// Concave edge strips
[-0.86, 0.86].forEach(function(x) {
  var c = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, DL - KL * 1.6), mGrip);
  c.position.set(x, DH/2 + 0.02, 0);
  boardGroup.add(c);
});

// ── Pressure zones ────────────────────────────────────────
var zoneMats = { tail: makeZoneMat(), nose: makeZoneMat(), heel: makeZoneMat(), toe: makeZoneMat() };

var zoneTail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.024, 1.1), zoneMats.tail);
zoneTail.position.set(0, DH/2 + 0.022, 1.9);
zoneTail.rotation.x = -0.28;
boardGroup.add(zoneTail);

var zoneNose = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.024, 0.95), zoneMats.nose);
zoneNose.position.set(0, DH/2 + 0.022, -1.85);
zoneNose.rotation.x = 0.20;
boardGroup.add(zoneNose);

var zoneHeel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.024, 2.1), zoneMats.heel);
zoneHeel.position.set(-0.72, DH/2 + 0.022, 0);
boardGroup.add(zoneHeel);

var zoneToe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.024, 2.1), zoneMats.toe);
zoneToe.position.set(0.72, DH/2 + 0.022, 0);
boardGroup.add(zoneToe);

// ── Bolts ─────────────────────────────────────────────────
[[-0.58, -1.6], [0.58, -1.6], [-0.58, 1.6], [0.58, 1.6]].forEach(function(xz) {
  var bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8),
    mBolt
  );
  bolt.position.set(xz[0], DH/2 + 0.022, xz[1]);
  boardGroup.add(bolt);
});

// ── Trucks ────────────────────────────────────────────────
function addTruck(z) {
  var g = new THREE.Group();

  // Baseplate
  var bp = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.13, 0.42), mTruck);
  bp.position.set(0, -0.12, 0);
  g.add(bp);

  // Kingpin nut
  var kp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.17, 6), mTruck);
  kp.position.set(0, -0.06, 0);
  g.add(kp);

  // Hanger (T-shape approximated with two boxes)
  var hanger = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.2, 0.28), mTruck);
  hanger.position.set(0, -0.2, 0);
  g.add(hanger);

  var hangerWing = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.1, 0.42), mTruck);
  hangerWing.position.set(0, -0.14, 0);
  g.add(hangerWing);

  // Axle rod
  var axle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 2.52, 10), mAxle);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, -0.25, 0);
  g.add(axle);

  // Wheels
  [[-1.17, 0], [1.17, 0]].forEach(function(xr) {
    var wheelGroup = new THREE.Group();

    var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.30, 22), mWheel);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    wheelGroup.add(wheel);

    // Hub
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.32, 12), mHub);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    // Bearing
    var bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 8), mBolt);
    bearing.rotation.z = Math.PI / 2;
    wheelGroup.add(bearing);

    // Axle nut (small cube at end)
    var nut = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.10), mBolt);
    nut.position.x = xr[0] > 0 ? 1.25 : -1.25;
    wheelGroup.add(nut);

    wheelGroup.position.set(xr[0], -0.27, 0);
    g.add(wheelGroup);
  });

  g.position.set(0, -DH/2, z);
  boardGroup.add(g);
  return g;
}

var truckFront = addTruck(-1.6);
var truckBack  = addTruck( 1.6);

// ── Apply cast shadows ────────────────────────────────────
boardGroup.traverse(function(obj) {
  if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
});

// ── Animation state ───────────────────────────────────────
var stepIndex = 0, phase = 'steps', t = 0;

// ── Message handler ───────────────────────────────────────
function onMsg(e) {
  try {
    var d = JSON.parse(e.data);
    if (d.type === 'update') { stepIndex = d.stepIndex || 0; phase = d.phase || 'steps'; }
  } catch(err) {}
}
document.addEventListener('message', onMsg);
window.addEventListener('message', onMsg);
setTimeout(function() { try { window.ReactNativeWebView.postMessage('ready'); } catch(e) {} }, 100);

// ── Helpers ───────────────────────────────────────────────
function setZones(t, n, h, toe) {
  zoneMats.tail.emissiveIntensity = t;
  zoneMats.nose.emissiveIntensity = n;
  zoneMats.heel.emissiveIntensity = h;
  zoneMats.toe.emissiveIntensity  = toe;
}
function pulse(freq, lo, hi) { return lo + (hi-lo)*(0.5+0.5*Math.sin(t*freq)); }

// ── Render loop ───────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  controls.update();

  setZones(0, 0, 0, 0);
  accentLight.intensity = 0;

  if (phase === 'combine') {
    var cy = (t % 4.2) / 4.2;
    if (cy < 0.12) {
      boardGroup.rotation.x = cy * -7;
      boardGroup.position.y = 0;
      setZones(cy*8, 0, 0, 0);
      accentLight.intensity = cy * 12;
    } else if (cy < 0.30) {
      var p=(cy-0.12)/0.18;
      boardGroup.position.y = p * 2.2;
      boardGroup.rotation.x = -0.84 + p * 0.9;
      setZones((1-p)*0.7, 0, 0, 0);
      accentLight.intensity = (1-p)*4;
    } else if (cy < 0.60) {
      var p=(cy-0.30)/0.30;
      boardGroup.position.y = 2.2 - p*0.4;
      boardGroup.rotation.z = p * Math.PI * 2;
      setZones(0, 0, Math.sin(p*Math.PI)*0.9, 0);
      accentLight.intensity = Math.sin(p*Math.PI)*5;
    } else if (cy < 0.74) {
      var p=(cy-0.60)/0.14;
      boardGroup.position.y = 1.8*(1-p);
      boardGroup.rotation.z = Math.PI*2*(1-p*0.04);
      accentLight.intensity = p > 0.8 ? (p-0.8)*5*6 : 0;
    } else {
      boardGroup.position.y = 0;
      boardGroup.rotation.z = 0;
      boardGroup.rotation.x = Math.sin(t*0.6)*0.05;
      boardGroup.rotation.y = Math.sin(t*0.4)*0.10;
      setZones(0,0,0,0);
      accentLight.intensity = 0.4;
    }
  } else {
    switch(stepIndex) {
      case 0:
        boardGroup.position.y = 0;
        boardGroup.rotation.x = Math.sin(t*0.5)*0.055;
        boardGroup.rotation.y = Math.sin(t*0.32)*0.14;
        setZones(pulse(1.2,0.1,0.55), 0, pulse(1.0,0.1,0.60), 0);
        accentLight.intensity = pulse(1.2, 0.3, 1.2);
        break;
      case 1:
        var c=(t%2.4)/2.4;
        if(c<0.12){
          boardGroup.rotation.x=c*-9; boardGroup.position.y=0;
          setZones(c*8,0,0,0); accentLight.intensity=c*12;
        } else if(c<0.40){
          var p=(c-0.12)/0.28;
          boardGroup.position.y=p*1.7; boardGroup.rotation.x=-1.08+p*1.1;
          setZones((1-p)*0.8,0,0,0); accentLight.intensity=(1-p)*4;
        } else {
          boardGroup.position.y=Math.max(0,1.7*(1-(c-0.40)/0.60));
          boardGroup.rotation.x=Math.sin(t*0.5)*0.05;
          boardGroup.rotation.y=Math.sin(t*0.35)*0.1;
        }
        break;
      case 2:
        var c=(t%2.6)/2.6;
        boardGroup.position.y=c<0.5?c*2*1.6:1.6*(1-(c-0.5)*2);
        boardGroup.rotation.x=Math.sin(t*1.1)*0.22;
        boardGroup.rotation.z=Math.sin(t*0.65)*0.06;
        setZones(0, 0, pulse(1.9,0.3,1.0), pulse(1.9,0.1,0.4));
        accentLight.intensity=pulse(1.7,0.5,2.5);
        break;
      case 3:
        boardGroup.position.y=1.3+Math.sin(t)*0.32;
        boardGroup.rotation.x=Math.sin(t*0.85)*0.14;
        boardGroup.rotation.z=Math.sin(t*0.65)*0.09;
        boardGroup.rotation.y=Math.sin(t*0.48)*0.14;
        setZones(0, pulse(1.5,0.4,1.0), 0, 0);
        accentLight.intensity=pulse(1.2,1.5,3.5);
        break;
      case 4:
        var c=(t%2.1)/2.1;
        boardGroup.position.y=c<0.38?1.5*(1-c/0.38):0;
        if(boardGroup.position.y<0.06){
          var imp=Math.max(0,0.9-(t%2.1-0.8)*2);
          setZones(imp,imp,imp,imp);
          accentLight.intensity=imp*5;
        }
        boardGroup.rotation.x=Math.sin(t*0.5)*0.05;
        boardGroup.rotation.y=Math.sin(t*0.36)*0.1;
        break;
      default:
        boardGroup.rotation.y+=0.005;
    }
  }

  // Shadow
  var ly=boardGroup.position.y;
  fakeShadow.scale.set(Math.max(0.35,1-ly*0.13),Math.max(0.35,1-ly*0.13),1);
  fakeShadow.material.opacity=Math.max(0.04,0.55-ly*0.1);

  renderer.render(scene, camera);
}
animate();
</script>
</body>
</html>`;
}

export default function SkateboardGL({ stepIndex = 0, phase = 'steps', trickColor = '#4CAF50', style }) {
  const webviewRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'update', stepIndex, phase }));
  }, [stepIndex, phase, ready]);

  return (
    <View style={[s.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: buildHTML(trickColor) }}
        originWhitelist={['*']}
        javaScriptEnabled
        style={s.webview}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'ready') setReady(true);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#0a0a0a' },
  webview: { backgroundColor: '#0a0a0a', flex: 1 },
});
