import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';

export default function HomeScreen({ navigation }: any) {
  const { isPremium, refreshProfile } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchCoupons();
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const renderCouponCard = (coupon: any) => {
    const isLocked = coupon.is_premium && !isPremium;
    const isExpired = new Date(coupon.expires_at) < new Date();

    return (
      <TouchableOpacity
        key={coupon.id}
        onPress={() => {
          if (isLocked) {
            navigation.navigate('Premium');
          } else {
            navigation.navigate('CouponDetail', { couponId: coupon.id, title: coupon.title });
          }
        }}
        disabled={isExpired}
        style={[
          styles.card,
          coupon.is_premium ? styles.premiumCard : null,
          isExpired ? styles.expiredCard : null,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={coupon.is_premium ? styles.badgePremium : styles.badgeFree}>
            <Text style={coupon.is_premium ? styles.badgePremiumText : styles.badgeFreeText}>
              {coupon.is_premium ? '🌟 Premium VIP' : 'Ücretsiz'}
            </Text>
          </View>
          <View style={styles.oddsContainer}>
            <Text style={styles.oddsLabel}>Toplam Oran</Text>
            <Text style={[styles.oddsValue, coupon.is_premium ? styles.premiumOdds : styles.freeOdds]}>
              {coupon.total_odds}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{coupon.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{coupon.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardTime}>
            🕒 Bitiş: {new Date(coupon.expires_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isLocked ? (
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>Kilidi Aç 🔒</Text>
            </View>
          ) : (
            <Text style={styles.detailsLinkText}>Detayları Gör →</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCORE<Text style={{ color: '#fff' }}>PRO</Text></Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Premium')}
          style={[styles.premiumButton, isPremium ? styles.premiumButtonActive : null]}
        >
          <Text style={styles.premiumButtonText}>
            {isPremium ? '👑 VIP Üye' : '🌟 Premium Al'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />
          }
        >
          <Text style={styles.sectionTitle}>Günün Kuponları</Text>
          
          {coupons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Şu an aktif yayınlanan kupon bulunmuyor.</Text>
            </View>
          ) : (
            coupons.map(renderCouponCard)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 1,
  },
  premiumButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  premiumButtonActive: {
    backgroundColor: '#10b981',
  },
  premiumButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  premiumCard: {
    borderColor: '#f59e0b',
  },
  expiredCard: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeFree: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeFreeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgePremium: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgePremiumText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  oddsContainer: {
    alignItems: 'flex-end',
  },
  oddsLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  oddsValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  freeOdds: {
    color: '#10b981',
  },
  premiumOdds: {
    color: '#f59e0b',
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  detailsLinkText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: 'bold',
  },
  lockBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
