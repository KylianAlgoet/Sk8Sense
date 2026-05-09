import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import useAuthStore from './store/authStore';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ConnectScreen from './screens/ConnectScreen';
import DashboardScreen from './screens/DashboardScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const ONBOARDING_KEY = 'sk8sense_onboarded';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#e94560" size="large" />
    </View>
  );
}

export default function App() {
  const { user, loading, init } = useAuthStore();
  const [hasOnboarded, setHasOnboarded] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = init();
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => setHasOnboarded(!!val));
    return unsubscribeAuth;
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setHasOnboarded(true);
  };

  if (loading || hasOnboarded === null) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasOnboarded ? (
          <Stack.Screen name="Onboarding">
            {(props) => <OnboardingScreen {...props} onComplete={handleOnboardingComplete} />}
          </Stack.Screen>
        ) : !user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Connect" component={ConnectScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
