import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// Three.js r134 — last version with non-module CDN scripts (easiest for WebView)
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';
const GLTF_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js';

function buildHTML(trickColor) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a0a; overflow:hidden; width:100vw; height:100vh; }
  canvas { display:block; width:100%; height:100%; }
  #loader { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:#0a0a0a; }
  .dot { width:8px; height:8px; border-radius:50%; background:${trickColor}; margin:0 4px; animation:pulse 0.9s infinite; }
  .dot:nth-child(2) { animation-delay:0.3s; }
  .dot:nth-child(3) { animation-delay:0.6s; }
  @keyframes pulse { 0%,80%,100%{transform:scale(0);opacity:0.3} 40%{transform:scale(1);opacity:1} }
</style>
</head>
<body>
<div id="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
<canvas id="c"></canvas>

<script src="${THREE_CDN}"></script>
<script src="${GLTF_CDN}"></script>
<script>
var ACCENT = new THREE.Color('${trickColor}');
var canvas = document.getElementById('c');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0a, 1);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.12);

var camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.01, 50);
camera.position.set(0, 1.6, 4.2);
camera.lookAt(0, 0.2, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

var key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(3, 7, 5);
scene.add(key);

var fill = new THREE.DirectionalLight(0x8899cc, 0.35);
fill.position.set(-4, 1, -3);
scene.add(fill);

var rim = new THREE.DirectionalLight(0xffffff, 0.5);
rim.position.set(0, -2, -4);
scene.add(rim);

var accentLight = new THREE.PointLight(ACCENT, 0.0, 5);
accentLight.position.set(0, 0.5, 0);
scene.add(accentLight);

// Ground plane
var ground = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 16),
  new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 8 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.1;
scene.add(ground);

// Fake shadow
var shadowMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 2.8),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 })
);
shadowMesh.rotation.x = -Math.PI / 2;
shadowMesh.position.y = -1.09;
scene.add(shadowMesh);

var model = null;
var stepIndex = 0;
var phase = 'steps';
var t = 0;
var modelReady = false;

function loadFromBase64(b64) {
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  var loader = new THREE.GLTFLoader();
  loader.parse(bytes.buffer, '', function(gltf) {
    model = gltf.scene;

    // Center + scale
    var box = new THREE.Box3().setFromObject(model);
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z);
    var s = 2.2 / maxDim;
    model.scale.set(s, s, s);
    model.position.set(-center.x * s, -center.y * s, -center.z * s);
    model.rotation.y = Math.PI; // face camera

    scene.add(model);
    document.getElementById('loader').style.display = 'none';
    modelReady = true;
  }, function(err) {
    console.error('GLTF load error:', err);
  });
}

// Message handler (RN → WebView)
function onMessage(event) {
  try {
    var data = JSON.parse(event.data);
    if (data.type === 'model') loadFromBase64(data.base64);
    else if (data.type === 'update') { stepIndex = data.stepIndex || 0; phase = data.phase || 'steps'; }
  } catch(e) {}
}
document.addEventListener('message', onMessage);
window.addEventListener('message', onMessage);

// Notify RN that WebView is ready
function notifyReady() {
  try { window.ReactNativeWebView.postMessage('ready'); } catch(e) {}
}
setTimeout(notifyReady, 200);

