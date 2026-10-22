import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { VolunteerJob } from '../types';
import { api } from '../services/api';

interface AvailableJobsScreenProps {
  onJobClaimed: () => void;
}

export const AvailableJobsScreen: React.FC<AvailableJobsScreenProps> = ({ onJobClaimed }) => {
  const [jobs, setJobs] = useState<VolunteerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getAvailableJobs();
      setJobs(data);
    } catch {
      Alert.alert('Notice', 'Unable to fetch dispatch jobs. Showing offline preview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleClaim = async (job: VolunteerJob) => {
    setClaimingId(job.pickup_id);
    try {
      const route = await api.claimJob(job.pickup_id);
      if (route) {
        Alert.alert(
          'Mission Claimed! 🚀',
          `You are now assigned to collect food from ${job.donor_name} and deliver to ${job.recipient_name}.`,
          [{ text: 'View Mission', onPress: onJobClaimed }]
        );
        fetchJobs();
      } else {
        Alert.alert('Notice', 'Could not claim this mission. It may have already been claimed by another volunteer.');
        fetchJobs();
      }
    } catch {
      Alert.alert('Error', 'Network error claiming mission.');
    } finally {
      setClaimingId(null);
    }
  };

  const renderJobCard = ({ item }: { item: VolunteerJob }) => {
    const isClaiming = claimingId === item.pickup_id;
    const isHotHolding = item.storage_condition.toLowerCase().includes('hot');
    const isChilled = item.storage_condition.toLowerCase().includes('chill') || item.storage_condition.toLowerCase().includes('refrig');

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.conditionBadge,
                isHotHolding
                  ? styles.hotBadge
                  : isChilled
                  ? styles.chilledBadge
                  : styles.ambientBadge,
              ]}
            >
              <Text
                style={[
                  styles.conditionBadgeText,
                  isHotHolding
                    ? styles.hotBadgeText
                    : isChilled
                    ? styles.chilledBadgeText
                    : styles.ambientBadgeText,
                ]}
              >
                {isHotHolding
                  ? '🔥 HOT HOLDING (≥60°C)'
                  : isChilled
                  ? '❄️ CHILLED (≤5°C)'
                  : '📦 AMBIENT'}
              </Text>
            </View>

            <View style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>⚡ HIGH PRIORITY</Text>
            </View>
          </View>

          <Text style={styles.jobTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.jobDescription}>{item.description}</Text>
          ) : null}
        </View>

        {/* Quantities & Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{item.portions}</Text>
            <Text style={styles.metricLbl}>Portions</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{item.quantity_kg} kg</Text>
            <Text style={styles.metricLbl}>Weight</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{item.road_distance_km} km</Text>
            <Text style={styles.metricLbl}>Road Dist</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{item.estimated_duration_minutes}m</Text>
            <Text style={styles.metricLbl}>Est Time</Text>
          </View>
        </View>

        {/* Waypoints */}
        <View style={styles.waypointsContainer}>
          {/* Pickup */}
          <View style={styles.waypointRow}>
            <View style={[styles.waypointDot, styles.pickupDot]} />
            <View style={styles.waypointInfo}>
              <Text style={styles.waypointType}>1. PICKUP AT</Text>
              <Text style={styles.waypointName}>{item.donor_name}</Text>
              <Text style={styles.waypointAddr} numberOfLines={1}>
                {item.donor_address}
              </Text>
            </View>
          </View>

          <View style={styles.waypointLine} />

          {/* Delivery */}
          <View style={styles.waypointRow}>
            <View style={[styles.waypointDot, styles.deliveryDot]} />
            <View style={styles.waypointInfo}>
              <Text style={styles.waypointType}>2. DELIVER TO</Text>
              <Text style={styles.waypointName}>{item.recipient_name}</Text>
              <Text style={styles.waypointAddr} numberOfLines={1}>
                {item.recipient_address}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.claimButton, isClaiming && styles.buttonDisabled]}
          disabled={isClaiming}
          onPress={() => handleClaim(item)}
          activeOpacity={0.8}
        >
          {isClaiming ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.claimButtonText}>Accept & Claim Mission</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>DISPATCH QUEUE</Text>
          <Text style={styles.headerTitle}>Available Missions</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchJobs}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching available surplus rescues...</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyTitle}>No Pending Missions</Text>
          <Text style={styles.emptyText}>
            All surplus food donations are currently assigned or delivered. Thank you for standing by!
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={fetchJobs}>
            <Text style={styles.secondaryBtnText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.pickup_id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hotBadge: {
    backgroundColor: colors.dangerSurface,
  },
  hotBadgeText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  chilledBadge: {
    backgroundColor: colors.primarySurface,
  },
  chilledBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  ambientBadge: {
    backgroundColor: colors.warningSurface,
  },
  ambientBadgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
  },
  urgencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  jobDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginVertical: 12,
    alignItems: 'center',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metricLbl: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  waypointsContainer: {
    marginVertical: 4,
    paddingLeft: 4,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  waypointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  pickupDot: {
    backgroundColor: colors.primary,
  },
  deliveryDot: {
    backgroundColor: colors.accent,
  },
  waypointLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.cardBorder,
    marginLeft: 5,
    marginVertical: 2,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointType: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textLight,
  },
  waypointName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  waypointAddr: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
