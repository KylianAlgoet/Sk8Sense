import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useSessionStore from '../store/sessionStore';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';

const TRICK_COLORS = { ollie:'#4CAF50', kickflip:'#2196F3', heelflip:'#FF9800' };

function StatCard({ value, label, icon, color = ACCENT }) {
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
          <Ionicons name="time-outline" size={14} color={TEXT.t2} />
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
        <StatCard value={sessions.length} label="Sessions" icon="calendar-outline" color={ACCENT} />
        <StatCard value={totalTricks} label="Tricks" icon="flash-outline" color={T.AMBER} />
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
              <View style={[s.trickDot, { backgroundColor: TRICK_COLORS[trick] || ACCENT }]} />
              <Text style={s.trickName}>{trick.toUpperCase()}</Text>
              <View style={s.trickBarWrap}>
                <View style={[s.trickBar, { width:`${(count/maxTrickCount)*100}%`, backgroundColor: TRICK_COLORS[trick] || ACCENT }]} />
              </View>
              <Text style={s.trickCount}>×{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sign out */}
      <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={16} color={TEXT.t3} />
        <Text style={s.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:BG.base },
  content: { padding:SPACE.xl, paddingTop:52, paddingBottom:48, gap:20 },

  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  title: { color:ACCENT, fontSize:28, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:-0.5 },
  historyBtn: { ...BTN.base, ...BTN.ghost, paddingVertical:7, paddingHorizontal:12, gap:5 },
  historyBtnText: { color:TEXT.t2, fontSize:12, fontFamily:FONT.body },

  avatarSection: { alignItems:'center', gap:6 },
  avatarRing: { width:88, height:88, borderRadius:44, borderWidth:2, borderColor:`${ACCENT}44`, alignItems:'center', justifyContent:'center', marginBottom:4 },
  avatar: { width:76, height:76, borderRadius:38, backgroundColor:ACCENT, alignItems:'center', justifyContent:'center' },
  avatarText: { color:T.ACCENT_INK, fontSize:28, fontFamily:FONT.display },
  name: { color:TEXT.t1, fontSize:20, fontFamily:FONT.display, textTransform:'uppercase', letterSpacing:-0.3 },
  email: { color:TEXT.t3, fontSize:13, fontFamily:FONT.body },

  statsGrid: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  statCard: { flex:1, minWidth:'44%', ...PANEL.base, padding:SPACE.md, alignItems:'center', gap:4 },
  statVal: { fontSize:22, fontFamily:FONT.display, letterSpacing:-0.5 },
  statLbl: { color:TEXT.t2, fontSize:10, fontFamily:FONT.mono, letterSpacing:0.5, textTransform:'uppercase' },

  chartCard: { ...PANEL.base, padding:16 },
  chartBars: { flexDirection:'row', alignItems:'flex-end', height:72, gap:6, marginTop:10 },
  chartBarWrap: { flex:1, alignItems:'center', justifyContent:'flex-end', gap:4 },
  chartBarCount: { color:TEXT.t1, fontSize:9, fontFamily:FONT.mono, height:12 },
  chartBar: { width:'100%', backgroundColor:ACCENT, borderRadius:3 },
  chartBarLabel: { color:TEXT.t3, fontSize:8, fontFamily:FONT.mono, textAlign:'center' },

  trickCard: { ...PANEL.base, padding:16 },
  sectionTitle: { color:TEXT.t3, fontSize:10, fontFamily:FONT.mono, letterSpacing:2, textTransform:'uppercase', marginBottom:12 },
  trickRow: { flexDirection:'row', alignItems:'center', marginBottom:12, gap:10 },
  trickDot: { width:8, height:8, borderRadius:4 },
  trickName: { color:TEXT.t1, fontSize:12, fontFamily:FONT.bodySb, width:65, textTransform:'uppercase' },
  trickBarWrap: { flex:1, height:6, backgroundColor:BG.b4, borderRadius:3, overflow:'hidden' },
  trickBar: { height:'100%', borderRadius:3 },
  trickCount: { color:TEXT.t2, fontSize:12, fontFamily:FONT.mono, width:32, textAlign:'right' },

  logoutBtn: { ...BTN.base, ...BTN.ghost, justifyContent:'center', gap:8, paddingVertical:13 },
  logoutText: { color:TEXT.t3, fontSize:13, fontFamily:FONT.mono, letterSpacing:1, textTransform:'uppercase' },
});
