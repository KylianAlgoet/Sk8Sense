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
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Archivo_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
  });

  useEffect(() => {
    return init();
  }, []);

  useEffect(() => {
    console.log('AUTH STATE:', loading, user?.uid);
    if (loading) return;
    if (!user) {
      setHasOnboarded(null);
      setOnboardingLoading(false);
      return;
    }
    setOnboardingLoading(true);
    const key = `sk8sense_onboarded_${user.uid}`;
    console.log('CHECKING KEY:', key);
    AsyncStorage.getItem(key).then((val) => {
      console.log('ONBOARDING VAL:', val);
      setHasOnboarded(!!val);
      setOnboardingLoading(false);
    });
  }, [user?.uid, loading]);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(`sk8sense_onboarded_${user.uid}`, '1');
    setHasOnboarded(true);
  };

  if (loading || onboardingLoading || !fontsLoaded) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !hasOnboarded ? (
          <Stack.Screen name="Onboarding">
            {(props) => <OnboardingScreen {...props} onComplete={handleOnboardingComplete} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
