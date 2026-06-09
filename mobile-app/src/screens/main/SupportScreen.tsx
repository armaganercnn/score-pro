import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';

export default function SupportScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!subject || !message) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject,
          message,
          status: 'open'
        });

      if (error) throw error;

      Alert.alert('Başarılı', 'Destek talebiniz başarıyla oluşturuldu. En kısa sürede yanıtlanacaktır.');
      setSubject('');
      setMessage('');
      fetchTickets();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Talep oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Destek & İletişim</Text>
      <Text style={styles.subtitle}>Herhangi bir sorunuz varsa bize yazın, yardımcı olalım.</Text>

      {/* New Ticket Form */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Yeni Talep Oluştur</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>KONU / BAŞLIK</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Örn: Ödeme Sorunu, Kupon Hk."
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>MESAJINIZ</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Detaylı bir şekilde sorununuzu açıklayın..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textArea]}
          />
        </View>

        <TouchableOpacity 
          onPress={handleSubmit} 
          disabled={submitting}
          style={styles.submitButton}
        >
          {submitting ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.submitButtonText}>Destek Talebini Gönder</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Past Tickets */}
      <Text style={styles.sectionTitle}>Geçmiş Talepleriniz</Text>
      
      {loading ? (
        <ActivityIndicator size="small" color="#10b981" style={{ marginVertical: 20 }} />
      ) : tickets.length === 0 ? (
        <Text style={styles.emptyText}>Henüz bir destek talebi oluşturmadınız.</Text>
      ) : (
        tickets.map(ticket => (
          <View key={ticket.id} style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <View style={[styles.statusBadge, ticket.status === 'open' ? styles.statusOpen : styles.statusClosed]}>
                <Text style={[styles.statusText, { color: ticket.status === 'open' ? '#ef4444' : '#10b981' }]}>
                  {ticket.status === 'open' ? 'Bekliyor' : 'Çözüldü'}
                </Text>
              </View>
            </View>
            <Text style={styles.ticketMessage}>{ticket.message}</Text>
            <Text style={styles.ticketDate}>
              {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  ticketCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusClosed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10b981', // green for closed, red for open handled dynamically below
  },
  ticketMessage: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});
