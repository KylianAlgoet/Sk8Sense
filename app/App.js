import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';

import useAuthStore from './store/authStore';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import MainTabs from './navigation/MainTabs';
import { BG, ACCENT } from './design-tokens';

const Stack = createNativeStackNavigator();
const ONBOARDING_KEY = 'sk8sense_onboarded';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BG.base, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={ACCENT} size="large" />
    </View>
  );
}

export default function App() {
  const { user, loading, init } = useAuthStore();
  const [hasOnboarded, setHasOnboarded] = useState(null);

  const [fontsLoaded] = useFonts({
    Archivo_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
  });

  useEffect(() => {
    const unsubscribeAuth = init();
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => setHasOnboarded(!!val));
    return unsubscribeAuth;
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    setHasOnboarded(true);
  };

  if (loading || hasOnboarded === null || !fontsLoaded) {
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
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
