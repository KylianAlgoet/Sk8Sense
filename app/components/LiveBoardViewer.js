import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// model-viewer CDN — handles auto-centering, scaling, orientation automatically
const MODEL_VIEWER_CDN = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

const VIEWER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100vw;height:100vh;background:#0d0d1a;overflow:hidden}
  model-viewer{width:100%;height:100%;background-color:#0d0d1a;--poster-color:#0d0d1a}
  #ld{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0d0d1a;gap:10px;z-index:10}
  .sp{width:26px;height:26px;border:2px solid #222;border-top-color:#4488ff;border-radius:50%;animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  #ld p{color:#444;font:10px sans-serif;letter-spacing:2px}
  #dbg{position:fixed;bottom:6px;left:8px;font:9px monospace;color:#4488ff44;pointer-events:none}
</style>
<script type="module" src="${MODEL_VIEWER_CDN}"></script>
</head>
<body>
<div id="ld"><div class="sp"></div><p id="ldtxt">LOADING</p></div>
<div id="dbg"></div>

<model-viewer
  id="mv"
  camera-controls
  touch-action="none"
  shadow-intensity="0.6"
  exposure="1.15"
  tone-mapping="commerce"
  style="background-color:#0d0d1a"
></model-viewer>

<script>
var mv = document.getElementById('mv');
var DEG = Math.PI/180;
var tP=0, tR=0, cP=0, cR=0;
var modelReady=false, simMode=false, t=0;
var dbg = document.getElementById('dbg');

// Model loaded
mv.addEventListener('load', function(){
  document.getElementById('ld').style.display='none';
  modelReady=true;
  try{window.ReactNativeWebView.postMessage('loaded');}catch(e){}
});
mv.addEventListener('error', function(e){
  document.getElementById('ldtxt').textContent='ERROR';
  console.error('model-viewer error:', e);
});

// Message handler
function onMsg(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='model'){
      document.getElementById('ldtxt').textContent='PARSING...';
      // Set as data URI — model-viewer handles orientation/scale automatically
      mv.src='data:model/gltf-binary;base64,'+d.base64;
    }
    if(d.type==='sensor'){ tP=d.pitch||0; tR=d.roll||0; }
    if(d.type==='sim')   simMode=!!d.value;
  }catch(ex){}
}
document.addEventListener('message',onMsg);
window.addEventListener('message',onMsg);
setTimeout(function(){ try{window.ReactNativeWebView.postMessage('ready');}catch(e){} },120);

