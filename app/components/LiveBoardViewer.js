import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import React from 'react';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';

const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:linear-gradient(160deg,#0a0e1a 0%,#0d1220 60%,#0a0e1a 100%);overflow:hidden;touch-action:none}
  canvas{display:block;width:100vw;height:100vh}
  #hud{position:fixed;top:7px;right:9px;font:8px/1.5 monospace;color:#2244aa55;text-align:right;pointer-events:none}
</style>
</head>
<body>
<div id="hud">P:0.0° R:0.0°</div>
<canvas id="c"></canvas>
<script src="${THREE_CDN}"></script>
<script>
var W=innerWidth, H=innerHeight, PI=Math.PI, DEG=PI/180;

// ── Renderer ──────────────────────────────────────────────────────────────
var renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,alpha:true});
renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setClearColor(0x000000,0); // transparent — CSS gradient shows through
renderer.shadowMap.enabled=false; // disabled for performance
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;

// ── Scene ─────────────────────────────────────────────────────────────────
var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080c18, 0.11);

// ── Camera ────────────────────────────────────────────────────────────────
var camera = new THREE.PerspectiveCamera(40, W/H, 0.01, 30);
camera.position.set(1.55, 2.45, 4.0);
camera.lookAt(0, 0.12, 0.1);

// ── Lighting ──────────────────────────────────────────────────────────────
// Ambient — soft fill
scene.add(new THREE.AmbientLight(0xb8c8ff, 0.45));
// Key light — warm, from upper-right-front, casts shadows
var key = new THREE.DirectionalLight(0xfff5e8, 2.1);
key.position.set(3.5, 7, 5);
scene.add(key);
// Fill — cool blue, opposite side
var fill = new THREE.DirectionalLight(0x6688ff, 0.28);
fill.position.set(-4, 1.5, -3); scene.add(fill);
// Rim — backlight for edge definition
var rim = new THREE.DirectionalLight(0xffffff, 0.22);
rim.position.set(0, -1.5, -5); scene.add(rim);
// FSR accent point light — reactive
var accent = new THREE.PointLight(0xffffff, 0, 5);
accent.position.set(0, 1.8, 0.3); scene.add(accent);

// ── Ground ────────────────────────────────────────────────────────────────
var gnd = new THREE.Mesh(new THREE.PlaneGeometry(14,18),
  new THREE.MeshPhongMaterial({color:0x080e1a, shininess:3}));
gnd.rotation.x=-PI/2; gnd.position.y=-0.95;
scene.add(gnd);

// ── Materials ─────────────────────────────────────────────────────────────
var mMaple  = new THREE.MeshPhongMaterial({color:0x2a180a, shininess:18, specular:0x1a0d00});
var mGrip   = new THREE.MeshPhongMaterial({color:0x0c0c0c, shininess:1,  specular:0x000000});
var mEdge   = new THREE.MeshPhongMaterial({color:0xc8a060, shininess:8,  specular:0x100800}); // maple side
var mTruck  = new THREE.MeshPhongMaterial({color:0x9aa4b0, shininess:160, specular:0x8090a0, metalness:0.5});
var mAxle   = new THREE.MeshPhongMaterial({color:0xaab4c0, shininess:200, specular:0x90a0b0});
var mHard   = new THREE.MeshPhongMaterial({color:0x5a6470, shininess:220, specular:0x5060708});
var mWheel  = new THREE.MeshPhongMaterial({color:0xf0e8d8, shininess:38, specular:0x201810}); // urethane cream
var mHub    = new THREE.MeshPhongMaterial({color:0xd8d0c0, shininess:100,specular:0x181410});

function fzMat(hex){
  return new THREE.MeshPhongMaterial({
    color:0x020202, emissive:new THREE.Color(hex),
    emissiveIntensity:0, transparent:true, opacity:0.93,
    shininess:2, specular:0x000000
  });
}
var zmNose=fzMat(0x4CAF50), zmHeel=fzMat(0x2196F3);
var zmToe=fzMat(0xFF9800),  zmTail=fzMat(0xe94560);

// ── Board group ───────────────────────────────────────────────────────────
var bg = new THREE.Group();
scene.add(bg);

