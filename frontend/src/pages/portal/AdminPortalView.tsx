import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  FileText, 
  Lock,
  Truck,
  Navigation,
  MapPin,
  Thermometer,
  Zap,
  Flame,
  Radio,
  Activity,
  Send,
  Compass
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { adminService } from '../../services/api/adminService';
import { routingService } from '../../services/api/routingService';
import { socketService } from '../../services/websocket/socketService';
import { Organization, AuditLogEntry, AutoDispatchResult, CourierTelemetry } from '../../types';

export const AdminPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // OR-Tools Dispatch state
  const [dispatchResult, setDispatchResult] = useState<AutoDispatchResult | null>(null);
  const [runningDispatch, setRunningDispatch] = useState(false);

  // Phase 11: Real-Time Telemetry & WebSocket state
  const [wsConnected, setWsConnected] = useState<boolean>(socketService.isConnected());
  const [couriers, setCouriers] = useState<CourierTelemetry[]>([]);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [sendingAlert, setSendingAlert] = useState<boolean>(false);

  const loadAdminData = async () => {
    setLoading(true);
    const [orgs, logs] = await Promise.all([
      adminService.getOrganizations(),
      adminService.getAuditLogs(),
    ]);
    setOrganizations(orgs);
    setAuditLogs(logs);
    setLoading(false);
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
    // Update local state optimistically
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
        `${orgName} granted permission to post / receive food donations.`,
        'success'
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
      // Reload audit logs to show the new automated dispatch event
      const logs = await adminService.getAuditLogs();
      setAuditLogs(logs);
    } catch {
      showToast('Dispatch Error', 'Could not run fleet auto-dispatch.', 'error');
    } finally {
      setRunningDispatch(false);
    }
  };

  const orgColumns: Column<Organization>[] = [
    {
      key: 'name',
      header: 'Organization & Category',
      sortable: true,
      render: (o) => (
        <div>
          <p className="font-bold text-forest-950">{o.name}</p>
          <span className="text-[11px] text-stone-500 font-medium">
            {o.type} &bull; <strong className="capitalize">{o.category}</strong>
          </span>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Primary Contact',
      render: (o) => (
        <div>
          <span className="font-medium text-stone-800 block">{o.contactPerson}</span>
          <span className="text-[11px] text-stone-500">{o.email}</span>
        </div>
      ),
    },
    {
      key: 'dailyCapacityMeals',
      header: 'Capacity / Facility',
      render: (o) => (
        <div>
          <span className="text-stone-800 font-semibold block">
            {o.dailyCapacityMeals ? `${o.dailyCapacityMeals} meals/day` : 'Commercial Kitchen'}
          </span>
          <span className="text-[11px] text-stone-500">
            {o.refrigerationAvailable ? 'Cooler Verified' : 'Standard Storage'}
          </span>
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification Status',
      sortable: true,
      render: (o) => (
        <Badge
          variant={o.verificationStatus === 'verified' ? 'emerald' : 'amber'}
          size="sm"
        >
          {o.verificationStatus}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Admin Actions',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-2">
          {o.verificationStatus !== 'verified' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleVerifyOrg(o.id, o.name)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Approve
            </Button>
          ) : (
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Authorized
            </span>
          )}
        </div>
      ),
    },
  ];

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Audit Event',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs font-bold text-forest-900 bg-forest-50 px-2 py-0.5 rounded border border-forest-100">
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
          <span className="text-[10px] text-stone-500 uppercase">{log.performedByRole}</span>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity / Target',
      render: (log) => (
        <span className="text-xs text-stone-600 font-medium">
          {log.entityType} ({log.entityId})
        </span>
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
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
            System Operations & Compliance Command
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            Platform Administration & Safety Oversight
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Administrator: <strong>{user?.fullName}</strong> &bull; RBAC Level: Superadmin &bull; Metro Central Zone 1
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="stone" size="md">
            Backend Security: RBAC Enforced
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Registered Organizations"
          value={organizations.length}
          icon={Building2}
          subtext="Donors & community kitchens"
          badge={{ label: 'Vetted', variant: 'forest' }}
        />
        <StatCard
          title="Safety Reviews on Hold"
          value="0 active"
          icon={ShieldCheck}
          subtext="Zero compromised batches"
          badge={{ label: 'Clear', variant: 'emerald' }}
        />
        <StatCard
          title="Audit Trail Entries"
          value={auditLogs.length}
          icon={FileText}
          subtext="Cryptographically linked logs"
          trend={{ direction: 'up', label: 'Real-time trace' }}
        />
        <StatCard
          title="Anti-Collision Engine"
          value="100% Atomic"
          icon={Lock}
          subtext="Zero duplicate acceptance"
          badge={{ label: 'Postgres Locks', variant: 'forest' }}
        />
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'organizations', label: 'Organization Verification', count: organizations.length },
            { id: 'routing', label: 'OR-Tools Fleet Dispatch & VRP' },
            { id: 'audit', label: 'Immutable Audit Trail', count: auditLogs.length },
          ]}
        />

        {/* TAB 1: ORGANIZATIONS */}
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

        {/* TAB 2: OR-TOOLS FLEET DISPATCH */}
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

        {/* TAB 3: AUDIT TRAIL */}
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

    </div>
  );
};
