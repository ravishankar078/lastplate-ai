import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { colors } from '../theme/colors';
import { ActiveRoute, RouteStop } from '../types';
import { api } from '../services/api';
import { HandoverModal } from './HandoverModal';
import { ReportIssueModal } from './ReportIssueModal';

interface ActiveRouteScreenProps {
  onNavigateToJobs: () => void;
}

export const ActiveRouteScreen: React.FC<ActiveRouteScreenProps> = ({ onNavigateToJobs }) => {
  const [route, setRoute] = useState<ActiveRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [arrivingStopId, setArrivingStopId] = useState<string | null>(null);

  // Modals
  const [activeHandoverStop, setActiveHandoverStop] = useState<RouteStop | null>(null);
  const [activeIssuePickupId, setActiveIssuePickupId] = useState<string | null>(null);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const active = await api.getActiveRoute();
      setRoute(active);
    } catch {
      Alert.alert('Notice', 'Using offline route preview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  const handleMarkArrival = async (stop: RouteStop) => {
    setArrivingStopId(stop.id);
    try {
      const ok = await api.markStopArrival(stop.id);
      if (ok) {
        Alert.alert('Arrival Confirmed 📍', `You have arrived at ${stop.organization_name}. Please proceed with handover verification.`);
        await fetchRoute();
      } else {
        Alert.alert('Notice', 'Could not confirm arrival on backend. Updated locally.');
      }
    } catch {
      Alert.alert('Error', 'Network error marking arrival.');
    } finally {
      setArrivingStopId(null);
    }
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contact', 'No contact phone number provided for this stop.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Fetching active mission and route stops...</Text>
      </View>
    );
  }

  if (!route || !route.stops || route.stops.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🚚</Text>
        <Text style={styles.emptyTitle}>No Active Mission</Text>
        <Text style={styles.emptyText}>
          You do not have an active pickup or delivery assigned. Claim an open surplus food rescue mission to start helping!
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateToJobs}>
          <Text style={styles.primaryBtnText}>View Available Missions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allCompleted = route.stops.every((s) => s.status === 'completed');

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ACTIVE DISPATCH MISSION</Text>
          <Text style={styles.headerTitle}>Route & Waypoints</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchRoute}>
          <Text style={styles.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mission Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryVolName}>{route.volunteer_name}</Text>
              <Text style={styles.summaryVehicle}>Insulated Carrier &bull; VRP Verified</Text>
            </View>
            <View style={[styles.statusBadge, allCompleted ? styles.statusBadgeDone : styles.statusBadgeActive]}>
              <Text style={[styles.statusBadgeText, allCompleted ? styles.statusBadgeTextDone : styles.statusBadgeTextActive]}>
                {allCompleted ? 'All Stops Completed' : 'Mission In Progress'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{route.total_distance_km} km</Text>
              <Text style={styles.metricLbl}>Total Distance</Text>
            </View>
            <View style={styles.metricSep} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{route.total_duration_minutes} min</Text>
              <Text style={styles.metricLbl}>Est Time</Text>
            </View>
            <View style={styles.metricSep} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>
                {route.stops.filter((s) => s.status === 'completed').length}/{route.stops.length}
              </Text>
              <Text style={styles.metricLbl}>Stops Done</Text>
            </View>
          </View>
        </View>

        {/* Stops Sequence */}
        <Text style={styles.sectionHeader}>SEQUENCED COLLECTION & DELIVERY STOPS</Text>

        {route.stops.map((stop, index) => {
          const isPickup = stop.stop_type === 'pickup';
          const isCompleted = stop.status === 'completed';
          const isArrived = stop.status === 'arrived';
          const isPending = stop.status === 'pending';
          const isArriving = arrivingStopId === stop.id;

          return (
            <View
              key={stop.id}
              style={[
                styles.stopCard,
                isCompleted && styles.stopCardCompleted,
              ]}
            >
              {/* Stop Number & Type Banner */}
              <View style={styles.stopCardHeader}>
                <View style={styles.stopSeqRow}>
                  <View
                    style={[
                      styles.stopSeqCircle,
                      isCompleted
                        ? styles.stopSeqDone
                        : isPickup
                        ? styles.stopSeqPickup
                        : styles.stopSeqDelivery,
                    ]}
                  >
                    <Text style={styles.stopSeqText}>
                      {isCompleted ? '✓' : stop.stop_sequence || index + 1}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.stopTypeTag,
                        isPickup ? styles.stopTypePickup : styles.stopTypeDelivery,
                      ]}
                    >
                      {isPickup ? 'STOP 1: COLLECTION (DONOR)' : 'STOP 2: DELIVERY (RECIPIENT)'}
                    </Text>
                    <Text style={styles.stopOrgName}>{stop.organization_name}</Text>
                  </View>
                </View>

                {/* Status indicator */}
                <View
                  style={[
                    styles.stopStatusBadge,
                    isCompleted
                      ? styles.badgeCompleted
                      : isArrived
                      ? styles.badgeArrived
                      : styles.badgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.stopStatusText,
                      isCompleted
                        ? styles.textCompleted
                        : isArrived
                        ? styles.textArrived
                        : styles.textPending,
                    ]}
                  >
                    {isCompleted ? 'Completed' : isArrived ? 'Arrived On-Site' : 'En Route'}
                  </Text>
                </View>
              </View>

              {/* Address & Contact */}
              <View style={styles.stopDetails}>
                <Text style={styles.stopAddress}>📍 {stop.address}</Text>
                {stop.contact_phone ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleCall(stop.contact_phone)}
                  >
                    <Text style={styles.contactPhone}>📞 Call Contact: {stop.contact_phone}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Food & Safety SOP banner */}
              <View style={styles.safetyBox}>
                <Text style={styles.safetyTitle}>📋 Food Safety & Handover Instructions</Text>
                <Text style={styles.safetyText}>{stop.food_safety_instructions}</Text>
                <View style={styles.safetyTags}>
                  <Text style={styles.safetyTag}>
                    {stop.portions} Portions ({stop.quantity_kg} kg)
                  </Text>
                  <Text style={styles.safetyTag}>
                    Temp Target: {stop.storage_condition.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.stopActions}>
                {isPending && (
                  <TouchableOpacity
                    style={[styles.arriveBtn, isArriving && styles.btnDisabled]}
                    onPress={() => handleMarkArrival(stop)}
                    disabled={isArriving}
                    activeOpacity={0.8}
                  >
                    {isArriving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.arriveBtnText}>📍 I Have Arrived at Location</Text>
                    )}
                  </TouchableOpacity>
                )}

                {isArrived && (
                  <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={() => setActiveHandoverStop(stop)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.verifyBtnText}>
                      🔑 Enter Handover PIN ({isPickup ? 'Pickup' : 'Delivery'})
                    </Text>
                  </TouchableOpacity>
                )}

                {isCompleted && (
                  <View style={styles.verifiedRow}>
                    <Text style={styles.verifiedText}>✅ Handover Authenticated & Timestamped</Text>
                  </View>
                )}

                {!isCompleted && (
                  <TouchableOpacity
                    style={styles.issueBtn}
                    onPress={() => setActiveIssuePickupId(stop.pickup_id)}
                  >
                    <Text style={styles.issueBtnText}>⚠️ Report Exception / Delay</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Handover Verification Modal */}
      <HandoverModal
        visible={!!activeHandoverStop}
        stop={activeHandoverStop}
        onClose={() => setActiveHandoverStop(null)}
        onVerified={fetchRoute}
      />

      {/* Issue Reporting Modal */}
      <ReportIssueModal
        visible={!!activeIssuePickupId}
        pickupId={activeIssuePickupId}
        onClose={() => setActiveIssuePickupId(null)}
        onReported={fetchRoute}
      />
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
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
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
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  summaryVolName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  summaryVehicle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: colors.primarySurface,
  },
  statusBadgeTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadgeDone: {
    backgroundColor: colors.successSurface,
  },
  statusBadgeTextDone: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  summaryMetrics: {
    flexDirection: 'row',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  metricLbl: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    height: 24,
    backgroundColor: colors.cardBorder,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 8,
  },
  stopCard: {
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
  },
  stopCardCompleted: {
    backgroundColor: '#FAF9F8',
    opacity: 0.85,
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stopSeqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  stopSeqCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSeqPickup: {
    backgroundColor: colors.primary,
  },
  stopSeqDelivery: {
    backgroundColor: colors.accent,
  },
  stopSeqDone: {
    backgroundColor: colors.success,
  },
  stopSeqText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  stopTypeTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stopTypePickup: {
    color: colors.primary,
  },
  stopTypeDelivery: {
    color: colors.accent,
  },
  stopOrgName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  stopStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePending: {
    backgroundColor: '#F3F4F6',
  },
  textPending: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  badgeArrived: {
    backgroundColor: '#FEF3C7',
  },
  textArrived: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeCompleted: {
    backgroundColor: colors.successSurface,
  },
  textCompleted: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  stopDetails: {
    marginBottom: 12,
  },
  stopAddress: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  contactRow: {
    marginTop: 4,
  },
  contactPhone: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  safetyBox: {
    backgroundColor: colors.primarySurface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D4E5DB',
  },
  safetyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  safetyText: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 15,
  },
  safetyTags: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  safetyTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  stopActions: {
    gap: 8,
  },
  arriveBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  arriveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  verifiedRow: {
    backgroundColor: colors.successSurface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifiedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  issueBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  issueBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
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
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
