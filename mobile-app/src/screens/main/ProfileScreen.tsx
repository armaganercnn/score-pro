import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../api/supabase';

export default function ProfileScreen() {
  const { user, isPremium, premiumUntil, signOut } = useAuth();
  
  // CMS Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [cmsContent, setCmsContent] = useState('');
  const [fetchingCms, setFetchingCms] = useState(false);

  const fetchCmsPage = async (slug: string, title: string) => {
    setModalTitle(title);
    setModalVisible(true);
    setFetchingCms(true);
    setCmsContent('');

    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('content')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.content) {
        // Strip HTML tags for basic text rendering in React Native
        const plainText = data.content
          .replace(/<[^>]*>/g, '\n') // Replace HTML tags with newlines
          .replace(/\n\s*\n/g, '\n\n') // Remove multiple consecutive newlines
          .trim();
        setCmsContent(plainText);
      } else {
        setCmsContent('Bu sayfa içeriği henüz hazırlanmamıştır.');
      }
    } catch (err) {
      console.error('Error fetching CMS page:', err);
      setCmsContent('İçerik yüklenirken bir hata oluştu.');
    } finally {
      setFetchingCms(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Evet, Çık', style: 'destructive', onPress: signOut }
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.title}>Hesabım</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.emailText}>{user?.email || 'Kullanıcı'}</Text>
          <View style={[styles.badge, isPremium ? styles.badgePremium : styles.badgeStandard]}>
            <Text style={isPremium ? styles.badgePremiumText : styles.badgeStandardText}>
              {isPremium ? '👑 VIP Premium Üye' : 'Standart Üye'}
            </Text>
          </View>
        </View>

        {/* Premium Expiry Info */}
        {isPremium && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>VIP YETKİ BİTİŞİ</Text>
            <Text style={styles.infoValue}>
              {premiumUntil ? new Date(premiumUntil).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' }) : '-'}
            </Text>
          </View>
        )}

        {/* Corporate / CMS Links */}
        <Text style={styles.sectionTitle}>Kurumsal</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity 
            onPress={() => fetchCmsPage('about', 'Hakkımızda')}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemText}>Hakkımızda</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.menuSeparator} />
          
          <TouchableOpacity 
            onPress={() => fetchCmsPage('terms', 'Kullanım Koşulları')}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemText}>Kullanım Koşulları</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.menuSeparator} />

          <TouchableOpacity 
            onPress={() => fetchCmsPage('privacy', 'Gizlilik Politikası')}
            style={styles.menuItem}
          >
            <Text style={styles.menuItemText}>Gizlilik Politikası</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutButtonText}>Oturumu Kapat</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CMS Page Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {fetchingCms ? (
                <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
              ) : (
                <Text style={styles.cmsText}>{cmsContent}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  emailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeStandard: {
    backgroundColor: '#334155',
  },
  badgeStandardText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgePremium: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  badgePremiumText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  menuItemText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  menuArrow: {
    color: '#475569',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 20,
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  signOutButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContent: {
    marginBottom: 20,
  },
  cmsText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
  },
});
