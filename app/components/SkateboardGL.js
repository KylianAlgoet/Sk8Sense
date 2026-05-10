import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
var renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x0a0a0a);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(46, W/H, 0.01, 100);
camera.position.set(2.5, 3.8, 6.0);
camera.lookAt(0, 0.4, 0);

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.4, 0);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.enableZoom = false; controls.enablePan = false;
controls.minPolarAngle = 0.15; controls.maxPolarAngle = Math.PI * 0.60;
controls.autoRotate = true; controls.autoRotateSpeed = 0.8;
controls.update();

// ── Lights ────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
var key = new THREE.DirectionalLight(0xffffff, 1.9);
key.position.set(4, 9, 6); key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-6; key.shadow.camera.right=6;
key.shadow.camera.top=10; key.shadow.camera.bottom=-3;
key.shadow.camera.near=0.5; key.shadow.camera.far=30;
scene.add(key);
var fill = new THREE.DirectionalLight(0x7788cc, 0.4); fill.position.set(-5,2,-3); scene.add(fill);
var rim  = new THREE.DirectionalLight(0xffffff, 0.45); rim.position.set(0,-2,-5); scene.add(rim);
var ACCENT = new THREE.Color('${trickColor}');
var accentPt = new THREE.PointLight(ACCENT, 0.0, 8); accentPt.position.set(0,2,1); scene.add(accentPt);

// ── Ground ────────────────────────────────────────────────
var ground = new THREE.Mesh(
  new THREE.PlaneGeometry(14,22),
  new THREE.MeshPhongMaterial({color:0x0f0f0f,shininess:3})
);
ground.rotation.x = -Math.PI/2; ground.position.y = -1.4; ground.receiveShadow = true;
scene.add(ground);
var fakeShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 6.2),
  new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.5})
);
fakeShadow.rotation.x = -Math.PI/2; fakeShadow.position.y = -1.38; scene.add(fakeShadow);

// ── Materials ─────────────────────────────────────────────
var mDeck  = new THREE.MeshPhongMaterial({color:0x2d1a08,shininess:22});
var mVeneer= new THREE.MeshPhongMaterial({color:0x4a2e12,shininess:12});
var mGrip  = new THREE.MeshPhongMaterial({color:0x0d0d0d,shininess:1});
var mTruck = new THREE.MeshPhongMaterial({color:0xa8a8a8,shininess:120});
var mAxle  = new THREE.MeshPhongMaterial({color:0x888888,shininess:150});
var mWheel = new THREE.MeshPhongMaterial({color:0xf0f0f0,shininess:55});
var mHub   = new THREE.MeshPhongMaterial({color:0xcccccc,shininess:130});
var mHard  = new THREE.MeshPhongMaterial({color:0x666666,shininess:220});

function zoneMat() {
  return new THREE.MeshPhongMaterial({
    color:0x000000, emissive:ACCENT, emissiveIntensity:0, transparent:true, opacity:0.88
  });
}

// ── Board group ───────────────────────────────────────────
var boardGroup = new THREE.Group();
scene.add(boardGroup);

var DW=2.0, DH=0.092, DL=5.0, KL=1.05;

// Deck body
var deckBody = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, DL-KL*1.6), mDeck);
boardGroup.add(deckBody);

// Nose kick ~12°
var noseKick = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, KL), mDeck);
noseKick.position.set(0, 0.074, -(DL/2-KL/2)+0.04);
noseKick.rotation.x = 0.21; boardGroup.add(noseKick);

// Tail kick ~17°
var tailKick = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, KL*1.1), mDeck);
tailKick.position.set(0, 0.10, (DL/2-KL*1.1/2)+0.04);
tailKick.rotation.x = -0.30; boardGroup.add(tailKick);

// Veneer lines on sides
[-DH/2, DH/2].forEach(function(y){
  var v=new THREE.Mesh(new THREE.BoxGeometry(DW,0.011,DL-KL*1.6),mVeneer);
  v.position.y=y; boardGroup.add(v);
});

// Grip tape center
var grip=new THREE.Mesh(new THREE.BoxGeometry(DW-0.06,0.021,DL-KL*1.6),mGrip);
grip.position.y=DH/2+0.011; boardGroup.add(grip);
var noseGrip=new THREE.Mesh(new THREE.BoxGeometry(DW-0.06,0.021,KL),mGrip);
noseGrip.position.set(0,DH/2+0.011+0.074,-(DL/2-KL/2)+0.04);
noseGrip.rotation.x=0.21; boardGroup.add(noseGrip);
var tailGrip=new THREE.Mesh(new THREE.BoxGeometry(DW-0.06,0.021,KL*1.1),mGrip);
tailGrip.position.set(0,DH/2+0.011+0.10,(DL/2-KL*1.1/2)+0.04);
tailGrip.rotation.x=-0.30; boardGroup.add(tailGrip);