// Board layout: Z=length(tail=+Z, nose=-Z), X=width, Y=up
var W=0.385, NW=0.352, TW=0.368, L=0.95, R=0.055;

// ── Deck outline (ExtrudeGeometry with rounded corners) ───────────────────
var dShape = new THREE.Shape();
// Shape in XY plane (X=width, Y=length; Y+ = tail, Y- = nose)
dShape.moveTo( TW-R,  L);
dShape.quadraticCurveTo( TW,  L,  TW,  L-R);
dShape.lineTo( W,  0.05); // right side slight taper
dShape.lineTo( NW, -L+R);
dShape.quadraticCurveTo( NW, -L,  NW-R, -L);
dShape.lineTo(-(NW-R), -L);
dShape.quadraticCurveTo(-NW, -L, -NW, -L+R);
dShape.lineTo(-W, 0.05);
dShape.lineTo(-TW,  L-R);
dShape.quadraticCurveTo(-TW,  L, -(TW-R),  L);
dShape.closePath();

var extSettings = {
  depth: 0.055, bevelEnabled: true,
  bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 3
};
var deckGeo = new THREE.ExtrudeGeometry(dShape, extSettings);
// Rotate: shape XY → world XZ, extrusion → world Y
deckGeo.rotateX(-PI/2);

// Split materials: main body = maple, bevel edges = edge color
var deck = new THREE.Mesh(deckGeo, mMaple);
bg.add(deck);

// Bottom maple face (lighter, visible underside)
var bottomShape = dShape.clone ? dShape.clone() : dShape;
var bottomGeo = new THREE.ShapeGeometry(bottomShape);
bottomGeo.rotateX(-PI/2);
var bottom = new THREE.Mesh(bottomGeo, mEdge);
bottom.position.y = -0.001; bottom.receiveShadow=true;
bg.add(bottom);

// ── Grip tape ─────────────────────────────────────────────────────────────
var gripGeo = new THREE.ShapeGeometry(dShape);
gripGeo.rotateX(-PI/2);
var grip = new THREE.Mesh(gripGeo, mGrip);
grip.position.y = 0.07; grip.receiveShadow=true;
bg.add(grip);

// Concave effect — two thin raised edge strips, slightly angled inward
[-W+0.055, W-0.055].forEach(function(x){
  var cs = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, L*1.85), mGrip);
  cs.position.set(x, 0.076, 0);
  cs.rotation.z = (x>0? -1:1)*0.12; // subtle inward tilt
  bg.add(cs);
});

// ── Kick tail ─────────────────────────────────────────────────────────────
var KL=0.33, KA=0.27, NK=0.20;
var tkGeo = new THREE.BoxGeometry(TW*2-0.04, 0.058, KL);
// Add bevel look with edge strips
var tailKick = new THREE.Mesh(tkGeo, mMaple);
var tkZ = L + (KL/2)*Math.cos(KA);
var tkY = (KL/2)*Math.sin(KA);
tailKick.position.set(0, tkY, tkZ);
tailKick.rotation.x = -KA;
tailKick.castShadow=true; bg.add(tailKick);
// Grip on kick tail
var tkGrip = new THREE.Mesh(new THREE.BoxGeometry(TW*2-0.1, 0.014, KL-0.02), mGrip);
tkGrip.position.set(0, tkY + 0.035*Math.cos(KA), tkZ + 0.02*Math.sin(KA));
tkGrip.rotation.x = -KA; bg.add(tkGrip);

// ── Kick nose ─────────────────────────────────────────────────────────────
var noseKick = new THREE.Mesh(new THREE.BoxGeometry(NW*2-0.04, 0.058, KL), mMaple);
var nkZ = -(L + (KL/2)*Math.cos(NK));
var nkY = (KL/2)*Math.sin(NK);
noseKick.position.set(0, nkY, nkZ);
noseKick.rotation.x = NK;
noseKick.castShadow=true; bg.add(noseKick);
var nkGrip = new THREE.Mesh(new THREE.BoxGeometry(NW*2-0.1, 0.014, KL-0.02), mGrip);
nkGrip.position.set(0, nkY+0.035*Math.cos(NK), nkZ-0.02*Math.sin(NK));
nkGrip.rotation.x = NK; bg.add(nkGrip);

