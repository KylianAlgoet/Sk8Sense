import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';

// ─── Three.js HTML scene ───────────────────────────────────────────────────
const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0d0d1a;overflow:hidden;touch-action:none}
  canvas{display:block;width:100vw;height:100vh}
  #info{position:fixed;top:6px;right:8px;font:9px monospace;color:#333;text-align:right;pointer-events:none}
</style>
</head>
<body>
<div id="info">P:0.0° R:0.0°</div>
<canvas id="c"></canvas>
<script src="${THREE_CDN}"></script>
<script>
var W=innerWidth, H=innerHeight, DEG=Math.PI/180;

// ── Renderer ─────────────────────────────────────────────────────────────
var renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x0d0d1a); renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;

// ── Scene & Camera ────────────────────────────────────────────────────────
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0d1a, 14, 22);

// Fixed 3/4 camera — above, slightly right, looking at board center
var camera = new THREE.PerspectiveCamera(44, W/H, 0.01, 40);
camera.position.set(1.8, 2.8, 4.5);
camera.lookAt(0, 0.1, 0);

// ── Lights ────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
var key = new THREE.DirectionalLight(0xffffff, 1.9);
key.position.set(3,7,5); key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.near=0.5; key.shadow.camera.far=25;
key.shadow.camera.left=-4; key.shadow.camera.right=4;
key.shadow.camera.top=6; key.shadow.camera.bottom=-3;
scene.add(key);
var fill = new THREE.DirectionalLight(0x8899cc, 0.35);
fill.position.set(-4,2,-3); scene.add(fill);
// Dynamic accent light — changes color with active FSR zone
var accent = new THREE.PointLight(0xffffff, 0, 6);
accent.position.set(0, 1.5, 0); scene.add(accent);

// ── Ground ────────────────────────────────────────────────────────────────
var gnd = new THREE.Mesh(new THREE.PlaneGeometry(12,18),
  new THREE.MeshPhongMaterial({color:0x0f0f1a,shininess:4}));
gnd.rotation.x=-Math.PI/2; gnd.position.y=-0.85; gnd.receiveShadow=true;
scene.add(gnd);

// ── Materials ─────────────────────────────────────────────────────────────
var mDeck  = new THREE.MeshPhongMaterial({color:0x2d1a08,shininess:22});
var mVeneer= new THREE.MeshPhongMaterial({color:0x4a2e12,shininess:10});
var mGrip  = new THREE.MeshPhongMaterial({color:0x0d0d0d,shininess:1});
var mTruck = new THREE.MeshPhongMaterial({color:0xa8a8a8,shininess:130,metalness:0.3});
var mAxle  = new THREE.MeshPhongMaterial({color:0x888888,shininess:160});
var mWheel = new THREE.MeshPhongMaterial({color:0xf0f0f0,shininess:55});
var mHub   = new THREE.MeshPhongMaterial({color:0xcccccc,shininess:130});
var mHard  = new THREE.MeshPhongMaterial({color:0x666666,shininess:200});

function zoneMat(hex){
  return new THREE.MeshPhongMaterial({
    color:0x000000, emissive:new THREE.Color(hex),
    emissiveIntensity:0, transparent:true, opacity:0.92
  });
}
var zmNose = zoneMat(0x4CAF50); // green
var zmHeel = zoneMat(0x2196F3); // blue
var zmToe  = zoneMat(0xFF9800); // orange
var zmTail = zoneMat(0xe94560); // red

// ── Board group ───────────────────────────────────────────────────────────
var boardGroup = new THREE.Group();
scene.add(boardGroup);

// Board dimensions
var BL=1.3, BW=0.38, BH=0.045, KL=0.32, KA=0.26; // half-length, half-width, half-height, kick-length, kick-angle

// Center deck body
var deckBody = new THREE.Mesh(new THREE.BoxGeometry(BW*2,BH*2,(BL-KL)*2), mDeck);
boardGroup.add(deckBody);