// Concave strips
[-0.88,0.88].forEach(function(x){
  var c=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.017,DL-KL*1.6),mGrip);
  c.position.set(x,DH/2+0.019,0); boardGroup.add(c);
});

// ── FSR pressure zones (actual sensor positions) ──────────
// FSR4: tail — where back foot pops
var zmTail=zoneMat();
var zTail=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.023,0.95),zmTail);
zTail.position.set(0,DH/2+0.021,2.0); zTail.rotation.x=-0.28; boardGroup.add(zTail);

// FSR1: nose — front foot push area
var zmNose=zoneMat();
var zNose=new THREE.Mesh(new THREE.BoxGeometry(1.55,0.023,0.85),zmNose);
zNose.position.set(0,DH/2+0.021,-1.9); zNose.rotation.x=0.20; boardGroup.add(zNose);

// FSR2: heel-side — left rail, mid-board
var zmHeel=zoneMat();
var zHeel=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.023,2.0),zmHeel);
zHeel.position.set(-0.80,DH/2+0.021,0); boardGroup.add(zHeel);

// FSR3: toe-side — right rail, mid-board
var zmToe=zoneMat();
var zToe=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.023,2.0),zmToe);
zToe.position.set(0.80,DH/2+0.021,0); boardGroup.add(zToe);

// Bolts
[[-0.58,-1.6],[0.58,-1.6],[-0.58,1.6],[0.58,1.6]].forEach(function(xz){
  var b=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.038,8),mHard);
  b.position.set(xz[0],DH/2+0.021,xz[1]); boardGroup.add(b);
});

// ── Trucks ────────────────────────────────────────────────
function addTruck(z){
  var g=new THREE.Group();
  var bp=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.13,0.42),mTruck); bp.position.y=-0.12; g.add(bp);
  var kp=new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.065,0.16,6),mTruck); kp.position.y=-0.065; g.add(kp);
  var hg=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.19,0.28),mTruck); hg.position.y=-0.20; g.add(hg);
  var hw=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.10,0.40),mTruck); hw.position.y=-0.145; g.add(hw);
  var ax=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,2.54,10),mAxle);
  ax.rotation.z=Math.PI/2; ax.position.y=-0.245; g.add(ax);
  [[-1.18,0],[1.18,0]].forEach(function(xr){
    var wg=new THREE.Group();
    var wh=new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.33,0.30,22),mWheel);
    wh.rotation.z=Math.PI/2; wh.castShadow=true; wg.add(wh);
    var hb=new THREE.Mesh(new THREE.CylinderGeometry(0.095,0.095,0.32,12),mHub);
    hb.rotation.z=Math.PI/2; wg.add(hb);
    var br=new THREE.Mesh(new THREE.CylinderGeometry(0.052,0.052,0.33,8),mHard);
    br.rotation.z=Math.PI/2; wg.add(br);
    wg.position.set(xr[0],-0.265,0); g.add(wg);
  });
  g.position.set(0,-DH/2,z); boardGroup.add(g);
}
addTruck(-1.6); addTruck(1.6);

boardGroup.traverse(function(o){ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });

// ── Skate shoe factory ────────────────────────────────────
var mSole  = new THREE.MeshPhongMaterial({color:0x111111,shininess:8});
var mShoe  = new THREE.MeshPhongMaterial({color:0xf2f2f2,shininess:35});
var mShoe2 = new THREE.MeshPhongMaterial({color:0xe0e0e0,shininess:25});
var mPants = new THREE.MeshPhongMaterial({color:0x1a1a2e,shininess:4});
var mSock  = new THREE.MeshPhongMaterial({color:0xdddddd,shininess:10});

function createShoe() {
  var g = new THREE.Group();
  // Thick cupsole
  var sole=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.07,0.84),mSole); g.add(sole);
  // Main upper
  var up=new THREE.Mesh(new THREE.BoxGeometry(0.41,0.26,0.76),mShoe); up.position.y=0.165; g.add(up);
  // Toe box (wider/puffier)
  var toe=new THREE.Mesh(new THREE.BoxGeometry(0.43,0.22,0.22),mShoe); toe.position.set(0,0.11,-0.47); g.add(toe);
  // Heel counter
  var heel=new THREE.Mesh(new THREE.BoxGeometry(0.40,0.20,0.16),mShoe2); heel.position.set(0,0.10,0.44); g.add(heel);
  // Tongue
  var tng=new THREE.Mesh(new THREE.BoxGeometry(0.20,0.26,0.09),mShoe2); tng.position.set(0,0.20,-0.38); tng.rotation.x=-0.18; g.add(tng);
  // Ankle collar
  var col=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.21,0.13,8),mShoe); col.position.y=0.34; g.add(col);
  // Sock (slight)
  var sock=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.18,0.12,8),mSock); sock.position.y=0.43; g.add(sock);
  // Lower leg (jeans)
  var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.17,0.82,8),mPants); leg.position.y=0.90; g.add(leg);
  // Knee area (slightly wider)
  var knee=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.13,0.20,8),mPants); knee.position.y=1.35; g.add(knee);
  return g;
}

