import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';

export default function LoginScreen({ navigation }) {
  const { login, setError, clearError, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      const msg = e.message || '';
      if (msg.includes('invalid-credential') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
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
          placeholder="Email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
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
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  inner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 14,
  },
  logo: { color: '#e94560', fontSize: 42, fontWeight: 'bold', letterSpacing: 4, marginBottom: 4 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  error: { color: '#e94560', fontSize: 13, textAlign: 'center' },
  input: {
    width: '100%', backgroundColor: '#16213e',
    borderRadius: 10, padding: 14, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#333',
  },
  btn: {
    backgroundColor: '#e94560', width: '100%',
    paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  link: { color: '#555', fontSize: 14, marginTop: 4 },
  linkAccent: { color: '#e94560' },
});
