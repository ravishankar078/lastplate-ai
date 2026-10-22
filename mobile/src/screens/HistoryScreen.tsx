import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { VolunteerHistoryItem, VolunteerImpactSummary } from '../types';
import { api } from '../services/api';

export const HistoryScreen: React.FC = () => {
  const [impact, setImpact] = useState<VolunteerImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setImpact(data);
    } catch {
      // Handled via fallback in api.ts
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const renderHistoryItem = ({ item }: { item: VolunteerHistoryItem }) => {
    const formattedDate = new Date(item.completed_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          <View style={styles.co2Tag}>
            <Text style={styles.co2Text}>
              🌱 {(item.quantity_kg * 1.9).toFixed(1)} kg CO₂e saved
            </Text>
          </View>
        </View>

        <Text style={styles.donationTitle}>{item.donation_title}</Text>

        <View style={styles.routeSummary}>
          <Text style={styles.routeText} numberOfLines={1}>
            From: <Text style={styles.routeOrg}>{item.donor_name}</Text>
          </Text>
          <Text style={styles.routeText} numberOfLines={1}>
            To: <Text style={styles.routeOrg}>{item.recipient_name}</Text>
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statChip}>🍽️ {item.portions} Meals</Text>
          <Text style={styles.statChip}>⚖️ {item.quantity_kg} kg</Text>
          <Text style={styles.statChip}>📍 {item.distance_km} km</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>IMPACT & METRICS</Text>
          <Text style={styles.headerTitle}>My Food Rescues</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchHistory}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Calculating environmental impact...</Text>
        </View>
      ) : (
        <FlatList
          data={impact?.history || []}
          keyExtractor={(item) => item.pickup_id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            impact ? (
              <View style={styles.impactCard}>
                <View style={styles.impactBadge}>
                  <Text style={styles.impactBadgeText}>EPA WARM MODEL CERTIFIED</Text>
                </View>

                <Text style={styles.co2HeroNumber}>
                  {impact.co2_avoided_kg.toFixed(0)} <Text style={styles.co2Unit}>kg CO₂e</Text>
                </Text>
                <Text style={styles.co2HeroSubtitle}>
                  Greenhouse Gas Emissions Diverted from Landfills
                </Text>

                <View style={styles.impactGrid}>
                  <View style={styles.impactGridItem}>
                    <Text style={styles.gridVal}>{impact.total_rescues}</Text>
                    <Text style={styles.gridLbl}>Rescues</Text>
                  </View>
                  <View style={styles.gridSep} />
                  <View style={styles.impactGridItem}>
                    <Text style={styles.gridVal}>{impact.total_portions}</Text>
                    <Text style={styles.gridLbl}>Portions</Text>
                  </View>
                  <View style={styles.gridSep} />
                  <View style={styles.impactGridItem}>
                    <Text style={styles.gridVal}>{impact.total_quantity_kg} kg</Text>
                    <Text style={styles.gridLbl}>Food Saved</Text>
                  </View>
                  <View style={styles.gridSep} />
                  <View style={styles.impactGridItem}>
                    <Text style={styles.gridVal}>{impact.reliability_rating}%</Text>
                    <Text style={styles.gridLbl}>Reliability</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyTitle}>No Completed Rescues Yet</Text>
              <Text style={styles.emptyText}>
                Your completed food rescues and carbon reduction statistics will be recorded here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySurface,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  impactCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  impactBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  impactBadgeText: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  co2HeroNumber: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 44,
  },
  co2Unit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  co2HeroSubtitle: {
    fontSize: 13,
    color: '#D1FAE5',
    marginTop: 4,
    marginBottom: 18,
  },
  impactGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  impactGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gridLbl: {
    fontSize: 10,
    color: '#D1FAE5',
    marginTop: 2,
  },
  gridSep: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  co2Tag: {
    backgroundColor: colors.successSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  co2Text: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  routeSummary: {
    backgroundColor: '#F8FAF9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  routeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  routeOrg: {
    color: colors.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