// Back foot (regular stance) — on tail area
var backFoot = createShoe();
backFoot.position.set(0.05, DH/2+0.072, 1.65);
backFoot.rotation.y = 0.08; // almost perpendicular
boardGroup.add(backFoot);

// Front foot — angled 45° between nose and middle
var frontFoot = createShoe();
frontFoot.position.set(-0.05, DH/2+0.072, -1.25);
frontFoot.rotation.y = -0.82; // ~47° angle (regular skate stance)
boardGroup.add(frontFoot);

// ── Foot animation helpers ────────────────────────────────
var BFY0 = DH/2+0.072; // base Y for back foot
var FFY0 = DH/2+0.072; // base Y for front foot

// ── Animation state ───────────────────────────────────────
var stepIndex=0, phase='steps', t=0;

function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='update'){stepIndex=d.stepIndex||0;phase=d.phase||'steps';}
  }catch(err){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
setTimeout(function(){try{window.ReactNativeWebView.postMessage('ready');}catch(e){}},100);

function setZ(t,n,h,toe){zmTail.emissiveIntensity=t;zmNose.emissiveIntensity=n;zmHeel.emissiveIntensity=h;zmToe.emissiveIntensity=toe;}
function pulse(f,lo,hi){return lo+(hi-lo)*(0.5+0.5*Math.sin(t*f));}

// ── Render loop ───────────────────────────────────────────
function animate(){
  requestAnimationFrame(animate);
  t+=0.016;
  controls.update();
  setZ(0,0,0,0);
  accentPt.intensity=0;

  // Reset feet each frame
  backFoot.position.set(0.05, BFY0, 1.65);
  backFoot.rotation.set(0, 0.08, 0);
  frontFoot.position.set(-0.05, FFY0, -1.25);
  frontFoot.rotation.set(0, -0.82, 0);
  backFoot.visible=true; frontFoot.visible=true;

  if(phase==='combine'){
    var cy=(t%4.5)/4.5;
    if(cy<0.12){
      // Load: back foot presses tail
      boardGroup.rotation.x=cy*-7;
      boardGroup.position.y=0;
      backFoot.position.y=BFY0-cy*0.5;
      backFoot.rotation.x=cy*2.5;
      setZ(cy*9,0,0,0); accentPt.intensity=cy*10;
    } else if(cy<0.30){
      var p=(cy-0.12)/0.18;
      boardGroup.position.y=p*2.2;
      boardGroup.rotation.x=-0.84+p*0.9;
      backFoot.visible=(p<0.6); frontFoot.visible=(p<0.6);
      setZ((1-p)*0.8,0,0,0); accentPt.intensity=(1-p)*4;
    } else if(cy<0.60){
      var p=(cy-0.30)/0.30;
      boardGroup.position.y=2.2-p*0.4;
      boardGroup.rotation.z=p*Math.PI*2;
      backFoot.visible=false; frontFoot.visible=false;
      setZ(0,0,Math.sin(p*Math.PI)*0.9,0);
      accentPt.intensity=Math.sin(p*Math.PI)*5;
    } else if(cy<0.76){
      var p=(cy-0.60)/0.16;
      boardGroup.position.y=1.8*(1-p);
      boardGroup.rotation.z=Math.PI*2*(1-p*0.04);
      backFoot.visible=(p>0.7); frontFoot.visible=(p>0.7);
      if(p>0.8) accentPt.intensity=(p-0.8)*5*6;
    } else {
      boardGroup.position.y=0;
      boardGroup.rotation.z=0;
      boardGroup.rotation.x=Math.sin(t*0.6)*0.05;
      boardGroup.rotation.y=Math.sin(t*0.4)*0.10;
      accentPt.intensity=0.5;
    }
  } else {
    switch(stepIndex){
      case 0: // Foot Position — show stance
        boardGroup.position.y=0;
        boardGroup.rotation.x=Math.sin(t*0.5)*0.05;
        boardGroup.rotation.y=Math.sin(t*0.32)*0.12;
        // Slight weight on back foot (tail) and front foot (heel side)
        backFoot.position.y=BFY0-0.01+Math.sin(t*1.2)*0.005;
        frontFoot.position.y=FFY0+Math.sin(t*0.9)*0.005;
        setZ(pulse(1.2,0.08,0.4),0,pulse(1.0,0.05,0.35),0);
        accentPt.intensity=pulse(1.1,0.2,1.0);
        break;

      case 1: // Pop — tail slap
        var c=(t%2.5)/2.5;
        if(c<0.10){
          // Load: crouch, weight shifts to back foot
          boardGroup.rotation.x=c*-8;
          boardGroup.position.y=0;
          backFoot.position.y=BFY0-c*0.8;
          backFoot.rotation.x=c*3.0; // ankle bends
          setZ(c*9,0,0,0); accentPt.intensity=c*11;
        } else if(c<0.22){
          var p=(c-0.10)/0.12;
          // Pop! Board tilts back, foot snaps
          boardGroup.rotation.x=-0.8+p*0.9;
          boardGroup.position.y=p*1.8;
          backFoot.position.y=BFY0-0.08+p*0.3;
          backFoot.rotation.x=0.3-p*0.5;
          setZ((1-p)*0.9,0,0,0); accentPt.intensity=(1-p)*4;
        } else if(c<0.50){
          var p=(c-0.22)/0.28;
          boardGroup.position.y=1.8-p*0.5;
          boardGroup.rotation.x=-0.1+Math.sin(t*0.5)*0.04;
          // Feet lift up
          backFoot.position.y=BFY0+0.15+Math.sin(t*2)*0.05;
          frontFoot.position.y=FFY0+0.10;
        } else {
          boardGroup.position.y=Math.max(0,1.3*(1-(c-0.50)/0.50));
          boardGroup.rotation.x=Math.sin(t*0.5)*0.04;
        }
        break;

      case 2: // Slide — front foot drags up
        var c=(t%2.8)/2.8;
        var lift=c<0.5?c*2*1.6:1.6*(1-(c-0.5)*2);
        boardGroup.position.y=lift;
        boardGroup.rotation.x=Math.sin(t*1.1)*0.20;
        boardGroup.rotation.z=Math.sin(t*0.65)*0.06;
        // Front foot slides from middle toward nose
        var slideZ=-1.25-Math.sin(c*Math.PI)*0.55;
        frontFoot.position.z=slideZ;
        frontFoot.position.y=FFY0+Math.abs(Math.sin(c*Math.PI))*0.08;
        frontFoot.rotation.x=Math.sin(c*Math.PI)*-0.25; // ankle action
        // Back foot stays back, slightly lifted
        backFoot.position.y=BFY0+0.06;
        setZ(0,0,pulse(1.9,0.25,1.0),pulse(1.7,0.05,0.35));
        accentPt.intensity=pulse(1.7,0.4,2.4);
        break;

      case 3: // Level Out — front foot pushes nose down
        boardGroup.position.y=1.3+Math.sin(t)*0.30;
        boardGroup.rotation.x=Math.sin(t*0.85)*0.13;
        boardGroup.rotation.z=Math.sin(t*0.65)*0.09;
        boardGroup.rotation.y=Math.sin(t*0.48)*0.13;
        // Front foot pushes toward nose
        frontFoot.position.z=-1.75+Math.sin(t*0.9)*0.08;
        frontFoot.rotation.x=-0.18+Math.sin(t)*0.08; // pushing down
        backFoot.position.y=BFY0+0.20+Math.sin(t*0.7)*0.04;
        setZ(0,pulse(1.5,0.35,1.0),0,0);
        accentPt.intensity=pulse(1.2,1.3,3.2);
        break;

      case 4: // Landing — stomp down
        var c=(t%2.2)/2.2;
        boardGroup.position.y=c<0.38?1.5*(1-c/0.38):0;
        if(boardGroup.position.y<0.05){
          // Impact: feet press hard
          var imp=Math.max(0,1.0-(t%2.2-0.8)*2.2);
          backFoot.position.y=BFY0-imp*0.06;
          frontFoot.position.y=FFY0-imp*0.06;
          backFoot.rotation.x=imp*0.4;
          frontFoot.rotation.x=imp*0.3;
          setZ(imp*0.9,imp*0.7,imp*0.5,imp*0.5);
          accentPt.intensity=imp*5;
        } else {
          backFoot.position.y=BFY0+boardGroup.position.y*0.3;
          frontFoot.position.y=FFY0+boardGroup.position.y*0.3;
        }
        boardGroup.rotation.x=Math.sin(t*0.5)*0.05;
        boardGroup.rotation.y=Math.sin(t*0.36)*0.09;
        break;

      default:
        boardGroup.rotation.y+=0.005;
    }
  }

  // Dynamic shadow
  var ly=boardGroup.position.y;
  fakeShadow.scale.set(Math.max(0.3,1-ly*0.12),Math.max(0.3,1-ly*0.12),1);
  fakeShadow.material.opacity=Math.max(0.03,0.52-ly*0.09);

  renderer.render(scene,camera);
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
        onMessage={(e) => { if (e.nativeEvent.data === 'ready') setReady(true); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#0a0a0a' },
  webview: { backgroundColor: '#0a0a0a', flex: 1 },
});
