import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../api/supabase';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>SCORE<Text style={{ color: '#fff' }}>PRO</Text></Text>
            <Text style={styles.subtext}>Yapay Zeka Destekli Tahmin Platformu</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Sisteme Giriş</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-POSTA ADRESİ</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ŞİFRE</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <TouchableOpacity 
              onPress={handleLogin} 
              disabled={loading}
              style={styles.loginButton}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.loginButtonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigation.navigate('Register')}
              style={styles.registerLink}
            >
              <Text style={styles.registerLinkText}>Hesabınız yok mu? <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Kayıt Olun</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 2,
  },
  subtext: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