// Tail kick
var tailKick = new THREE.Mesh(new THREE.BoxGeometry(BW*2,BH*2,KL), mDeck);
tailKick.position.set(0, KL/2*Math.sin(KA), (BL-KL)+KL/2*Math.cos(KA));
tailKick.rotation.x=-KA; boardGroup.add(tailKick);

// Nose kick (less steep)
var noseKick = new THREE.Mesh(new THREE.BoxGeometry(BW*2,BH*2,KL), mDeck);
noseKick.position.set(0, KL/2*Math.sin(KA*0.7), -((BL-KL)+KL/2*Math.cos(KA*0.7)));
noseKick.rotation.x=KA*0.7; boardGroup.add(noseKick);

// Veneer edge lines
[-BH,BH].forEach(function(y){
  var v=new THREE.Mesh(new THREE.BoxGeometry(BW*2,0.01,(BL-KL)*2),mVeneer);
  v.position.y=y; boardGroup.add(v);
});

// Grip tape (center)
var grip=new THREE.Mesh(new THREE.BoxGeometry(BW*2-0.06,0.018,(BL-KL)*2),mGrip);
grip.position.y=BH+0.01; boardGroup.add(grip);

// Grip tape on kicks
[1,-1].forEach(function(dir){
  var kg=new THREE.Mesh(new THREE.BoxGeometry(BW*2-0.06,0.018,KL),mGrip);
  var angle=dir>0?-KA:KA*0.7;
  kg.position.set(0,BH+0.01+KL/2*Math.sin(Math.abs(angle)),dir*((BL-KL)+KL/2*Math.cos(Math.abs(angle))));
  kg.rotation.x=angle; boardGroup.add(kg);
});

// Concave edge strips
[-BW+0.04,BW-0.04].forEach(function(x){
  var c=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.015,(BL-KL)*2),mGrip);
  c.position.set(x,BH+0.018,0); boardGroup.add(c);
});

// ── FSR Zones ─────────────────────────────────────────────────────────────
// Tail zone (red) — where back foot pops
var zTail=new THREE.Mesh(new THREE.BoxGeometry(BW*1.6,0.02,0.52),zmTail);
zTail.position.set(0,BH+0.019,(BL-KL)-0.02); zTail.rotation.x=-KA*0.3; boardGroup.add(zTail);

// Nose zone (green) — front foot push area
var zNose=new THREE.Mesh(new THREE.BoxGeometry(BW*1.5,0.02,0.45),zmNose);
zNose.position.set(0,BH+0.019,-((BL-KL)-0.02)); zNose.rotation.x=KA*0.2; boardGroup.add(zNose);

// Heel zone (blue) — left rail
var zHeel=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.02,(BL-KL)*1.2),zmHeel);
zHeel.position.set(-BW+0.1,BH+0.019,0); boardGroup.add(zHeel);

// Toe zone (orange) — right rail
var zToe=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.02,(BL-KL)*1.2),zmToe);
zToe.position.set(BW-0.1,BH+0.019,0); boardGroup.add(zToe);

// Zone labels (small colored markers)
function addLabel(x,y,z,color,txt){
  // skip actual text (canvas needed) — just colored marker dots
}

// Bolts
[[-0.18,-0.82],[0.18,-0.82],[-0.18,0.82],[0.18,0.82]].forEach(function(xz){
  var b=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.025,8),mHard);
  b.position.set(xz[0],BH+0.025,xz[1]); boardGroup.add(b);
});

