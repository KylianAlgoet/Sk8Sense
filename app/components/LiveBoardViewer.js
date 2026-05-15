import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

const THREE_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';
const GLTF_CDN   = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js';
const ORBIT_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/controls/OrbitControls.js';

// ─── 2D fallback board (always works, no network/GLB needed) ─────────────────
function Board2D({ pitch, roll, trickGlow, simulated }) {
  const animPitch = useRef(new Animated.Value(0)).current;
  const animRoll  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const simRot    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animPitch, { toValue: pitch, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(animRoll,  { toValue: roll,  duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [pitch, roll]);

  useEffect(() => {
    if (trickGlow > 0) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();
    }
  }, [trickGlow]);

  useEffect(() => {
    if (simulated) {
      Animated.loop(Animated.sequence([
        Animated.timing(simRot, { toValue: 15,  duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(simRot, { toValue: -15, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    } else {
      simRot.stopAnimation(); simRot.setValue(0);
    }
  }, [simulated]);

  const px = animPitch.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const rz = animRoll.interpolate({  inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const sy = simRot.interpolate({    inputRange: [-180,180], outputRange: ['-180deg','180deg'] });

  return (
    <Animated.View style={[fb.boardWrap, {
      transform: [{ perspective: 700 }, { rotateX: px }, { rotateZ: rz }, { rotateY: sy }],
    }]}>
      <View style={fb.truckRow}>
        <View style={fb.wheel} /><View style={fb.axle} /><View style={fb.wheel} />
      </View>
      <View style={fb.deck}>
        <View style={fb.grip} />
        <View style={[fb.edge, { left: 9 }]} /><View style={[fb.edge, { right: 9 }]} />
        <Animated.View style={[fb.zone, fb.zNose, { opacity: glowAnim, backgroundColor: '#4488ff' }]} />
        <Animated.View style={[fb.zone, fb.zTail, { opacity: glowAnim, backgroundColor: '#4488ff' }]} />
        {[{top:46,left:25},{top:46,right:25},{bottom:46,left:25},{bottom:46,right:25}].map((p,i) => (
          <View key={i} style={[fb.bolt, p]} />
        ))}
        <View style={fb.footBack} />
        <View style={fb.footFront} />
        <View style={fb.sensorOverlay}>
          <Text style={fb.sensorTxt}>{pitch>=0?'+':''}{pitch.toFixed(1)}° P</Text>
          <Text style={fb.sensorTxt}>{roll>=0?'+':''}{roll.toFixed(1)}° R</Text>
        </View>
      </View>
      <View style={fb.truckRow}>
        <View style={fb.wheel} /><View style={fb.axle} /><View style={fb.wheel} />
      </View>
    </Animated.View>
  );
}

const BW = 108, BH = 234;
const fb = StyleSheet.create({
  boardWrap:  { alignItems: 'center' },
  truckRow:   { flexDirection:'row', alignItems:'center', width:BW+14, height:13 },
  axle:       { flex:1, height:10, backgroundColor:'#7a7a7a', borderRadius:5, marginHorizontal:2 },
  wheel:      { width:16, height:16, borderRadius:8, backgroundColor:'#eee', borderWidth:2, borderColor:'#aaa' },
  deck:       { width:BW, height:BH, borderRadius:22, backgroundColor:'#1e1208', overflow:'hidden', borderWidth:1.5, borderColor:'#3a2510' },
  grip:       { position:'absolute', inset:5, borderRadius:17, backgroundColor:'#111' },
  edge:       { position:'absolute', top:12, bottom:12, width:3, backgroundColor:'#1c1c1c', borderRadius:2 },
  zone:       { position:'absolute', left:'14%', right:'14%', borderRadius:13 },
  zNose:      { top:7, height:50 },
  zTail:      { bottom:7, height:56 },
  bolt:       { position:'absolute', width:7, height:7, borderRadius:3.5, backgroundColor:'#3a2e18', borderWidth:1, borderColor:'#6a5830' },
  footBack:   { position:'absolute', bottom:64, left:'10%', right:'10%', height:28, backgroundColor:'rgba(255,255,255,0.65)', borderRadius:8 },
  footFront:  { position:'absolute', top:64, left:'20%', width:24, height:68, backgroundColor:'rgba(255,255,255,0.55)', borderRadius:8, transform:[{rotate:'-42deg'}] },
  sensorOverlay: { position:'absolute', bottom:8, right:8, alignItems:'flex-end', gap:2 },
  sensorTxt:  { color:'rgba(100,200,255,0.75)', fontSize:9, fontWeight:'bold' },
});

// ─── Three.js HTML scene (base64 injected via postMessage) ──────────────────
const VIEWER_HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0d0d1a;overflow:hidden;touch-action:none}
  canvas{display:block;width:100vw;height:100vh}
  #ld{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0d0d1a;gap:10px}
  .sp{width:26px;height:26px;border:2px solid #222;border-top-color:#4488ff;border-radius:50%;animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  #ld p{color:#444;font:10px sans-serif;letter-spacing:2px}
  #dbg{position:fixed;top:4px;left:6px;font:9px monospace;color:#4488ff;pointer-events:none;opacity:0.7}
</style>
</head><body>
<div id="ld"><div class="sp"></div><p id="ldtxt">LOADING</p></div>
<div id="dbg"></div>
<canvas id="c"></canvas>
<script src="${THREE_CDN}"></script>
<script src="${GLTF_CDN}"></script>
<script src="${ORBIT_CDN}"></script>
<script>
var W=innerWidth,H=innerHeight,DEG=Math.PI/180;
var renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x0d0d1a); renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.2;

var scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x0d0d1a,14,24);

var camera=new THREE.PerspectiveCamera(50,W/H,0.01,50);
// 3/4 view from the side-front-above — good for a flat skateboard
camera.position.set(2.5,2.0,4.5);
camera.lookAt(0,0,0);

var controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=0.08;
controls.enableZoom=true; controls.enablePan=false;
controls.minPolarAngle=0.1; controls.maxPolarAngle=Math.PI*0.75;
controls.update();

scene.add(new THREE.AmbientLight(0xffffff,0.65));
var key=new THREE.DirectionalLight(0xffffff,2.0); key.position.set(4,8,5); scene.add(key);
var fill=new THREE.DirectionalLight(0x8899cc,0.4); fill.position.set(-4,2,-3); scene.add(fill);
var glow=new THREE.PointLight(0x4488ff,0,7); glow.position.set(0,1,0); scene.add(glow);

var ground=new THREE.Mesh(new THREE.PlaneGeometry(12,20),
  new THREE.MeshPhongMaterial({color:0x0f0f1a}));
ground.rotation.x=-Math.PI/2; ground.position.y=-1.6; scene.add(ground);

var shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.4,5.8),
  new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0.5}));
shadow.rotation.x=-Math.PI/2; shadow.position.y=-1.59; scene.add(shadow);

var boardGroup=new THREE.Group(); scene.add(boardGroup);
var model=null,modelReady=false,t=0;
var tP=0,tR=0,tY=0,cP=0,cR=0,cY=0,simMode=false;
var dbg=document.getElementById('dbg');

function parseModel(b64){
  document.getElementById('ldtxt').textContent='PARSING';
  var bin=atob(b64), bytes=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(bytes.buffer,'',function(gltf){
    model=gltf.scene;
    // Get raw bounds before any rotation
    var rb=new THREE.Box3().setFromObject(model);
    var rs=rb.getSize(new THREE.Vector3());
    dbg.textContent='x:'+rs.x.toFixed(2)+' y:'+rs.y.toFixed(2)+' z:'+rs.z.toFixed(2);
    // Board should be flat with longest axis horizontal
    // If Y is tallest axis (>30% taller than others) → standing up → lay flat
    if(rs.y > rs.x*1.3 && rs.y > rs.z*1.3){ model.rotation.x=-Math.PI/2; }
    // If X is significantly longer than Z → rotate so long axis = Z (board points away from camera)
    else if(rs.x > rs.z*1.4){ model.rotation.y=Math.PI/2; }
    // Center and scale to 2 units
    var box2=new THREE.Box3().setFromObject(model);
    var sz2=box2.getSize(new THREE.Vector3());
    var ct2=box2.getCenter(new THREE.Vector3());
    var s=2.0/Math.max(sz2.x,sz2.y,sz2.z);
    model.scale.setScalar(s); model.position.set(-ct2.x*s,-ct2.y*s,-ct2.z*s);
    boardGroup.add(model);
    // Refit camera: high above + to side so full board is visible
    var fb=new THREE.Box3().setFromObject(boardGroup);
    var sp=new THREE.Sphere(); fb.getBoundingSphere(sp);
    var r=sp.radius;
    camera.fov=42; camera.updateProjectionMatrix();
    // Position well above and to the side — prevents top-down zoom issue
    camera.position.set(sp.center.x+r*1.0, sp.center.y+r*2.8, sp.center.z+r*4.5);
    camera.lookAt(sp.center);
    controls.target.copy(sp.center);
    controls.minPolarAngle=Math.PI*0.22;  // prevent pure top-down
    controls.maxPolarAngle=Math.PI*0.72;
    controls.minDistance=r*1.5; controls.maxDistance=r*9;
    controls.update();
    setTimeout(function(){dbg.textContent='';},4000);
    document.getElementById('ld').style.display='none';
    modelReady=true;
    try{window.ReactNativeWebView.postMessage('loaded');}catch(e){}
  },function(e){ dbg.textContent='ERR:'+e.message; });
}

function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='model') parseModel(d.base64);
    if(d.type==='sensor'){ tP=d.pitch||0; tR=d.roll||0; tY=d.yaw||0; }
    if(d.type==='sim')   simMode=!!d.value;
    if(d.type==='glow')  { glow.intensity=3; setTimeout(function(){glow.intensity=0;},500); }
  }catch(ex){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
setTimeout(function(){ try{window.ReactNativeWebView.postMessage('ready');}catch(e){} },100);

function animate(){
  requestAnimationFrame(animate); t+=0.016; controls.update();
  if(modelReady){
    if(simMode){ tP=Math.sin(t*0.7)*18; tR=Math.sin(t*0.5)*10; }
    cP+=(tP-cP)*0.18; cR+=(tR-cR)*0.18; cY+=(tY-cY)*0.10;
    boardGroup.rotation.x=cP*DEG;
    boardGroup.rotation.z=-cR*DEG;
    boardGroup.rotation.y=cY*DEG;
    var ly=boardGroup.position.y;
    shadow.scale.set(Math.max(0.4,1-ly*0.1),Math.max(0.4,1-ly*0.1),1);
    shadow.material.opacity=Math.max(0.05,0.5-ly*0.08);
  }
  renderer.render(scene,camera);
}
animate();
</script></body></html>`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiveBoardViewer({ pitch=0, roll=0, yaw=0, trickGlow=0, simulated=false, style }) {
  const webviewRef = useRef(null);
  const [modelUri, setModelUri]   = useState(null);
  const [webReady, setWebReady]   = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const [use3D, setUse3D]         = useState(true);

  // Load GLB as base64 on mount (reliable cross-platform approach)
  useEffect(() => {
    const load = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/skateboard.glb'));
        await asset.downloadAsync();
        const b64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: 'base64' });
        setModelUri(b64); // store base64, send to WebView when ready
      } catch (e) {
        console.warn('GLB load failed, using 2D fallback:', e);
        setUse3D(false);
      }
    };
    load();
  }, []);

  // When WebView is ready AND base64 is loaded, send the model
  useEffect(() => {
    if (webReady && modelUri) {
      webviewRef.current?.postMessage(JSON.stringify({ type: 'model', base64: modelUri }));
    }
  }, [webReady, modelUri]);

  // Sensor updates (always send regardless of loaded state for buffering)
  useEffect(() => {
    if (!webReady) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'sensor', pitch, roll, yaw }));
  }, [pitch, roll, yaw, webReady]);

  useEffect(() => {
    if (!webReady) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'sim', value:simulated }));
  }, [simulated, webReady]);

  useEffect(() => {
    if (!webReady || trickGlow === 0) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'glow', value:1 }));
  }, [trickGlow, webReady]);

  // Fallback if GLB not available
  if (!use3D) {
    return (
      <View style={[s.container, style]}>
        <View style={s.scene}>
          <Board2D pitch={pitch} roll={roll} trickGlow={trickGlow} simulated={simulated} />
        </View>
        <StatusPill simulated={simulated} />
      </View>
    );
  }

  if (!modelUri) {
    return (
      <View style={[s.container, style, { alignItems:'center', justifyContent:'center', gap:8 }]}>
        <ActivityIndicator color="#4488ff" />
        <Text style={{ color:'#444', fontSize:11, letterSpacing:1 }}>PREPARING MODEL</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: VIEWER_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        style={s.webview}
        onMessage={e => {
          if (e.nativeEvent.data === 'ready')  setWebReady(true);
          if (e.nativeEvent.data === 'loaded') setLoaded(true);
        }}
      />
      {!loaded && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color="#4488ff" size="large" />
          <Text style={s.loadingText}>LOADING 3D MODEL</Text>
        </View>
      )}
      <StatusPill simulated={simulated} />
    </View>
  );
}

function StatusPill({ simulated }) {
  return (
    <View style={s.pill}>
      <View style={[s.pillDot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
      <Text style={s.pillText}>{simulated ? 'SIMULATED' : 'LIVE SENSOR'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { overflow:'hidden', backgroundColor:'#0d0d1a', borderRadius:12 },
  scene:          { flex:1, alignItems:'center', justifyContent:'center' },
  webview:        { flex:1, backgroundColor:'#0d0d1a' },
  loadingOverlay: { position:'absolute', inset:0, backgroundColor:'#0d0d1a', alignItems:'center', justifyContent:'center', gap:10 },
  loadingText:    { color:'#444', fontSize:11, letterSpacing:2 },
  pill:           { position:'absolute', top:8, right:10, flexDirection:'row', alignItems:'center', gap:5 },
  pillDot:        { width:6, height:6, borderRadius:3 },
  pillText:       { color:'#444', fontSize:9, fontWeight:'bold', letterSpacing:1 },
});
