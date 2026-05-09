import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';

export default function RegisterScreen({ navigation }) {
  const { register, setError, clearError, error } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName || !email || !password) {
      setError('Fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    clearError();
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('email-already-in-use')) {
        setError('Email already in use');
      } else if (msg.includes('invalid-email')) {
        setError('Invalid email address');
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
        <Text style={styles.subtitle}>Create your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#555"
          value={displayName}
          onChangeText={setDisplayName}
          returnKeyType="next"
        />
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
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>CREATE ACCOUNT</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { clearError(); navigation.navigate('Login'); }}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkAccent}>Sign in</Text>
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
