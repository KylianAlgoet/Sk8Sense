import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ConnectScreen from '../screens/ConnectScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionSummaryScreen from '../screens/SessionSummaryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LearningScreen from '../screens/LearningScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const BoardStack = createNativeStackNavigator();
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

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="History" component={HistoryScreen} />
    </ProfileStack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isMiddle = index === 1;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        let iconName;
        if (route.name === 'Board') iconName = isFocused ? 'radio' : 'radio-outline';
        else if (route.name === 'Learn') iconName = isFocused ? 'book' : 'book-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

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
              <Text style={styles.middleLabel}>LEARN</Text>
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
              color={isFocused ? '#e94560' : '#444'}
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
      <Tab.Screen name="Learn" component={LearningScreen} options={{ tabBarLabel: 'Learn' }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f0f1a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    height: 72,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },
  tabLabel: {
    color: '#444',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#e94560',
  },

  middleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    gap: 4,
  },
  middleCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  middleCircleActive: {
    backgroundColor: '#c73550',
  },
  middleLabel: {
    color: '#e94560',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
