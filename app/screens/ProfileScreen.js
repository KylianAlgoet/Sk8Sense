import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useSessionStore from '../store/sessionStore';

const TRICK_COLORS = { ollie:'#4CAF50', kickflip:'#2196F3', heelflip:'#FF9800' };

function StatCard({ value, label, icon, color = '#e94560' }) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

function SessionChart({ sessions }) {
  const recent = [...sessions].slice(0, 7).reverse();
  if (!recent.length) return null;
  const maxT = Math.max(...recent.map(s => s.tricks.length), 1);
  return (
    <View style={s.chartCard}>
      <Text style={s.sectionTitle}>LAST SESSIONS</Text>
      <View style={s.chartBars}>
        {recent.map((session, i) => {
          const h = Math.max((session.tricks.length / maxT) * 56, 4);
          return (
            <View key={session.id} style={s.chartBarWrap}>
              <Text style={s.chartBarCount}>{session.tricks.length || ''}</Text>
              <View style={[s.chartBar, { height: h }]} />
              <Text style={s.chartBarLabel}>
                {new Date(session.startTime).toLocaleDateString('nl-BE', { day:'numeric', month:'numeric' })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { sessions, loadSessions } = useSessionStore();

  useEffect(() => { loadSessions(); }, []);

  const totalTricks  = sessions.reduce((acc, s) => acc + s.tricks.length, 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const bestSession  = sessions.reduce((best, s) => (!best || s.tricks.length > best.tricks.length) ? s : best, null);

  const trickCounts = sessions.flatMap(s => s.tricks).reduce((acc, { trick }) => {
    acc[trick] = (acc[trick] || 0) + 1; return acc;
  }, {});
  const maxTrickCount = Math.max(...Object.values(trickCounts), 1);
  const initials = user?.displayName ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
        <TouchableOpacity style={s.historyBtn} onPress={() => navigation.navigate('History')}>
          <Ionicons name="time-outline" size={14} color="#aaa" />
          <Text style={s.historyBtnText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={s.name}>{user?.displayName || 'Skater'}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      {/* Stats grid */}
      <View style={s.statsGrid}>
        <StatCard value={sessions.length} label="Sessions" icon="calendar-outline" color="#e94560" />
        <StatCard value={totalTricks} label="Tricks" icon="flash-outline" color="#FFD700" />
        <StatCard value={`${totalMinutes}m`} label="On board" icon="timer-outline" color="#4CAF50" />
        <StatCard value={bestSession ? bestSession.tricks.length : 0} label="Best session" icon="trophy-outline" color="#FF9800" />
      </View>

      {/* Sessions chart */}
      <SessionChart sessions={sessions} />

      {/* Trick breakdown */}
      {Object.keys(trickCounts).length > 0 && (
        <View style={s.trickCard}>
          <Text style={s.sectionTitle}>ALL-TIME TRICKS</Text>
          {Object.entries(trickCounts).sort((a,b) => b[1]-a[1]).map(([trick, count]) => (
            <View key={trick} style={s.trickRow}>
              <View style={[s.trickDot, { backgroundColor: TRICK_COLORS[trick] || '#e94560' }]} />
              <Text style={s.trickName}>{trick.toUpperCase()}</Text>
              <View style={s.trickBarWrap}>
                <View style={[s.trickBar, { width:`${(count/maxTrickCount)*100}%`, backgroundColor: TRICK_COLORS[trick] || '#e94560' }]} />
              </View>
              <Text style={s.trickCount}>×{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={16} color="#444" />
        <Text style={s.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#1a1a2e' },
  content: { padding:24, paddingTop:52, paddingBottom:48, gap:20 },

  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  title: { color:'#e94560', fontSize:28, fontWeight:'bold' },
  historyBtn: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#16213e', borderRadius:8, paddingHorizontal:12, paddingVertical:7 },
  historyBtnText: { color:'#aaa', fontSize:12 },

  avatarSection: { alignItems:'center', gap:6 },
  avatarRing: { width:88, height:88, borderRadius:44, borderWidth:2, borderColor:'#e9456044', alignItems:'center', justifyContent:'center', marginBottom:4 },
  avatar: { width:76, height:76, borderRadius:38, backgroundColor:'#e94560', alignItems:'center', justifyContent:'center' },
  avatarText: { color:'#fff', fontSize:28, fontWeight:'bold' },
  name: { color:'#fff', fontSize:20, fontWeight:'bold' },
  email: { color:'#444', fontSize:13 },

  statsGrid: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard: { flex:1, minWidth:'44%', backgroundColor:'#16213e', borderRadius:12, padding:14, alignItems:'center', gap:4, borderWidth:1, borderColor:'#1e2d4a' },
  statVal: { fontSize:22, fontWeight:'bold' },
  statLbl: { color:'#555', fontSize:10, letterSpacing:0.5 },

  chartCard: { backgroundColor:'#16213e', borderRadius:12, padding:16, borderWidth:1, borderColor:'#1e2d4a' },
  chartBars: { flexDirection:'row', alignItems:'flex-end', height:72, gap:6, marginTop:10 },
  chartBarWrap: { flex:1, alignItems:'center', justifyContent:'flex-end', gap:4 },
  chartBarCount: { color:'#fff', fontSize:9, fontWeight:'bold', height:12 },
  chartBar: { width:'100%', backgroundColor:'#e94560', borderRadius:3 },
  chartBarLabel: { color:'#333', fontSize:8, textAlign:'center' },

  trickCard: { backgroundColor:'#16213e', borderRadius:12, padding:16, borderWidth:1, borderColor:'#1e2d4a' },
  sectionTitle: { color:'#444', fontSize:10, fontWeight:'bold', letterSpacing:2, marginBottom:12 },
  trickRow: { flexDirection:'row', alignItems:'center', marginBottom:12, gap:10 },
  trickDot: { width:8, height:8, borderRadius:4 },
  trickName: { color:'#fff', fontSize:12, fontWeight:'bold', width:65 },
  trickBarWrap: { flex:1, height:6, backgroundColor:'#0f3460', borderRadius:3, overflow:'hidden' },
  trickBar: { height:'100%', borderRadius:3 },
  trickCount: { color:'#555', fontSize:12, width:32, textAlign:'right' },

  logoutBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, borderWidth:1, borderColor:'#222', borderRadius:10, paddingVertical:13 },
  logoutText: { color:'#444', fontSize:13, letterSpacing:1 },
});
