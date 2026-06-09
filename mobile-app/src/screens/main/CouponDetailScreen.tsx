import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';

export default function CouponDetailScreen({ route, navigation }: any) {
  const { couponId, title } = route.params;
  const { isPremium } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const { data, error } = await supabase
        .from('coupon_items')
        .select(`
          id,
          prediction,
          odds,
          status,
          matches (
            home_team,
            away_team,
            league,
            match_date
          )
        `)
        .eq('coupon_id', couponId);

      if (error) throw error;
      
      // If data is empty but we know the coupon exists, it means RLS blocked it (premium restriction)
      if (!data || data.length === 0) {
        setHasError(true);
      } else {
        setItems(data);
      }
    } catch (err: any) {
      console.error('Error fetching coupon items:', err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [couponId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🔒</Text>
        <Text style={styles.errorTitle}>Premium İçerik</Text>
        <Text style={styles.errorDesc}>
          Bu kuponun tahmin detaylarını sadece VIP Premium üyeler görebilir. 
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Premium')}
          style={styles.premiumRedirectButton}
        >
          <Text style={styles.premiumRedirectText}>🌟 VIP Üyeliğe Yükselt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.couponTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>Tahmin ve Detaylar</Text>

      {items.map((item, index) => (
        <View key={item.id || index} style={styles.matchCard}>
          <View style={styles.matchHeader}>
            <Text style={styles.leagueBadge}>{item.matches?.league || 'Genel'}</Text>
            <Text style={styles.matchTime}>
              {new Date(item.matches?.match_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <Text style={styles.matchTeams}>
            {item.matches?.home_team} <Text style={{ color: '#475569', fontWeight: 'normal' }}>vs</Text> {item.matches?.away_team}
          </Text>

          <View style={styles.predictionRow}>
            <View>
              <Text style={styles.predictionLabel}>Tahmin</Text>
              <Text style={styles.predictionValue}>{item.prediction}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.predictionLabel}>Oran</Text>
              <Text style={styles.oddsValue}>{item.odds}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matchCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchTime: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  matchTeams: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  predictionLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  oddsValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 12,
  },
  errorDesc: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  premiumRedirectButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumRedirectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
});
