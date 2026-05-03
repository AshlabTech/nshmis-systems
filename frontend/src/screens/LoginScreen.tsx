import { useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAppContext } from '../context/AppContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { FormCard } from '../components/FormCard';
import { THEME } from '../config/appConfig';
import { useFadeIn } from '../hooks/useFadeIn';

export const LoginScreen = () => {
  const { signIn, branding } = useAppContext();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const opacity = useFadeIn(380);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn({ identifier: identifier.trim(), password: password.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[{ flex: 1 }, { opacity }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Brand header */}
        <View style={styles.brandWrap}>
          {branding.logoUrl ? (
            <Image source={{ uri: branding.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>
                {branding.appName.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{branding.appName}</Text>
          <Text style={styles.subtitle}>Offline-first field data capture for Niger State outreach teams.</Text>
        </View>

        <FormCard>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor={THEME.muted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={THEME.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={() => void handleLogin()}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
              {showPassword ? <EyeOff size={19} color={THEME.muted} /> : <Eye size={19} color={THEME.muted} />}
            </Pressable>
          </View>

          <PrimaryButton title="Login" onPress={() => void handleLogin()} loading={loading} />

          <Text style={styles.note}>An internet connection is required for first-time login.</Text>
        </FormCard>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: THEME.background,
    padding: 24,
    justifyContent: 'center',
  },
  brandWrap: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 88, height: 88, marginBottom: 14 },
  logoFallback: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: THEME.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: THEME.teal,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoFallbackText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 24, fontWeight: '800', color: THEME.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { color: THEME.muted, lineHeight: 20, textAlign: 'center', fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: THEME.text,
    fontSize: 15,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    minHeight: 52,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: THEME.text,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14 },
  error: { color: THEME.danger, fontSize: 13, marginBottom: 10 },
  note: { marginTop: 8, color: THEME.muted, fontSize: 12, lineHeight: 18 },
});