// ── FSR Zones (embedded pressure panels) ─────────────────────────────────
var zy = 0.072; // just above grip tape
// TAIL zone — slightly follows tail kick angle at edge
var zT=new THREE.Mesh(new THREE.PlaneGeometry(0.54,0.38), zmTail);
zT.rotation.x=-PI/2; zT.position.set(0,zy,0.72); bg.add(zT);
// NOSE zone
var zN=new THREE.Mesh(new THREE.PlaneGeometry(0.50,0.34), zmNose);
zN.rotation.x=-PI/2; zN.position.set(0,zy,-0.70); bg.add(zN);
// HEEL zone (left rail strip)
var zH=new THREE.Mesh(new THREE.PlaneGeometry(0.14,1.10), zmHeel);
zH.rotation.x=-PI/2; zH.position.set(-W+0.08,zy,0.02); bg.add(zH);
// TOE zone (right rail strip)
var zO=new THREE.Mesh(new THREE.PlaneGeometry(0.14,1.10), zmToe);
zO.rotation.x=-PI/2; zO.position.set(W-0.08,zy,0.02); bg.add(zO);

// ── Bolts ─────────────────────────────────────────────────────────────────
[[-0.16,-0.75],[0.16,-0.75],[-0.16,0.75],[0.16,0.75]].forEach(function(xz){
  var b=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.022,8), mHard);
  b.position.set(xz[0], 0.073, xz[1]); b.castShadow=true; bg.add(b);
});

// ── Trucks ────────────────────────────────────────────────────────────────
function makeTruck(tz){
  var tg = new THREE.Group();
  // Baseplate — thin, flat under deck
  var bp=new THREE.Mesh(new THREE.BoxGeometry(TW*1.65,0.10,0.38), mTruck);
  bp.position.y=-0.09; tg.add(bp);
  // Kingpin nut
  var kp=new THREE.Mesh(new THREE.CylinderGeometry(0.048,0.048,0.11,6), mTruck);
  kp.position.y=-0.048; tg.add(kp);
  // Hanger — T-shape (wider than baseplate, holds axle)
  var hg=new THREE.Mesh(new THREE.BoxGeometry(TW*2.05,0.16,0.24), mTruck);
  hg.position.y=-0.185; hg.castShadow=true; tg.add(hg);
  // Hanger wing (fatter middle)
  var hw=new THREE.Mesh(new THREE.BoxGeometry(TW*2.05,0.09,0.36), mTruck);
  hw.position.y=-0.128; tg.add(hw);
  // Axle — long thin rod
  var ax=new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,TW*2.45,12), mAxle);
  ax.rotation.z=PI/2; ax.position.y=-0.228; ax.castShadow=true; tg.add(ax);
  // Axle nuts
  [-TW*1.17,TW*1.17].forEach(function(x){
    var nut=new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.042,0.06,6), mHard);
    nut.rotation.z=PI/2; nut.position.set(x,-0.228,0); tg.add(nut);
  });
  tg.position.set(0, 0, tz);
  return tg;
}
bg.add(makeTruck(-0.82)); // front truck
bg.add(makeTruck( 0.82)); // back truck

// ── Wheels ────────────────────────────────────────────────────────────────
function makeWheel(x,z){
  var wg=new THREE.Group();
  // Main urethane wheel
  var wh=new THREE.Mesh(new THREE.CylinderGeometry(0.285,0.285,0.245,16), mWheel);
  wh.rotation.z=PI/2; wg.add(wh);
  // Hub insert
  var hub=new THREE.Mesh(new THREE.CylinderGeometry(0.088,0.088,0.26,10), mHub);
  hub.rotation.z=PI/2; wg.add(hub);
  // Bearing
  var brg=new THREE.Mesh(new THREE.CylinderGeometry(0.046,0.046,0.27,8), mHard);
  brg.rotation.z=PI/2; wg.add(brg);
  wg.position.set(x, -0.23, z);
  return wg;
}
var wx=TW*1.15+0.245/2;
bg.add(makeWheel(-wx,-0.82)); bg.add(makeWheel( wx,-0.82));
bg.add(makeWheel(-wx, 0.82)); bg.add(makeWheel( wx, 0.82));

