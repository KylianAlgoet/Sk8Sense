import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, TEXT, LINE, ACCENT, FONT } from '../design-tokens';

import HomeScreen from '../screens/HomeScreen';
import ConnectScreen from '../screens/ConnectScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LearningScreen from '../screens/LearningScreen';
import TrickIntroScreen from '../screens/TrickIntroScreen';
import PracticeScreen from '../screens/PracticeScreen';
import PracticeSummaryScreen from '../screens/PracticeSummaryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const BoardStack = createNativeStackNavigator();
const LearnStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function BoardNavigator() {
  return (
    <BoardStack.Navigator screenOptions={{ headerShown: false }}>
      <BoardStack.Screen name="Home" component={HomeScreen} />
      <BoardStack.Screen name="Connect" component={ConnectScreen} />
      <BoardStack.Screen name="Dashboard" component={DashboardScreen} />
      <BoardStack.Screen name="SessionSummary" component={SessionSummaryScreen} />
    </BoardStack.Navigator>
  );
}

function LearnNavigator() {
  return (
    <LearnStack.Navigator screenOptions={{ headerShown: false }}>
      <LearnStack.Screen name="TrickList" component={LearningScreen} />
      <LearnStack.Screen name="TrickIntro" component={TrickIntroScreen} />
      <LearnStack.Screen name="Practice" component={PracticeScreen} />
      <LearnStack.Screen name="PracticeSummary" component={PracticeSummaryScreen} />
    </LearnStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="History" component={HistoryScreen} />
    </ProfileStack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isMiddle = index === 1;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        let iconName;
        if (route.name === 'Board') iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';
        else if (route.name === 'Learn') iconName = isFocused ? 'book' : 'book-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person-circle' : 'person-circle-outline';

        if (isMiddle) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.middleBtn}
              activeOpacity={0.85}
            >
              <View style={[styles.middleCircle, isFocused && styles.middleCircleActive]}>
                <Ionicons name={iconName} size={26} color="#fff" />
              </View>
              <Text style={[styles.middleLabel, isFocused && { color: '#fff' }]}>LEARN</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? ACCENT : TEXT.t3}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {options.tabBarLabel || route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Board" component={BoardNavigator} options={{ tabBarLabel: 'Board' }} />
      <Tab.Screen name="Learn" component={LearnNavigator} options={{ tabBarLabel: 'Learn' }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BG.b1,
    borderTopWidth: 1,
    borderTopColor: LINE.dim,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    color: TEXT.t3,
    fontSize: 8,
    fontFamily: FONT.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: ACCENT,
  },
  middleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    gap: 4,
  },
  middleCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  middleCircleActive: {
    opacity: 0.85,
  },
  middleLabel: {
    color: ACCENT,
    fontSize: 8,
    fontFamily: FONT.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
