import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Truck,
  Navigation,
  MapPin,
  Thermometer,
  Zap,
  Flame,
  Radio,
  Activity,
  Send,
  Compass,
  BarChart3,
  TrendingUp,
  Leaf,
  Eye,
  RefreshCw,
  XCircle,
  Layers
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { adminService } from '../../services/api/adminService';
import { routingService } from '../../services/api/routingService';
import { socketService } from '../../services/websocket/socketService';
import { 
  AuditLogEntry, 
  AutoDispatchResult, 
  CourierTelemetry,
  AdminAnalyticsOverview,
  AdminOrganizationItem,
  FlaggedDonationItem
} from '../../types';

export const AdminPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'organizations' | 'routing' | 'audit'>('analytics');
  const [loading, setLoading] = useState(true);

  // Administrative State
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganizationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [flaggedDonations, setFlaggedDonations] = useState<FlaggedDonationItem[]>([]);

  // OR-Tools Dispatch state
  const [dispatchResult, setDispatchResult] = useState<AutoDispatchResult | null>(null);
  const [runningDispatch, setRunningDispatch] = useState(false);

  // Phase 11: Real-Time Telemetry & WebSocket state
  const [wsConnected, setWsConnected] = useState<boolean>(socketService.isConnected());
  const [couriers, setCouriers] = useState<CourierTelemetry[]>([]);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [sendingAlert, setSendingAlert] = useState<boolean>(false);

  // Modal Review States
  const [reviewingDonation, setReviewingDonation] = useState<FlaggedDonationItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'release' | 'quarantine_reject'>('release');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Modal Suspend Org State
  const [suspendingOrg, setSuspendingOrg] = useState<AdminOrganizationItem | null>(null);
  const [suspendNotes, setSuspendNotes] = useState('');
  const [submittingSuspend, setSubmittingSuspend] = useState(false);

  // Modal Audit Inspection State
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [stats, orgs, logs, flagged] = await Promise.all([
        adminService.getAnalyticsOverview(),
        adminService.getOrganizations(),
        adminService.getAuditLogs(),
        adminService.getFlaggedDonations(),
      ]);
      setAnalytics(stats);
      setOrganizations(orgs);
      setAuditLogs(logs);
      setFlaggedDonations(flagged);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Phase 11: Real-time telemetry subscription & courier tracking
  useEffect(() => {
    // Subscribe to dispatch channel
    socketService.subscribe('dispatch');
    setWsConnected(socketService.isConnected());

    const unsubStatus = socketService.on('connection_status', ({ connected }: { connected: boolean }) => {
      setWsConnected(connected);
    });

    const unsubLocation = socketService.on('courier_location', (data: CourierTelemetry) => {
      setCouriers((prev) => {
        const idx = prev.findIndex((c) => c.courier_id === data.courier_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    // Initial fetch of active couriers
    routingService.getActiveCouriers().then((initialCouriers) => {
      if (initialCouriers && initialCouriers.length > 0) {
        setCouriers(initialCouriers);
      }
    });

    return () => {
      unsubStatus();
      unsubLocation();
    };
  }, []);

  const handleBroadcastAlert = async () => {
    if (!alertMessage.trim()) return;
    setSendingAlert(true);
    const ok = await routingService.broadcastAlert({
      title: 'Fleet Command Notice',
      message: alertMessage.trim(),
      priority: 'high',
      channel: 'global',
    });
    setSendingAlert(false);
    if (ok) {
      showToast('Broadcast Dispatched', 'Real-time alert transmitted across all connected WebSocket clients.', 'success');
      setAlertMessage('');
    } else {
      showToast('Broadcast Failed', 'Could not transmit alert over network.', 'error');
    }
  };

  const handleSimulateTelemetry = () => {
    const courierId = 'courier-01';
    const simulated: CourierTelemetry = {
      courier_id: courierId,
      courier_name: 'Priya Sharma (Bicycle Courier)',
      latitude: Number((12.9716 + (Math.random() - 0.5) * 0.008).toFixed(4)),
      longitude: Number((77.5946 + (Math.random() - 0.5) * 0.008).toFixed(4)),
      speed_kmh: Math.round(14 + Math.random() * 8),
      heading_deg: Math.round(Math.random() * 360),
      timestamp: new Date().toISOString(),
    };
    socketService.sendCourierLocation(simulated);
    setCouriers((prev) => {
      const idx = prev.findIndex((c) => c.courier_id === simulated.courier_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = simulated;
        return updated;
      }
      return [simulated, ...prev];
    });
    showToast('GPS Telemetry Emitted', `Streamed live GPS update for ${simulated.courier_name} over WebSocket.`, 'info');
  };

  const handleVerifyOrg = async (orgId: string, orgName: string) => {
    const updated = await adminService.verifyOrganization(orgId);
    if (updated) {
      showToast(
        'Organization Approved & Verified',
        `${orgName} granted permission to post and receive food donations.`,
        'success'
      );
      loadAdminData();
    }
  };

  const handleSuspendOrgConfirm = async () => {
    if (!suspendingOrg) return;
    setSubmittingSuspend(true);
    const updated = await adminService.suspendOrganization(suspendingOrg.id, suspendNotes);
    setSubmittingSuspend(false);
    setSuspendingOrg(null);
    setSuspendNotes('');
    if (updated) {
      showToast(
        'Organization Suspended',
        `${updated.name} has been placed under administrative suspension.`,
        'warning'
      );
      loadAdminData();
    }
  };

  const handleReviewFlaggedConfirm = async () => {
    if (!reviewingDonation) return;
    setSubmittingReview(true);
    const updated = await adminService.reviewFlaggedDonation(
      reviewingDonation.id,
      reviewAction,
      reviewNotes || (reviewAction === 'release' ? 'Cleared by regulatory officer' : 'Quarantined for health safety')
    );
    setSubmittingReview(false);
    setReviewingDonation(null);
    setReviewNotes('');
    if (updated) {
      showToast(
        reviewAction === 'release' ? 'Donation Cleared & Released' : 'Donation Quarantined',
        `Donation '${updated.title}' updated to ${updated.status}.`,
        reviewAction === 'release' ? 'success' : 'warning'
      );
      loadAdminData();
    }
  };

  const handleRunAutoDispatch = async () => {
    setRunningDispatch(true);
    try {
      const result = await routingService.runAutoDispatch();
      setDispatchResult(result);
      showToast(
        'Google OR-Tools Dispatch Complete! 🚀',
        result.message || `Assigned ${result.assigned_orders_count} orders across ${result.assigned_routes_count} courier routes.`,
        'success'
      );
      const logs = await adminService.getAuditLogs();
      setAuditLogs(logs);
    } catch {
      showToast('Dispatch Error', 'Could not run fleet auto-dispatch.', 'error');
    } finally {
      setRunningDispatch(false);
    }
  };

  // Organizations Table Columns
  const orgColumns: Column<AdminOrganizationItem>[] = [
    {
      key: 'name',
      header: 'Organization & Category',
      sortable: true,
      render: (o) => (
        <div>
          <p className="font-bold text-forest-950">{o.name}</p>
          <span className="text-[11px] text-stone-500 font-medium capitalize">
            {o.org_type.replace('_', ' ')} &bull; <strong className="uppercase">{o.category}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'contact_phone',
      header: 'Primary Contact',
      render: (o) => (
        <div>
          <span className="font-medium text-stone-800 block text-xs">{o.contact_email}</span>
          <span className="text-[11px] text-stone-500">{o.contact_phone}</span>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Operating Address',
      render: (o) => (
        <span className="text-xs text-stone-600 block max-w-xs truncate">
          {o.address}, {o.postal_code}
        </span>
      ),
    },
    {
      key: 'is_verified',
      header: 'Verification Status',
      sortable: true,
      render: (o) => (
        <Badge
          variant={o.is_verified ? 'emerald' : 'amber'}
          size="sm"
        >
          {o.is_verified ? 'Verified & Active' : 'Pending Verification'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Admin Actions',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-2">
          {!o.is_verified ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleVerifyOrg(o.id, o.name)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Approve
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSuspendingOrg(o);
                setSuspendNotes('');
              }}
              className="text-stone-600 hover:text-red-700 hover:border-red-300 text-xs"
            >
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Audit Logs Table Columns
  const auditColumns: Column<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Audit Event',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-[11px] font-bold text-forest-900 bg-forest-50 px-2.5 py-1 rounded-lg border border-forest-100">
          {log.action}
        </span>
      ),
    },
    {
      key: 'performedByName',
      header: 'Actor',
      render: (log) => (
        <div>
          <span className="font-semibold text-stone-800 block text-xs">{log.performedByName}</span>
          <span className="text-[10px] text-stone-500 uppercase font-mono">{log.performedByRole}</span>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity / Target',
      render: (log) => (
        <div>
          <span className="text-xs text-stone-700 font-medium block">
            {log.entityType}
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            {log.entityId ? `${log.entityId.slice(0, 12)}...` : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span className="text-xs font-mono text-stone-500">
          {log.timestamp.slice(0, 19).replace('T', ' ')}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Inspection',
      align: 'right',
      render: (log) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInspectingLog(log)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          className="text-xs py-1"
        >
          Diff
        </Button>
      ),
    },
  ];

  const maxDailyMeals = analytics?.daily_trends && analytics.daily_trends.length > 0
    ? Math.max(...analytics.daily_trends.map(t => t.meals), 100)
    : 500;

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            System Operations & Compliance Command
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            Platform Administration & Impact Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Administrator: <strong>{user?.fullName}</strong> &bull; RBAC Level: Superadmin &bull; Central Metro Operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAdminData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Refresh Metrics
          </Button>
          <Badge variant="stone" size="md">
            RBAC: Strict Access
          </Badge>
        </div>
      </div>

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Meals Rescued"
          value={analytics ? analytics.total_meals_rescued.toLocaleString() : '...'}
          icon={CheckCircle2}
          subtext={`${analytics?.total_quantity_kg ? analytics.total_quantity_kg.toLocaleString() : '0'} kg redistributed`}
          badge={{ 
            label: analytics?.is_sample_baseline ? 'Sample Baseline' : 'Verified Real', 
            variant: 'forest' 
          }}
        />
        <StatCard
          title="Net CO2 Avoided"
          value={analytics ? `${analytics.co2_avoided_kg.toLocaleString()} kg` : '...'}
          icon={Leaf}
          subtext="2.5x emissions factor"
          trend={{ direction: 'up', label: 'Net Zero impact' }}
        />
        <StatCard
          title="Landfill Diversion"
          value={analytics ? `${analytics.landfill_diversion_rate}%` : '...'}
          icon={TrendingUp}
          subtext="Avoided waste disposal"
          badge={{ label: 'Target: >95%', variant: 'emerald' }}
        />
        <StatCard
          title="Food Safety Compliance"
          value={analytics ? `${analytics.food_safety_compliance_rate}%` : '...'}
          icon={ShieldCheck}
          subtext="Zero temperature breaches"
          badge={{ label: 'Active QA', variant: 'forest' }}
        />
      </div>

      {/* Main Tabs */}
      <div className="space-y-4">
        <Tabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
          tabs={[
            { id: 'analytics', label: 'Platform Analytics & Impact' },
            { id: 'organizations', label: 'Organization Verification', count: organizations.length },
            { id: 'routing', label: 'OR-Tools Fleet Dispatch & VRP' },
            { id: 'audit', label: 'Immutable Audit Trail', count: auditLogs.length },
          ]}
        />

        {/* TAB 1: PLATFORM ANALYTICS & IMPACT */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Environmental & Social Impact Summary */}
            <div className="p-6 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-850 rounded-3xl text-white shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    REAL-TIME POSTGRESQL AGGREGATION
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    FAO EMISSION STANDARDS
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold">
                  City-Wide Food Rescue & Ecological Impact
                </h3>
                <p className="text-xs text-forest-200 leading-relaxed">
                  Metrics reflect live state transitions from registered donors to recipient hunger-relief shelters. Every kilogram of rescued food prevents an average of 2.5 kg of greenhouse gases (CO2e) generated in decomposition landfills.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-forest-900/60 p-4 rounded-2xl border border-forest-800">
                <div className="text-center px-3">
                  <span className="text-[10px] uppercase font-bold text-forest-300 block">Active Donors</span>
                  <strong className="text-xl font-bold text-white font-mono">{analytics?.active_donors || 0}</strong>
                </div>
                <div className="h-8 w-px bg-forest-800 hidden sm:block" />
                <div className="text-center px-3">
                  <span className="text-[10px] uppercase font-bold text-forest-300 block">Verified NGOs</span>
                  <strong className="text-xl font-bold text-white font-mono">{analytics?.verified_ngos || 0}</strong>
                </div>
                <div className="h-8 w-px bg-forest-800 hidden sm:block" />
                <div className="text-center px-3">
                  <span className="text-[10px] uppercase font-bold text-forest-300 block">Active Couriers</span>
                  <strong className="text-xl font-bold text-white font-mono">{analytics?.active_volunteers || 0}</strong>
                </div>
              </div>
            </div>

            {/* Middle Section: Surplus Distribution & Volume Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Category Breakdown */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-forest-800" />
                    <h4 className="font-serif text-lg font-bold text-forest-950">
                      Surplus Food Category Distribution
                    </h4>
                  </div>
                  <span className="text-xs text-stone-500 font-mono">
                    {analytics?.total_donations || 0} total posts
                  </span>
                </div>

                <p className="text-xs text-stone-600">
                  Relative proportion of food donations logged across key preservation categories.
                </p>

                <div className="space-y-3 pt-2">
                  {analytics && Object.entries(analytics.category_breakdown).map(([cat, count]) => {
                    const total = Math.max(analytics.total_donations, 1);
                    const pct = Math.round((count / total) * 100);
                    const label = cat.replace('_', ' ');

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-800 capitalize">
                            {label}
                          </span>
                          <span className="text-stone-500 font-mono font-bold">
                            {count} batches &bull; {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full bg-forest-800 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 7-Day Rescue Trends Bar Chart */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-700" />
                    <h4 className="font-serif text-lg font-bold text-forest-950">
                      7-Day Rescue Volume & Trendline
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Live History
                  </span>
                </div>

                <p className="text-xs text-stone-600">
                  Daily meal portions scheduled and delivered across participating city sectors.
                </p>

                {/* CSS Bar Chart */}
                <div className="pt-6 pb-2">
                  <div className="h-44 flex items-end justify-between gap-3 border-b border-stone-200 px-2 pb-1">
                    {analytics?.daily_trends.map((day) => {
                      const heightPercent = Math.max(Math.round((day.meals / maxDailyMeals) * 100), 15);
                      return (
                        <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-10 bg-stone-900 text-white text-[10px] px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                            <strong>{day.meals} meals</strong> &bull; {day.weight_kg}kg ({day.co2_kg}kg CO2)
                          </div>
                          
                          {/* Bar */}
                          <div
                            className="w-full bg-gradient-to-t from-forest-900 via-forest-800 to-emerald-600 rounded-t-xl group-hover:from-forest-800 group-hover:to-emerald-500 transition-all cursor-pointer shadow-sm min-h-[16px]"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[10px] font-mono text-stone-500 tracking-tighter shrink-0">
                            {day.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mt-2 font-mono">
                    <span>Baseline (T-7)</span>
                    <span>Peak Daily Volume: {maxDailyMeals} meals</span>
                    <span>Today (Live)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Food Safety & Cold-Chain Quarantine Management */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-forest-800" />
                    <h4 className="font-serif text-lg font-bold text-forest-950">
                      Food Safety & Cold-Chain Quarantine Monitor
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Donations with logged temperature breaches or allergen ambiguity are held in quarantine until verified.
                  </p>
                </div>

                <Badge variant={flaggedDonations.length === 0 ? 'emerald' : 'amber'} size="md">
                  {flaggedDonations.length === 0 ? '0 Active Quarantine Holds' : `${flaggedDonations.length} Flagged for Review`}
                </Badge>
              </div>

              {flaggedDonations.length === 0 ? (
                <div className="py-8 text-center text-stone-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm text-stone-800">
                    All Surplus Food Clear of Safety Holds
                  </p>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Every active and delivered batch meets regulatory food temperature thresholds (&ge;60°C for hot holding, &le;5°C for chilled).
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {flaggedDonations.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                            Safety Quarantine
                          </span>
                          <strong className="font-bold text-stone-900 text-sm">{d.title}</strong>
                        </div>
                        <p className="text-stone-600">
                          Donor: <strong>{d.donor_name}</strong> &bull; Quantity: <strong>{d.quantity_kg} kg ({d.portions} portions)</strong>
                        </p>
                        <p className="text-amber-800 font-mono text-[11px]">
                          Reason: {d.safety_notes || 'Temperature measurement warning detected during pickup attempt.'}
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setReviewingDonation(d);
                          setReviewAction('release');
                          setReviewNotes('');
                        }}
                      >
                        Review Batch
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ORGANIZATIONS */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner label="Loading organization records..." />
              </div>
            ) : (
              <DataTable
                columns={orgColumns}
                data={organizations}
                keyExtractor={(o) => o.id}
                searchPlaceholder="Search organization name, category, or contact..."
                searchFilter={(o, q) =>
                  o.name.toLowerCase().includes(q) || o.category.toLowerCase().includes(q)
                }
                emptyTitle="No organizations registered"
                emptyDescription="New restaurant and NGO registrations will appear here for verification."
              />
            )}
          </div>
        )}

        {/* TAB 3: OR-TOOLS FLEET DISPATCH */}
        {activeTab === 'routing' && (
          <div className="space-y-6">
            {/* Solver Controls Banner */}
            <div className="p-6 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-850 rounded-3xl text-white shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ALGORITHM: GOOGLE OR-TOOLS VRP
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PDPTW SOLVER
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold">
                  Fleet Auto-Dispatch & Route Optimization
                </h3>
                <p className="text-xs text-forest-200 leading-relaxed">
                  Solves the Capacitated Vehicle Routing Problem with Pickup and Delivery with Time Windows (PDPTW). Enforces strict pickup-before-delivery precedence, vehicle capacity (kg), urban road circuity, and food safety transit time thresholds.
                </p>
              </div>

              <Button
                variant="accent"
                size="lg"
                disabled={runningDispatch}
                onClick={handleRunAutoDispatch}
                leftIcon={<Zap className={`w-5 h-5 ${runningDispatch ? 'animate-spin' : ''}`} />}
              >
                {runningDispatch ? 'Solving VRP Engine...' : 'Run Fleet Auto-Dispatch'}
              </Button>
            </div>

            {/* Phase 11: Real-Time Fleet Telemetry & WebSocket Event Console */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 text-stone-100 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Radio className={`w-5 h-5 ${wsConnected ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-lg font-bold text-white">
                        Live Fleet Telemetry & Event Stream
                      </h4>
                      {wsConnected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          WS CONNECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          CONNECTING...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400">
                      Channel: <span className="font-mono text-emerald-400 font-bold">dispatch</span> &bull; Telemetry Stream: <span className="font-mono text-stone-300">127.0.0.1:8000/api/v1/ws/stream</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSimulateTelemetry}
                    leftIcon={<Compass className="w-4 h-4 text-emerald-400" />}
                    className="border-stone-700 hover:bg-stone-800 text-stone-200 text-xs"
                  >
                    Simulate Courier GPS
                  </Button>
                </div>
              </div>

              {/* Active Couriers Telemetry List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-stone-400">
                    Active GPS Feeds ({couriers.length})
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Auto-refreshed via WebSocket frames
                  </span>
                </div>

                {couriers.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-stone-950/60 border border-stone-800/80 text-center space-y-2">
                    <Activity className="w-8 h-8 text-stone-600 mx-auto" />
                    <p className="text-xs text-stone-400 font-medium">
                      GPS stream listening on channel <strong className="text-stone-300">dispatch</strong>.
                    </p>
                    <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                      Couriers transmit live coordinates every 10 seconds during food rescue missions. Click "Simulate Courier GPS" to emit a mock packet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {couriers.map((c) => (
                      <div
                        key={c.courier_id}
                        className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 hover:border-emerald-500/40 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="font-bold text-xs text-white">
                              {c.courier_name || `Courier #${c.courier_id.slice(0, 8)}`}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-emerald-300">
                            {c.speed_kmh ?? 0} km/h
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-stone-300 pt-1">
                          <div className="bg-stone-900/90 px-2.5 py-1.5 rounded-lg border border-stone-800">
                            <span className="text-stone-500 block text-[9px] uppercase">Latitude</span>
                            {c.latitude.toFixed(4)}° N
                          </div>
                          <div className="bg-stone-900/90 px-2.5 py-1.5 rounded-lg border border-stone-800">
                            <span className="text-stone-500 block text-[9px] uppercase">Longitude</span>
                            {c.longitude.toFixed(4)}° E
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800/80">
                          <span>Heading: {c.heading_deg ?? 0}°</span>
                          <span>Ping: {new Date(c.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System-Wide Realtime Broadcast Bar */}
              <div className="pt-2 border-t border-stone-800 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Broadcast urgent notification to all connected couriers, NGOs & donors..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleBroadcastAlert();
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={sendingAlert || !alertMessage.trim()}
                  onClick={handleBroadcastAlert}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  className="shrink-0 text-xs"
                >
                  {sendingAlert ? 'Transmitting...' : 'Send Network Broadcast'}
                </Button>
              </div>
            </div>

            {/* Dispatch Results Summary */}
            {dispatchResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
                <StatCard
                  title="Routes Dispatched"
                  value={dispatchResult.assigned_routes_count}
                  icon={Truck}
                  subtext="Couriers deployed"
                  badge={{ label: 'Optimized', variant: 'forest' }}
                />
                <StatCard
                  title="Assigned Orders"
                  value={dispatchResult.assigned_orders_count}
                  icon={CheckCircle2}
                  subtext="Food rescues scheduled"
                  badge={{ label: 'Scheduled', variant: 'emerald' }}
                />
                <StatCard
                  title="Total Fleet Distance"
                  value={`${dispatchResult.total_distance_km} km`}
                  icon={MapPin}
                  subtext="1.35x urban road circuity"
                  trend={{ direction: 'neutral', label: 'VRP Minimum' }}
                />
                <StatCard
                  title="Longest Mission"
                  value={`${dispatchResult.total_duration_minutes} min`}
                  icon={Navigation}
                  subtext="Includes service windows"
                  badge={{ label: '≤ 120m Safe Limit', variant: 'emerald' }}
                />
              </div>
            )}

            {/* Generated Route Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-lg font-bold text-forest-950">
                    Optimized Multi-Stop Courier Routes
                  </h4>
                  <p className="text-xs text-stone-600">
                    Turn-by-turn waypoints generated by Google OR-Tools. Precedence and capacity constraints strictly enforced.
                  </p>
                </div>
              </div>

              {!dispatchResult && (
                <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-soft">
                  <Truck className="w-12 h-12 text-forest-700 mx-auto mb-3" />
                  <h4 className="font-serif text-lg font-bold text-forest-950">
                    Fleet Dispatch Ready
                  </h4>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-6">
                    Click "Run Fleet Auto-Dispatch" above to query pending surplus pickups and generate mathematically optimized route sequences.
                  </p>
                  <Button variant="primary" onClick={handleRunAutoDispatch} disabled={runningDispatch}>
                    Execute OR-Tools Optimization
                  </Button>
                </div>
              )}

              {dispatchResult && dispatchResult.routes.map((route, rIdx) => (
                <div
                  key={route.vehicle_id || rIdx}
                  className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-soft space-y-4"
                >
                  {/* Route Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-forest-800 text-white flex items-center justify-center font-bold">
                        #{rIdx + 1}
                      </div>
                      <div>
                        <h5 className="font-serif text-lg font-bold text-forest-950">
                          {route.courier_name}
                        </h5>
                        <p className="text-xs text-stone-500">
                          Vehicle ID: {route.vehicle_id.slice(0, 8)}... &bull; OR-Tools Feasibility: Verified
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-3 py-1.5 rounded-xl bg-forest-50 text-forest-900 font-bold border border-forest-100">
                        📍 {route.total_distance_km} km
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-forest-50 text-forest-900 font-bold border border-forest-100">
                        ⏱️ ~{route.total_duration_minutes} min
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold">
                        {route.stops.length} Waypoints
                      </span>
                    </div>
                  </div>

                  {/* Waypoints Table */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Sequenced Waypoint Timeline
                    </span>

                    <div className="space-y-3">
                      {route.stops.map((stop) => {
                        const isPickup = stop.stop_type === 'pickup';
                        const isHot = stop.storage_condition.toLowerCase().includes('hot');

                        return (
                          <div
                            key={stop.stop_sequence}
                            className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isPickup ? 'bg-forest-800 text-white' : 'bg-amberGold-600 text-white'
                                }`}
                              >
                                {stop.stop_sequence}
                              </span>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      isPickup ? 'bg-forest-100 text-forest-900' : 'bg-amberGold-100 text-amberGold-900'
                                    }`}
                                  >
                                    {isPickup ? 'Pickup (Donor)' : 'Delivery (NGO)'}
                                  </span>
                                  <span className="font-bold text-stone-900 text-sm">
                                    {stop.organization_name}
                                  </span>
                                </div>
                                <p className="text-stone-500 mt-0.5">{stop.address}</p>
                                <p className="text-stone-600 font-medium mt-1">
                                  SOP: {stop.food_safety_instructions}
                                </p>
                              </div>
                            </div>

                            {/* Metrics per stop */}
                            <div className="flex items-center gap-4 shrink-0 text-right">
                              <div>
                                <span className="text-[10px] text-stone-400 block">Arrival / Depart</span>
                                <strong className="text-xs text-stone-800 font-mono">
                                  T+{stop.arrival_time_minutes}m &rarr; T+{stop.departure_time_minutes}m
                                </strong>
                              </div>

                              <div className="border-l border-stone-200 pl-4">
                                <span className="text-[10px] text-stone-400 block">Vehicle Load</span>
                                <strong className="text-xs text-forest-900">
                                  {stop.cumulative_load_kg} kg onboard
                                </strong>
                              </div>

                              <div className="border-l border-stone-200 pl-4">
                                <span className="text-[10px] text-stone-400 block">Food Type</span>
                                <span className={`font-bold inline-flex items-center gap-1 ${isHot ? 'text-red-700' : 'text-stone-700'}`}>
                                  {isHot ? <Flame className="w-3 h-3 text-red-600" /> : <Thermometer className="w-3 h-3 text-stone-500" />}
                                  {stop.quantity_kg}kg ({stop.portions}p)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-stone-100/80 border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <span>
                <strong>Audit Invariant:</strong> All donation creations, state transitions, match locks, and handovers generate immutable audit records.
              </span>
              <span className="font-mono text-stone-500 text-[11px]">Audit Engine: Active</span>
            </div>

            <DataTable
              columns={auditColumns}
              data={auditLogs}
              keyExtractor={(log) => log.id}
              searchPlaceholder="Search audit events, actors, or entity IDs..."
              searchFilter={(log, q) =>
                log.action.toLowerCase().includes(q) ||
                log.performedByName.toLowerCase().includes(q) ||
                log.entityId.toLowerCase().includes(q)
              }
            />
          </div>
        )}
      </div>

      {/* Review Quarantine Donation Modal */}
      <Modal
        isOpen={!!reviewingDonation}
        onClose={() => setReviewingDonation(null)}
        title="Food Safety Review & Action"
        subtitle={`Audit review for ${reviewingDonation?.title}`}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setReviewingDonation(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'release' ? 'primary' : 'outline'}
              disabled={submittingReview}
              onClick={handleReviewFlaggedConfirm}
              className={reviewAction === 'quarantine_reject' ? 'bg-red-700 text-white hover:bg-red-800' : ''}
            >
              {submittingReview ? 'Recording Decision...' : reviewAction === 'release' ? 'Clear & Release to Available' : 'Confirm Quarantine Rejection'}
            </Button>
          </div>
        }
      >
        {reviewingDonation && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
              <span className="font-bold text-amber-900 block">Identified Hazard / Flag</span>
              <p className="text-amber-800">
                {reviewingDonation.safety_notes || 'Temperature measurement or packaging warning logged.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-stone-700">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block uppercase">Donor Facility</span>
                <strong>{reviewingDonation.donor_name}</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block uppercase">Quantity</span>
                <strong>{reviewingDonation.quantity_kg} kg ({reviewingDonation.portions} meals)</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-stone-800 block">Administrative Action</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('release')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                    reviewAction === 'release'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                      : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  <div>
                    <strong className="block">Release Batch</strong>
                    <span className="text-[11px] text-stone-500">Restore to available status</span>
                  </div>
                  {reviewAction === 'release' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('quarantine_reject')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between ${
                    reviewAction === 'quarantine_reject'
                      ? 'border-red-600 bg-red-50 text-red-950'
                      : 'border-stone-200 bg-white text-stone-700'
                  }`}
                >
                  <div>
                    <strong className="block">Reject Batch</strong>
                    <span className="text-[11px] text-stone-500">Cancel & log breach</span>
                  </div>
                  {reviewAction === 'quarantine_reject' && <XCircle className="w-4 h-4 text-red-600" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800 block">Regulatory Compliance Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document secondary testing results or justification for administrative action..."
                className="w-full h-20 p-2.5 rounded-xl border border-stone-200 text-stone-800 focus:outline-none focus:border-forest-600"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend Organization Modal */}
      <Modal
        isOpen={!!suspendingOrg}
        onClose={() => setSuspendingOrg(null)}
        title="Suspend Organization Account"
        subtitle={`Revoke platform permissions for ${suspendingOrg?.name}`}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setSuspendingOrg(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={submittingSuspend}
              onClick={handleSuspendOrgConfirm}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              {submittingSuspend ? 'Suspending...' : 'Confirm Account Suspension'}
            </Button>
          </div>
        }
      >
        {suspendingOrg && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1 text-red-900">
              <span className="font-bold block">Compliance Impact</span>
              <p>
                Suspending <strong>{suspendingOrg.name}</strong> will revoke donation posting and food acceptance credentials for all associated staff members immediately.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800 block">Administrative Reason / Notes</label>
              <textarea
                value={suspendNotes}
                onChange={(e) => setSuspendNotes(e.target.value)}
                placeholder="Enter regulatory violation details or suspension justification..."
                className="w-full h-20 p-2.5 rounded-xl border border-stone-200 text-stone-800 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Inspect Audit Log Diff Modal */}
      <Modal
        isOpen={!!inspectingLog}
        onClose={() => setInspectingLog(null)}
        title="Immutable Audit Payload Inspection"
        subtitle={`Event: ${inspectingLog?.action} (${inspectingLog?.id})`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end">
            <Button variant="primary" onClick={() => setInspectingLog(null)}>
              Close Inspection
            </Button>
          </div>
        }
      >
        {inspectingLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 text-stone-700">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block uppercase">Actor</span>
                <strong>{inspectingLog.performedByName} ({inspectingLog.performedByRole})</strong>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block uppercase">Target Entity</span>
                <strong>{inspectingLog.entityType}: {inspectingLog.entityId}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-stone-800 block">Captured State Payload:</span>
              <pre className="p-3 rounded-xl bg-stone-900 text-emerald-400 font-mono text-[11px] overflow-auto max-h-60 border border-stone-800">
                {JSON.stringify(inspectingLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