// ── Sensor state ──────────────────────────────────────────────────────────
var tP=0,tR=0, cP=0,cR=0, simMode=false, t=0;
var fsr={n:0,h:0,o:0,t:0};

function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='sensor'){
      tP=d.pitch||0; tR=d.roll||0;
      fsr.n=d.f1||0; fsr.h=d.f2||0; fsr.o=d.f3||0; fsr.t=d.f4||0;
    }
    if(d.type==='sim') simMode=!!d.value;
  }catch(ex){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
setTimeout(function(){ try{window.ReactNativeWebView.postMessage('ready');}catch(e){} },100);

// ── Animation ─────────────────────────────────────────────────────────────
var hud=document.getElementById('hud');
function lerp(a,b,k){ return a+(b-a)*k; }
function clamp01(v){ return Math.max(0,Math.min(1,v)); }

function animate(){
  requestAnimationFrame(animate); t+=0.016;
  if(simMode){ tP=Math.sin(t*0.7)*14; tR=Math.sin(t*0.45)*9; }
  cP=lerp(cP,tP,0.45); cR=lerp(cR,tR,0.45);
  bg.rotation.x=cP*DEG;
  bg.rotation.z=-cR*DEG;

  // FSR zone intensities (noise floor 300, full at 1000)
  var sN=clamp01((fsr.n-300)/700);
  var sH=clamp01((fsr.h-300)/700);
  var sO=clamp01((fsr.o-300)/700);
  var sT=clamp01((fsr.t-300)/700);

  zmNose.emissiveIntensity = sN;
  zmHeel.emissiveIntensity = sH;
  zmToe.emissiveIntensity  = sO;
  zmTail.emissiveIntensity = sT;

  // Accent PointLight — strongest zone wins
  var mx=Math.max(sN,sH,sO,sT);
  if(mx>0.04){
    var col=sT>mx-0.01?0xe94560:sN>mx-0.01?0x4CAF50:sH>mx-0.01?0x2196F3:0xFF9800;
    accent.color.setHex(col);
    accent.intensity=mx*4.0;
    accent.position.set(
      sH>mx-0.01?-0.6:sO>mx-0.01?0.6:0,
      1.4,
      sT>mx-0.01?0.8:sN>mx-0.01?-0.8:0
    );
  } else { accent.intensity=0; }

  hud.textContent='P:'+cP.toFixed(1)+'° R:'+cR.toFixed(1)+'°';
  renderer.render(scene,camera);
}
animate();
</script>
</body>
</html>`;

// forwardRef lets DashboardScreen call .update() directly at 100Hz
// bypassing React state (which only updates at 10Hz)
const LiveBoardViewer = forwardRef(function LiveBoardViewer(
  { pitch=0, roll=0, f1=0, f2=0, f3=0, f4=0, simulated=false, style },
  ref
) {
  const webviewRef = useRef(null);
  const [ready, setReady] = React.useState(false);

  // Expose direct update method — called from BLE callback at 100Hz
  useImperativeHandle(ref, () => ({
    update(p, r, n, h, o, t) {
      webviewRef.current?.postMessage(
        JSON.stringify({ type:'sensor', pitch:p, roll:r, f1:n, f2:h, f3:o, f4:t })
      );
    },
  }), []);

  // Fallback: also update on prop changes (sim mode etc.)
  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'sensor', pitch, roll, f1, f2, f3, f4 }));
  }, [pitch, roll, f1, f2, f3, f4, ready]);

  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'sim', value:simulated }));
  }, [simulated, ready]);

  return (
    <View style={[s.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: VIEWER_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        style={s.webview}
        onMessage={e => { if (e.nativeEvent.data === 'ready') setReady(true); }}
      />
      <View style={s.badge}>
        <View style={[s.dot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
      </View>
    </View>
  );
});

export default LiveBoardViewer;

const s = StyleSheet.create({
  container: { overflow:'hidden', backgroundColor:'#080c18', borderRadius:12 },
  webview: { flex:1, backgroundColor:'transparent' },
  badge: { position:'absolute', top:8, right:9 },
  dot: { width:7, height:7, borderRadius:4 },
});