// ── Trucks ────────────────────────────────────────────────────────────────
function addTruck(z){
  var g=new THREE.Group();
  // Baseplate
  var bp=new THREE.Mesh(new THREE.BoxGeometry(BW*1.7,0.12,0.4),mTruck);
  bp.position.y=-0.11; g.add(bp);
  // Kingpin nut
  var kp=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.14,6),mTruck);
  kp.position.y=-0.06; g.add(kp);
  // Hanger
  var hg=new THREE.Mesh(new THREE.BoxGeometry(BW*2.1,0.18,0.26),mTruck);
  hg.position.y=-0.19; g.add(hg);
  var hw=new THREE.Mesh(new THREE.BoxGeometry(BW*2.1,0.09,0.4),mTruck);
  hw.position.y=-0.135; g.add(hw);
  // Axle
  var ax=new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,BW*2.5,10),mAxle);
  ax.rotation.z=Math.PI/2; ax.position.y=-0.235; g.add(ax);
  // Wheels
  [[-BW*1.12,0],[BW*1.12,0]].forEach(function(xr){
    var wg=new THREE.Group();
    var wh=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.27,22),mWheel);
    wh.rotation.z=Math.PI/2; wh.castShadow=true; wg.add(wh);
    var hb=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.29,12),mHub);
    hb.rotation.z=Math.PI/2; wg.add(hb);
    var br=new THREE.Mesh(new THREE.CylinderGeometry(0.048,0.048,0.3,8),mHard);
    br.rotation.z=Math.PI/2; wg.add(br);
    wg.position.set(xr[0],-0.245,0); g.add(wg);
  });
  g.position.set(0,-BH,z); boardGroup.add(g);
}
addTruck(-0.85); addTruck(0.85);

// Cast shadows
boardGroup.traverse(function(o){ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });

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
var info=document.getElementById('info');
function animate(){
  requestAnimationFrame(animate); t+=0.016;
  if(simMode){ tP=Math.sin(t*0.7)*15; tR=Math.sin(t*0.5)*8; }
  cP+=(tP-cP)*0.18; cR+=(tR-cR)*0.18;
  boardGroup.rotation.x=cP*DEG;
  boardGroup.rotation.z=-cR*DEG;

  // FSR zones — map raw value to 0-1 glow intensity (noise floor 300)
  var sN=Math.min(Math.max((fsr.n-300)/700,0),1);
  var sH=Math.min(Math.max((fsr.h-300)/700,0),1);
  var sO=Math.min(Math.max((fsr.o-300)/700,0),1);
  var sT=Math.min(Math.max((fsr.t-300)/700,0),1);
  zmNose.emissiveIntensity=sN;
  zmHeel.emissiveIntensity=sH;
  zmToe.emissiveIntensity=sO;
  zmTail.emissiveIntensity=sT;

  // Accent point light — strongest active FSR determines color + intensity
  var maxS=Math.max(sN,sH,sO,sT);
  if(maxS>0.05){
    var c=sT>maxS-0.01?0xe94560:sN>maxS-0.01?0x4CAF50:sH>maxS-0.01?0x2196F3:0xFF9800;
    accent.color.setHex(c);
    accent.intensity=maxS*3.5;
  } else {
    accent.intensity=0;
  }

  info.textContent='P:'+cP.toFixed(1)+'° R:'+cR.toFixed(1)+'°';
  renderer.render(scene,camera);
}
animate();
</script>
</body>
</html>`;

// ─── Component ────────────────────────────────────────────────────────────
export default function LiveBoardViewer({ pitch=0, roll=0, f1=0, f2=0, f3=0, f4=0, simulated=false, style }) {
  const webviewRef = useRef(null);
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.postMessage(JSON.stringify({
      type: 'sensor', pitch, roll, f1, f2, f3, f4,
    }));
  }, [pitch, roll, f1, f2, f3, f4, ready]);

  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'sim', value: simulated }));
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
      <View style={s.pill}>
        <View style={[s.dot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
      </View>
    </View>
  );
}

import React from 'react';
const s = StyleSheet.create({
  container: { overflow:'hidden', backgroundColor:'#0d0d1a', borderRadius:12 },
  webview: { flex:1, backgroundColor:'#0d0d1a' },
  pill: { position:'absolute', top:8, right:8 },
  dot: { width:7, height:7, borderRadius:4 },
});
