import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';
import T, { BG, TEXT, LINE, ACCENT, PANEL, BTN, FONT, SPACE, R } from '../design-tokens';

export default function LoginScreen({ navigation }) {
  const { login, setError, clearError, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Fill in all fields');
      return;
    }
    clearError();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (!mountedRef.current) return;
      const msg = e.message || '';
      if (msg.includes('invalid-credential') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>SK8SENSE</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email or Demo"
          placeholderTextColor={TEXT.t3}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={TEXT.t3}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color={T.ACCENT_INK} />
            : <Text style={styles.btnText}>SIGN IN</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { clearError(); navigation.navigate('Register'); }}>
          <Text style={styles.link}>
            No account yet? <Text style={styles.linkAccent}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG.base },
  inner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: SPACE.md,
  },
  logo: { color: ACCENT, fontSize: 42, fontFamily: FONT.display, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 4 },
  subtitle: { color: TEXT.t2, fontSize: 14, fontFamily: FONT.body, marginBottom: 8 },
  error: { color: ACCENT, fontSize: 13, fontFamily: FONT.body, textAlign: 'center' },
  input: {
    width: '100%', ...PANEL.base,
    padding: SPACE.md, color: TEXT.t1, fontSize: 15,
    fontFamily: FONT.body,
  },
  btn: {
    ...BTN.base, ...BTN.primary, width: '100%', marginTop: 8,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, elevation: 6,
  },
  btnText: { ...BTN.primaryText, fontSize: 16 },
  link: { color: TEXT.t3, fontSize: 14, fontFamily: FONT.body, marginTop: 4 },
  linkAccent: { color: ACCENT, fontFamily: FONT.body },
});
