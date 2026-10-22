import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { colors } from './src/theme/colors';
import { AvailableJobsScreen } from './src/screens/AvailableJobsScreen';
import { ActiveRouteScreen } from './src/screens/ActiveRouteScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';

type Tab = 'jobs' | 'active' | 'history';

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('jobs');
  const [isOnline, setIsOnline] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Top App Header */}
      <View style={styles.appHeader}>
        <View style={styles.branding}>
          <Text style={styles.brandLogo}>🌱</Text>
          <View>
            <Text style={styles.brandName}>LastPlate</Text>
            <Text style={styles.brandSubtitle}>Volunteer Dispatch</Text>
          </View>
        </View>

        {/* Volunteer status badge / toggle */}
        <TouchableOpacity
          style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
          onPress={() => setIsOnline(!isOnline)}
        >
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.statusText, isOnline ? styles.textOnline : styles.textOffline]}>
            {isOnline ? 'Online • Priya S.' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Body */}
      <View style={styles.screenContainer}>
        {currentTab === 'jobs' && (
          <AvailableJobsScreen onJobClaimed={() => setCurrentTab('active')} />
        )}
        {currentTab === 'active' && (
          <ActiveRouteScreen onNavigateToJobs={() => setCurrentTab('jobs')} />
        )}
        {currentTab === 'history' && <HistoryScreen />}
      </View>

      {/* Bottom Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'jobs' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('jobs')}
        >
          <Text style={styles.tabIcon}>📦</Text>
          <Text
            style={[styles.tabLabel, currentTab === 'jobs' && styles.tabLabelActive]}
          >
            Available Jobs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'active' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('active')}
        >
          <Text style={styles.tabIcon}>🚚</Text>
          <Text
            style={[styles.tabLabel, currentTab === 'active' && styles.tabLabelActive]}
          >
            Active Mission
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'history' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('history')}
        >
          <Text style={styles.tabIcon}>🌱</Text>
          <Text
            style={[styles.tabLabel, currentTab === 'history' && styles.tabLabelActive]}
          >
            My Impact
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  appHeader: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    fontSize: 26,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A7F3D0',
    letterSpacing: 0.8,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  statusOffline: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotOnline: {
    backgroundColor: '#34D399',
  },
  dotOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textOnline: {
    color: '#A7F3D0',
  },
  textOffline: {
    color: '#D1D5DB',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabButtonActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
