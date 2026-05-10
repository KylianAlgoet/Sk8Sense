import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TRICKS, DIFFICULTIES } from '../data/tricks';
import useTrickStore from '../store/trickStore';

const FILTERS = [
  { key: 'all', label: 'All', color: '#e94560' },
  { key: 1, label: 'Beginner', color: '#4CAF50' },
  { key: 2, label: 'Easy', color: '#8BC34A' },
  { key: 3, label: 'Intermediate', color: '#FF9800' },
  { key: 4, label: 'Advanced', color: '#F44336' },
  { key: 5, label: 'Expert', color: '#9C27B0' },
];

const CATEGORIES = ['All', 'Flatground', 'Balance', 'Rotation', 'Grinds', 'Switch'];

function DifficultyBadge({ level }) {
  const diff = DIFFICULTIES.find((d) => d.level === level);
  return (
    <View style={[badge.wrap, { backgroundColor: diff.color + '22', borderColor: diff.color + '44' }]}>
      <Text style={[badge.label, { color: diff.color }]}>{diff.label}</Text>
    </View>
  );
}

function Stars({ level }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontSize: 10, color: i < level ? '#FFD700' : '#333' }}>★</Text>
      ))}
    </View>
  );
}

function TrickModal({ trick, onClose }) {
  if (!trick) return null;
  const diff = DIFFICULTIES.find((d) => d.level === trick.difficulty);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Ionicons name="close" size={22} color="#aaa" />
          </TouchableOpacity>
          {trick.detectable && (
            <View style={modal.sensorBadge}>
              <Ionicons name="bluetooth" size={11} color="#e94560" />
              <Text style={modal.sensorText}>SK8Sense detectable</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={modal.content}>
          <Text style={modal.name}>{trick.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <DifficultyBadge level={trick.difficulty} />
            <View style={[modal.catBadge]}>
              <Text style={modal.catText}>{trick.category}</Text>
            </View>
            <Stars level={trick.difficulty} />
          </View>

          <Text style={modal.sectionTitle}>WHAT IS IT</Text>
          <Text style={modal.description}>{trick.description}</Text>

          <Text style={[modal.sectionTitle, { marginTop: 24 }]}>TIPS</Text>
          {trick.tips.map((tip, i) => (
            <View key={i} style={modal.tipRow}>
              <View style={[modal.tipDot, { backgroundColor: diff.color }]} />
              <Text style={modal.tipText}>{tip}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function LearningScreen({ navigation }) {
  const { selectTrick } = useTrickStore();
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('All');
  const [selectedTrick, setSelectedTrick] = useState(null);
  const [showCatFilter, setShowCatFilter] = useState(false);

  const handleTrickPress = (trick) => {
    if (trick.detectable) {
      selectTrick(trick.id);
      navigation.navigate('TrickIntro');
    } else {
      setSelectedTrick(trick);
    }
  };

  const filtered = useMemo(() => {
    return TRICKS.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchDiff = diffFilter === 'all' || t.difficulty === diffFilter;
      const matchCat = catFilter === 'All' || t.category === catFilter;
      return matchSearch && matchDiff && matchCat;
    });
  }, [search, diffFilter, catFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((t) => {
      if (!groups[t.difficulty]) groups[t.difficulty] = [];
      groups[t.difficulty].push(t);
    });
    return Object.entries(groups)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([level, tricks]) => ({ level: Number(level), tricks }));
  }, [filtered]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Learning</Text>
        <Text style={styles.subtitle}>{TRICKS.length} tricks in the library</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#555" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tricks..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Difficulty + category filters */}
      <View style={styles.filterWrap}>
        {FILTERS.map((f) => {
          const active = diffFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                { borderColor: active ? f.color : '#252535' },
                active && { backgroundColor: f.color + '28', borderColor: f.color },
              ]}
              onPress={() => setDiffFilter(active ? 'all' : f.key)}
            >
              {f.key !== 'all' && (
                <View style={[styles.filterDot, { backgroundColor: f.color }]} />
              )}
              <Text style={[styles.filterChipText, active && { color: f.color, fontWeight: 'bold' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[
            styles.filterChip,
            { borderColor: catFilter !== 'All' ? '#e94560' : '#252535' },
            catFilter !== 'All' && { backgroundColor: '#e9456028', borderColor: '#e94560' },
          ]}
          onPress={() => setShowCatFilter(true)}
        >
          <Ionicons name="funnel-outline" size={11} color={catFilter !== 'All' ? '#e94560' : '#555'} />
          <Text style={[styles.filterChipText, catFilter !== 'All' && { color: '#e94560', fontWeight: 'bold' }]}>
            {catFilter !== 'All' ? catFilter : 'Type'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category filter modal */}
      <Modal visible={showCatFilter} transparent animationType="fade" onRequestClose={() => setShowCatFilter(false)}>
        <TouchableOpacity style={styles.catOverlay} activeOpacity={1} onPress={() => setShowCatFilter(false)}>
          <View style={styles.catSheet}>
            <Text style={styles.catTitle}>Filter by type</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.catRow}
                onPress={() => { setCatFilter(cat); setShowCatFilter(false); }}
              >
                <Text style={[styles.catLabel, catFilter === cat && styles.catLabelActive]}>{cat}</Text>
                {catFilter === cat && <Ionicons name="checkmark" size={16} color="#e94560" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Results count */}
      <Text style={styles.resultsCount}>
        {filtered.length} trick{filtered.length !== 1 ? 's' : ''}
        {(diffFilter !== 'all' || catFilter !== 'All' || search) ? ' found' : ''}
      </Text>

      {/* Trick list grouped by difficulty */}
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.level.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No tricks found</Text>
          </View>
        }
        renderItem={({ item: group }) => {
          const diff = DIFFICULTIES.find((d) => d.level === group.level);
          return (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: diff.color }]} />
                <Text style={[styles.groupLabel, { color: diff.color }]}>
                  {diff.label.toUpperCase()}
                </Text>
                <Text style={styles.groupCount}>{group.tricks.length}</Text>
              </View>

              {group.tricks.map((trick) => (
                <TouchableOpacity
                  key={trick.id}
                  style={[styles.card, trick.detectable && styles.cardDetectable]}
                  onPress={() => handleTrickPress(trick)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardName}>{trick.name}</Text>
                      {trick.detectable && (
                        <View style={styles.detectBadge}>
                          <Ionicons name="bluetooth" size={9} color="#e94560" />
                        </View>
                      )}
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardCat}>{trick.category}</Text>
                      <Stars level={trick.difficulty} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#333" />
                </TouchableOpacity>
              ))}
            </View>
          );
        }}
      />

      <TrickModal trick={selectedTrick} onClose={() => setSelectedTrick(null)} />
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: 'bold' },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 16,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#16213e', alignItems: 'center', justifyContent: 'center',
  },
  sensorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#e9456015', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#e9456030',
  },
  sensorText: { color: '#e94560', fontSize: 11, fontWeight: 'bold' },
  content: { padding: 20, paddingTop: 4 },
  name: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  catBadge: { backgroundColor: '#16213e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { color: '#aaa', fontSize: 11 },
  sectionTitle: { color: '#555', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
  description: { color: '#ccc', fontSize: 15, lineHeight: 22 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  tipText: { color: '#aaa', fontSize: 14, flex: 1, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16 },
  title: { color: '#e94560', fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: '#555', fontSize: 13, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', marginHorizontal: 24,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#222', gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  filterWrap: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 4, paddingBottom: 10, gap: 8,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: '#16213e',
  },
  filterDot: { width: 7, height: 7, borderRadius: 3.5 },
  filterChipText: { color: '#666', fontSize: 12, fontWeight: '600' },

  catOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  catSheet: {
    backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  catTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 16 },
  catRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222',
  },
  catLabel: { color: '#aaa', fontSize: 16 },
  catLabelActive: { color: '#fff', fontWeight: 'bold' },

  resultsCount: { color: '#333', fontSize: 12, paddingHorizontal: 24, marginBottom: 4 },

  list: { paddingHorizontal: 24, paddingBottom: 100 },

  group: { marginBottom: 8 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, flex: 1 },
  groupCount: { color: '#333', fontSize: 11 },

  card: {
    backgroundColor: '#16213e', borderRadius: 12,
    padding: 14, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  cardDetectable: {
    borderWidth: 1, borderColor: '#e9456030',
  },
  cardLeft: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  detectBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#e9456022', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e9456044',
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardCat: { color: '#444', fontSize: 12 },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { color: '#555', fontSize: 14 },
});
