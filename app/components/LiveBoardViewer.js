import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';
const GLTF_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js';

// ── Three.js WebView scene ──────────────────────────────────────────────────
const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0d0d1a;overflow:hidden;touch-action:none}
  canvas{display:block;width:100vw;height:100vh}
  #loader{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d0d1a;font-family:sans-serif;color:#555;font-size:12px;letter-spacing:2px}
</style>
</head>
<body>
<div id="loader">LOADING MODEL...</div>
<canvas id="c"></canvas>
<script src="${THREE_CDN}"></script>
<script src="${GLTF_CDN}"></script>
<script>
var W = window.innerWidth, H = window.innerHeight;
var DEG = Math.PI / 180;

// Renderer
var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x0d0d1a);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// Scene
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0d1a, 12, 22);

// Camera — fixed 3/4 view from slightly above-front
var camera = new THREE.PerspectiveCamera(48, W/H, 0.01, 50);
camera.position.set(0, 3.5, 6.0);
camera.lookAt(0, 0, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
var key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(4,8,5); scene.add(key);
var fill = new THREE.DirectionalLight(0x8899cc, 0.35); fill.position.set(-4,2,-3); scene.add(fill);
var rim  = new THREE.DirectionalLight(0xffffff, 0.4);  rim.position.set(0,-2,-4); scene.add(rim);
var glow = new THREE.PointLight(0x4488ff, 0.0, 6); glow.position.set(0,1,0); scene.add(glow);

// Ground
var ground = new THREE.Mesh(
  new THREE.PlaneGeometry(12,18),
  new THREE.MeshPhongMaterial({color:0x111122,shininess:4})
);
ground.rotation.x = -Math.PI/2; ground.position.y = -1.4;
scene.add(ground);

// Board group — sensor rotation applied here
var boardGroup = new THREE.Group();
scene.add(boardGroup);

// State
var model = null;
var modelReady = false;
var simMode = false;
var t = 0;

// Rotation targets (degrees, from React Native after calibration)
var tPitch = 0, tRoll = 0, tYaw = 0;
// Smoothed current values (degrees)
var cPitch = 0, cRoll = 0, cYaw = 0;

// Load GLB from base64
function loadModel(b64) {
  try {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    var loader = new THREE.GLTFLoader();
    loader.parse(bytes.buffer,'',function(gltf){
      model = gltf.scene;
      // Auto-center + auto-scale to fit in ~2 units
      var box = new THREE.Box3().setFromObject(model);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      var maxDim = Math.max(size.x, size.y, size.z);
      var s = 2.0 / maxDim;
      model.scale.setScalar(s);
      model.position.set(-center.x*s, -center.y*s, -center.z*s);
      boardGroup.add(model);
      // Fit camera to actual model bounds
      var fb = new THREE.Box3().setFromObject(boardGroup);
      var sp = new THREE.Sphere(); fb.getBoundingSphere(sp);
      var r = sp.radius;
      camera.position.set(sp.center.x + r*0.6, sp.center.y + r*2.0, sp.center.z + r*3.2);
      camera.lookAt(sp.center);
      document.getElementById('loader').style.display='none';
      modelReady = true;
      try { window.ReactNativeWebView.postMessage('loaded'); } catch(e){}
    },function(err){
      document.getElementById('loader').textContent='ERROR';
    });
  } catch(e) { document.getElementById('loader').textContent='PARSE ERROR'; }
}

// Message handler — React Native → WebView
function onMsg(e){
  try {
    var d = JSON.parse(e.data);
    if(d.type==='model')  loadModel(d.base64);
    if(d.type==='sensor') { tPitch=d.pitch||0; tRoll=d.roll||0; tYaw=d.yaw||0; }
    if(d.type==='sim')    simMode = !!d.value;
    if(d.type==='glow')   glow.intensity = d.value || 0;
  } catch(e){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
setTimeout(function(){ try{window.ReactNativeWebView.postMessage('ready');}catch(e){} },120);

// Animation loop
function animate(){
  requestAnimationFrame(animate);
  t += 0.016;

  if(modelReady){
    if(simMode){
      // Simulated gentle ollie for demo/testing
      var simCycle = (t%5.0)/5.0;
      if(simCycle<0.12){
        tPitch = simCycle*-100; // pop tilt
        glow.intensity = simCycle*3;
      } else if(simCycle<0.35){
        var p=(simCycle-0.12)/0.23;
        tPitch = -12 + p*15;
        tRoll  = Math.sin(p*Math.PI)*8;
        glow.intensity = (1-p)*2;
      } else if(simCycle<0.65){
        var p=(simCycle-0.35)/0.30;
        tPitch = 3 + Math.sin(p*Math.PI)*5;
        tRoll  = Math.sin(p*Math.PI*2)*6;
      } else {
        tPitch = Math.sin(t*0.5)*3;
        tRoll  = Math.sin(t*0.4)*2;
        glow.intensity = 0;
      }
    }

    // Smooth lerp — pitch/roll responsive, yaw slower (drifts)
    cPitch += (tPitch - cPitch) * 0.15;
    cRoll  += (tRoll  - cRoll)  * 0.15;
    cYaw   += (tYaw   - cYaw)   * 0.10;

    // Apply rotation to board group
    // pitch = nose up/down (X axis)
    // roll  = left/right tilt (Z axis, negated so roll right = board tilts right visually)
    // yaw   = spin on Y axis
    boardGroup.rotation.x = cPitch * DEG;
    boardGroup.rotation.z = -cRoll  * DEG;
    boardGroup.rotation.y = cYaw   * DEG;
  }

  renderer.render(scene,camera);
}
animate();
</script>
</body>
</html>`;

// ── Component ───────────────────────────────────────────────────────────────
export default function LiveBoardViewer({
  pitch = 0,
  roll = 0,
  yaw = 0,
  trickGlow = 0,
  simulated = false,
  style,
}) {
  const webviewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const modelSentRef = useRef(false);

  // Load GLB from assets and send to WebView
  const sendModel = async () => {
    if (modelSentRef.current) return;
    try {
      const asset = Asset.fromModule(require('../assets/skateboard.glb'));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: 'base64' });
      webviewRef.current?.postMessage(JSON.stringify({ type: 'model', base64 }));
      modelSentRef.current = true;
    } catch (e) {
      console.warn('LiveBoardViewer: GLB load failed, using fallback sim mode');
      webviewRef.current?.postMessage(JSON.stringify({ type: 'sim', value: true }));
      setLoaded(true);
    }
  };

  useEffect(() => { if (ready) sendModel(); }, [ready]);

  // Send sensor rotation (pitch/roll/yaw already calibrated by parent)
  useEffect(() => {
    if (!ready || !loaded) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'sensor', pitch, roll, yaw }));
  }, [pitch, roll, yaw, ready, loaded]);

  // Toggle simulated mode
  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'sim', value: simulated }));
  }, [simulated, ready]);

  // Trick detection glow pulse
  useEffect(() => {
    if (!ready || !loaded) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'glow', value: trickGlow }));
  }, [trickGlow, ready, loaded]);

  return (
    <View style={[s.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: VIEWER_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        style={s.webview}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'ready')  setReady(true);
          if (e.nativeEvent.data === 'loaded') setLoaded(true);
        }}
      />
      {!loaded && (
        <View style={s.loadOverlay}>
          <ActivityIndicator color="#4488ff" size="small" />
          <Text style={s.loadText}>Loading 3D board...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#0d0d1a', borderRadius: 10 },
  webview:   { backgroundColor: '#0d0d1a', flex: 1 },
  loadOverlay: {
    position: 'absolute', inset: 0, backgroundColor: '#0d0d1a',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  loadText: { color: '#444', fontSize: 11, letterSpacing: 1 },
});
