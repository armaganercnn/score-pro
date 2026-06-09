import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';

export default function PremiumScreen({ navigation }: any) {
  const { user, isPremium, premiumUntil, refreshProfile } = useAuth();
  
  const BASE_PRICE = 399.00; // Standard price
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [verifyingPromo, setVerifyingPromo] = useState(false);
  
  const [purchasing, setPurchasing] = useState(false);

  const discountedPrice = BASE_PRICE - (BASE_PRICE * (discount / 100));

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    
    setVerifyingPromo(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .gt('valid_until', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDiscount(data.discount_percentage);
        setCampaignId(data.id);
        Alert.alert('Başarılı', `Tebrikler! %${data.discount_percentage} indirim uygulandı.`);
      } else {
        setDiscount(0);
        setCampaignId(null);
        Alert.alert('Geçersiz Kod', 'Girdiğiniz indirim kodu geçersiz veya süresi dolmuş.');
      }
    } catch (err: any) {
      Alert.alert('Hata', 'Kod doğrulanamadı.');
    } finally {
      setVerifyingPromo(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert('Hata', 'Lütfen önce giriş yapın.');
      return;
    }

    setPurchasing(true);
    try {
      // 1. Simulate API Payment Delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2. Insert Transaction into financial_transactions
      const { error: txError } = await supabase
        .from('financial_transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(discountedPrice.toFixed(2)),
          currency: 'TRY',
          transaction_type: 'premium_purchase',
          status: 'completed'
        });

      if (txError) throw txError;

      // 3. Update User's premium_until
      const premiumDate = new Date();
      premiumDate.setDate(premiumDate.getDate() + 30); // 30 days premium

      const { error: userError } = await supabase
        .from('users')
        .update({
          premium_until: premiumDate.toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // 4. Refresh global Auth State
      await refreshProfile();

      Alert.alert('Başarılı', 'Ödemeniz başarıyla tamamlandı! SCOREPRO VIP ayrıcalıklarınız hemen tanımlandı.', [
        { text: 'Kuponları İncele', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err: any) {
      Alert.alert('Ödeme Hatası', err.message || 'VIP paket satın alınamadı.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <View style={styles.header}>
        <Text style={styles.crownIcon}>👑</Text>
        <Text style={styles.title}>SCOREPRO VIP</Text>
        <Text style={styles.subtitle}>En Yüksek Oranlı AI Analizli Tahminlere Erişin</Text>
      </View>

      {isPremium ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>Aboneliğiniz Aktif! 🎉</Text>
          <Text style={styles.activeText}>
            VIP Premium ayrıcalıklarından yararlanıyorsunuz. Tüm kilitli kuponlar şu an erişiminize açıktır.
          </Text>
          <Text style={styles.activeExpiry}>
            Bitiş Tarihi: {premiumUntil ? new Date(premiumUntil).toLocaleDateString('tr-TR') : '-'}
          </Text>
        </View>
      ) : (
        <View style={styles.pricingCard}>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>Yüksek güvenilirlikli VIP Kuponlar</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>Yapay zeka (AI) Poisson regresyon analizleri</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>Sınırsız kupon detay görüntüleme</Text>
          </View>

          <View style={styles.separator} />

          {/* Promo Code Section */}
          <View style={styles.promoSection}>
            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="İndirim Kodu Girin (Örn: VIP10)"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              style={styles.promoInput}
            />
            <TouchableOpacity 
              onPress={handleApplyPromo}
              disabled={verifyingPromo}
              style={styles.promoButton}
            >
              {verifyingPromo ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.promoButtonText}>Uygula</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Pricing Info */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Aylık Katılım Bedeli</Text>
              {discount > 0 && (
                <Text style={styles.oldPrice}>{BASE_PRICE.toFixed(2)} ₺</Text>
              )}
            </View>
            <Text style={styles.priceValue}>{discountedPrice.toFixed(2)} ₺</Text>
          </View>

          <TouchableOpacity 
            onPress={handlePurchase}
            disabled={purchasing}
            style={styles.purchaseButton}
          >
            {purchasing ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.purchaseButtonText}>Güvenli Ödeme ve Kilidi Aç</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.secureText}>🔒 Ödemeniz 256-Bit SSL ile korunmaktadır.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  crownIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  activeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 12,
  },
  activeText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  activeExpiry: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '700',
  },
  pricingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitCheck: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 12,
  },
  benefitText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 20,
  },
  promoSection: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
    marginRight: 10,
  },
  promoButton: {
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  promoButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  oldPrice: {
    fontSize: 13,
    color: '#64748b',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  priceValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f59e0b',
  },
  purchaseButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  secureText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});
