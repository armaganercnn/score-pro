import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCORE<Text style={{color: '#fff'}}>PRO</Text></Text>
        <TouchableOpacity style={styles.premiumButton}>
          <Text style={styles.premiumButtonText}>🌟 Premium Al</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Günün Kuponları</Text>
        
        {/* Free Coupon Card */}
        <View style={styles.card}>
          <View style={styles.badgeFree}>
            <Text style={styles.badgeFreeText}>Ücretsiz</Text>
          </View>
          <Text style={styles.cardTitle}>Günün Bankosu</Text>
          <Text style={styles.cardDesc}>Fenerbahçe - Galatasaray derbisinde ilk yarı 0.5 üstü garantili tahmin.</Text>
          <Text style={styles.cardTime}>🕒 Bugün, 19:00</Text>
        </View>

        {/* Premium Coupon Card */}
        <View style={[styles.card, styles.premiumCard]}>
          <View style={styles.badgePremium}>
            <Text style={styles.badgePremiumText}>Sadece Premium</Text>
          </View>
          <Text style={styles.premiumCardTitle}>Şampiyonlar Ligi Özel 🔒</Text>
          <Text style={styles.premiumCardDesc}>Sadece VIP üyelere özel detaylı analizler, yüksek oranlı banko tahminler ve dahası...</Text>
          <TouchableOpacity style={styles.unlockButton}>
            <Text style={styles.unlockButtonText}>Kilidi Aç</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Koyu mod arkaplan
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981', // Yeşil vurgu
    letterSpacing: 1,
  },
  premiumButton: {
    backgroundColor: '#f59e0b', // Kehribar (Amber)
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeFree: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeFreeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  premiumCard: {
    borderColor: '#f59e0b',
    backgroundColor: '#1e293b', // Koyu arkaplanı koru
  },
  badgePremium: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgePremiumText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  premiumCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  premiumCardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
    lineHeight: 20,
  },
  unlockButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  unlockButtonText: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 15,
  }
});