// Animation loop — apply sensor rotation to model object
function animate(){
  requestAnimationFrame(animate);
  t+=0.016;

  if(simMode){ tP=Math.sin(t*0.7)*18; tR=Math.sin(t*0.5)*10; }

  // Smooth lerp
  cP+=(tP-cP)*0.18;
  cR+=(tR-cR)*0.18;

  if(modelReady && mv.model){
    // Apply pitch and roll to the loaded 3D model
    // model-viewer handles centering/camera, we just tilt the model
    mv.model.rotation.x = cP * DEG;   // pitch: nose up/down
    mv.model.rotation.z = -cR * DEG;  // roll: left/right tilt
  }

  dbg.textContent = 'P:'+cP.toFixed(1)+'° R:'+cR.toFixed(1)+'°';
}
animate();
</script>
</body>
</html>`;

// ─── 2D fallback ─────────────────────────────────────────────────────────────
function Board2D({ pitch, roll, trickGlow, simulated }) {
  const aP = useRef(new Animated.Value(0)).current;
  const aR = useRef(new Animated.Value(0)).current;
  const aG = useRef(new Animated.Value(0)).current;
  const aS = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(aP, { toValue: pitch, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(aR, { toValue: roll,  duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }, [pitch, roll]);

  useEffect(() => {
    if (trickGlow > 0) {
      Animated.sequence([
        Animated.timing(aG, { toValue: 1, duration: 100, useNativeDriver: false }),
        Animated.timing(aG, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();
    }
  }, [trickGlow]);

  useEffect(() => {
    if (simulated) {
      Animated.loop(Animated.sequence([
        Animated.timing(aS, { toValue: 14,  duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(aS, { toValue: -14, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    } else { aS.stopAnimation(); aS.setValue(0); }
  }, [simulated]);

  const px = aP.interpolate({ inputRange: [-90,90], outputRange: ['-90deg','90deg'] });
  const rz = aR.interpolate({ inputRange: [-90,90], outputRange: ['-90deg','90deg'] });
  const sy = aS.interpolate({ inputRange: [-180,180], outputRange: ['-180deg','180deg'] });
  const glowOp = aG.interpolate({ inputRange:[0,1], outputRange:[0,0.85] });

  return (
    <Animated.View style={[b.boardWrap, { transform:[{perspective:700},{rotateX:px},{rotateZ:rz},{rotateY:sy}] }]}>
      <View style={b.truck}><View style={b.wheel}/><View style={b.axle}/><View style={b.wheel}/></View>
      <View style={b.deck}>
        <View style={b.grip}/>
        <View style={[b.edge,{left:9}]}/><View style={[b.edge,{right:9}]}/>
        <Animated.View style={[b.zone, b.zN, {opacity:glowOp,backgroundColor:'#4488ff'}]}/>
        <Animated.View style={[b.zone, b.zT, {opacity:glowOp,backgroundColor:'#4488ff'}]}/>
        {[{top:46,left:24},{top:46,right:24},{bottom:46,left:24},{bottom:46,right:24}].map((p,i)=>
          <View key={i} style={[b.bolt,p]}/>
        )}
        <View style={b.fBack}/><View style={b.fFront}/>
        <View style={b.overlay}>
          <Text style={b.overlayTxt}>{pitch>=0?'+':''}{pitch.toFixed(1)}°P</Text>
          <Text style={[b.overlayTxt,{color:'rgba(255,165,60,0.75)'}]}>{roll>=0?'+':''}{roll.toFixed(1)}°R</Text>
        </View>
      </View>
      <View style={b.truck}><View style={b.wheel}/><View style={b.axle}/><View style={b.wheel}/></View>
    </Animated.View>
  );
}

const BW=108, BH=234;
const b = StyleSheet.create({
  boardWrap:{alignItems:'center'},
  truck:{flexDirection:'row',alignItems:'center',width:BW+14,height:13},
  axle:{flex:1,height:10,backgroundColor:'#707070',borderRadius:5,marginHorizontal:3},
  wheel:{width:16,height:16,borderRadius:8,backgroundColor:'#e8e8e8',borderWidth:2,borderColor:'#aaa'},
  deck:{width:BW,height:BH,borderRadius:22,backgroundColor:'#1c1006',overflow:'hidden',borderWidth:1.5,borderColor:'#3d2812'},
  grip:{position:'absolute',inset:5,borderRadius:18,backgroundColor:'#111111'},
  edge:{position:'absolute',top:12,bottom:12,width:3,backgroundColor:'#1d1d1d',borderRadius:2},
  zone:{position:'absolute',left:'14%',right:'14%',borderRadius:13},
  zN:{top:7,height:52},zT:{bottom:7,height:58},
  bolt:{position:'absolute',width:7,height:7,borderRadius:3.5,backgroundColor:'#3a2e18',borderWidth:1,borderColor:'#7a6030'},
  fBack:{position:'absolute',bottom:66,left:'10%',right:'10%',height:28,backgroundColor:'rgba(255,255,255,0.62)',borderRadius:8},
  fFront:{position:'absolute',top:66,left:'22%',width:24,height:68,backgroundColor:'rgba(255,255,255,0.52)',borderRadius:8,transform:[{rotate:'-42deg'}]},
  overlay:{position:'absolute',bottom:8,right:8,alignItems:'flex-end',gap:1},
  overlayTxt:{color:'rgba(100,180,255,0.72)',fontSize:9,fontWeight:'bold'},
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function LiveBoardViewer({ pitch=0, roll=0, trickGlow=0, simulated=false, style }) {
  const webviewRef  = useRef(null);
  const [webReady, setWebReady]   = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const [use3D, setUse3D]         = useState(true);
  const modelSentRef = useRef(false);

  // Load GLB as base64 on mount
  useEffect(() => {
    const load = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/skateboard.glb'));
        await asset.downloadAsync();
        const b64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: 'base64' });
        // Store in ref, send when WebView is ready
        webviewRef._b64 = b64;
        if (webReady) sendModel(b64);
      } catch (e) {
        console.warn('GLB load failed, using 2D fallback');
        setUse3D(false);
      }
    };
    load();
  }, []);

  const sendModel = (b64) => {
    if (modelSentRef.current) return;
    modelSentRef.current = true;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'model', base64: b64 }));
  };

  useEffect(() => {
    if (webReady && webviewRef._b64) sendModel(webviewRef._b64);
  }, [webReady]);

  // Live sensor updates
  useEffect(() => {
    if (!webReady) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'sensor', pitch, roll }));
  }, [pitch, roll, webReady]);

  useEffect(() => {
    if (!webReady) return;
    webviewRef.current?.postMessage(JSON.stringify({ type:'sim', value:simulated }));
  }, [simulated, webReady]);

  // Fallback to 2D if GLB fails
  if (!use3D) {
    return (
      <View style={[s.container, style, { justifyContent:'center', alignItems:'center' }]}>
        <Board2D pitch={pitch} roll={roll} trickGlow={trickGlow} simulated={simulated} />
        <Pill simulated={simulated} />
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
        <View style={s.overlay}>
          <ActivityIndicator color="#4488ff" size="large" />
          <Text style={s.overlayTxt}>LOADING 3D MODEL</Text>
        </View>
      )}
      <Pill simulated={simulated} />
    </View>
  );
}

function Pill({ simulated }) {
  return (
    <View style={s.pill}>
      <View style={[s.pillDot, { backgroundColor: simulated ? '#FF9800' : '#4CAF50' }]} />
      <Text style={s.pillTxt}>{simulated ? 'SIMULATED' : 'LIVE'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow:'hidden', backgroundColor:'#0d0d1a', borderRadius:12 },
  webview:   { flex:1, backgroundColor:'#0d0d1a' },
  overlay:   { position:'absolute', inset:0, backgroundColor:'#0d0d1a', alignItems:'center', justifyContent:'center', gap:10 },
  overlayTxt:{ color:'#444', fontSize:10, letterSpacing:2 },
  pill:      { position:'absolute', top:8, right:10, flexDirection:'row', alignItems:'center', gap:5 },
  pillDot:   { width:6, height:6, borderRadius:3 },
  pillTxt:   { color:'#444', fontSize:9, fontWeight:'bold', letterSpacing:1 },
});