// Animation
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  if (!modelReady || !model) {
    renderer.render(scene, camera);
    return;
  }

  accentLight.intensity = 0;

  if (phase === 'combine') {
    var cy = (t % 4.2) / 4.2;
    if (cy < 0.12) {
      model.rotation.x = cy * -8;
      model.position.y = 0;
      accentLight.intensity = cy * 12;
    } else if (cy < 0.32) {
      var p = (cy - 0.12) / 0.20;
      model.position.y = p * 2.0;
      model.rotation.x = -0.96 + p * 1.1;
      accentLight.intensity = (1 - p) * 3;
    } else if (cy < 0.62) {
      var p = (cy - 0.32) / 0.30;
      model.position.y = 2.0 - p * 0.4;
      model.rotation.z = p * Math.PI * 2;
      accentLight.intensity = Math.sin(p * Math.PI) * 4;
    } else if (cy < 0.76) {
      var p = (cy - 0.62) / 0.14;
      model.position.y = 1.6 * (1 - p);
      if (p > 0.82) accentLight.intensity = (p - 0.82) / 0.18 * 6;
    } else {
      model.position.y = 0;
      model.rotation.z = 0;
      model.rotation.x = Math.sin(t * 0.6) * 0.06;
      model.rotation.y = Math.PI + Math.sin(t * 0.4) * 0.12;
      accentLight.intensity = 0.6;
    }

  } else {
    switch (stepIndex) {
      case 0:
        model.rotation.y = Math.PI + Math.sin(t * 0.35) * 0.18;
        model.rotation.x = Math.sin(t * 0.5) * 0.06;
        model.position.y = 0;
        accentLight.intensity = 0.6 + Math.sin(t * 1.4) * 0.4;
        break;
      case 1:
        var c1 = (t % 2.4) / 2.4;
        if (c1 < 0.12) {
          model.rotation.x = c1 * -10;
          model.position.y = 0;
          accentLight.intensity = c1 * 10;
        } else if (c1 < 0.40) {
          var p = (c1 - 0.12) / 0.28;
          model.position.y = p * 1.6;
          model.rotation.x = -1.2 + p * 1.3;
          accentLight.intensity = (1 - p) * 3;
        } else {
          model.position.y = Math.max(0, 1.6 * (1 - (c1 - 0.40) / 0.60));
          model.rotation.x = Math.sin(t * 0.5) * 0.05;
          model.rotation.y = Math.PI + Math.sin(t * 0.4) * 0.1;
        }
        break;
      case 2:
        var c2 = (t % 2.6) / 2.6;
        model.position.y = c2 < 0.5 ? c2 * 2 * 1.5 : 1.5 * (1 - (c2 - 0.5) * 2);
        model.rotation.x = Math.sin(t * 1.1) * 0.22;
        model.rotation.z = Math.sin(t * 0.7) * 0.08;
        accentLight.intensity = 1.2 + Math.sin(t * 1.8) * 0.8;
        break;
      case 3:
        model.position.y = 1.3 + Math.sin(t) * 0.32;
        model.rotation.x = Math.sin(t * 0.85) * 0.14;
        model.rotation.z = Math.sin(t * 0.65) * 0.1;
        model.rotation.y = Math.PI + Math.sin(t * 0.5) * 0.14;
        accentLight.intensity = 2.0 + Math.sin(t * 1.3) * 1.0;
        break;
      case 4:
        var c4 = (t % 2.1) / 2.1;
        model.position.y = c4 < 0.38 ? 1.5 * (1 - c4 / 0.38) : 0;
        if (model.position.y < 0.05) accentLight.intensity = Math.max(0, 1 - (t % 2.1 - 0.8)) * 4;
        model.rotation.x = Math.sin(t * 0.5) * 0.05;
        model.rotation.y = Math.PI + Math.sin(t * 0.38) * 0.1;
        break;
      default:
        model.rotation.y += 0.006;
    }
  }

  // Shadow follows lift
  var ly = model.position.y;
  shadowMesh.scale.set(Math.max(0.4, 1 - ly * 0.15), Math.max(0.4, 1 - ly * 0.15), 1);
  shadowMesh.material.opacity = Math.max(0.04, 0.5 - ly * 0.1);

  renderer.render(scene, camera);
}

animate();
</script>
</body>
</html>`;
}

export default function SkateboardGL({ stepIndex = 0, phase = 'steps', trickColor = '#4CAF50', style }) {
  const webviewRef = useRef(null);
  const [webviewReady, setWebviewReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const modelSentRef = useRef(false);

  const sendModel = async () => {
    if (modelSentRef.current) return;
    try {
      const asset = Asset.fromModule(require('../assets/skateboard.glb'));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      webviewRef.current?.postMessage(JSON.stringify({ type: 'model', base64 }));
      modelSentRef.current = true;
      setTimeout(() => setLoading(false), 800);
    } catch (e) {
      console.error('Failed to load GLB:', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (webviewReady) sendModel();
  }, [webviewReady]);

  useEffect(() => {
    if (!webviewReady || !modelSentRef.current) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'update', stepIndex, phase }));
  }, [stepIndex, phase, webviewReady]);

  return (
    <View style={[s.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: buildHTML(trickColor) }}
        originWhitelist={['*']}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        style={s.webview}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'ready') setWebviewReady(true);
        }}
      />
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={trickColor} size="large" />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#0a0a0a' },
  webview: { backgroundColor: '#0a0a0a', flex: 1 },
  loadingOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: '#0a0a0a',
    alignItems: 'center', justifyContent: 'center',
  },
});
