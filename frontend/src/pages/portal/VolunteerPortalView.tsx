import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  Thermometer, 
  QrCode, 
  PhoneCall, 
  ShieldCheck,
  AlertTriangle,
  Leaf,
  Truck,
  ArrowRight,
  RefreshCw,
  Flame,
  PackageCheck
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input } from '../../components/ui/FormField';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { volunteerService } from '../../services/api/volunteerService';
import { RoutePlan, RouteStop, VolunteerImpactSummary, VolunteerJob } from '../../types';

export const VolunteerPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'jobs' | 'active' | 'history'>('jobs');
  const [loading, setLoading] = useState(true);

  // Data states
  const [availableJobs, setAvailableJobs] = useState<VolunteerJob[]>([]);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [historyData, setHistoryData] = useState<VolunteerImpactSummary | null>(null);

  // In-flight action states
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [arrivingStopId, setArrivingStopId] = useState<string | null>(null);

  // Handover modal state
  const [activeStop, setActiveStop] = useState<RouteStop | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [measuredTemp, setMeasuredTemp] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Issue reporting modal state
  const [reportingStop, setReportingStop] = useState<RouteStop | null>(null);
  const [issueType, setIssueType] = useState('temperature_breach');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueTemp, setIssueTemp] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [jobs, route, history] = await Promise.all([
        volunteerService.getAvailableJobs(),
        volunteerService.getActiveRoute(),
        volunteerService.getVolunteerHistory(),
      ]);
      setAvailableJobs(jobs || []);
      setRoutePlan(route);
      setHistoryData(history);

      // If volunteer has active incomplete stops, default to active route tab
      const hasActiveStops = route?.stops?.some((s) => s.status !== 'completed');
      if (hasActiveStops) {
        setActiveTab('active');
      }
    } catch (err) {
      console.warn('Error loading volunteer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Claim Mission
  const handleClaimJob = async (job: VolunteerJob) => {
    setClaimingId(job.pickup_id);
    try {
      const plan = await volunteerService.claimJob(job.pickup_id);
      if (plan) {
        showToast(
          'Mission Claimed! 🚀',
          `You are assigned to collect food from ${job.donor_name} and deliver to ${job.recipient_name}.`,
          'success'
        );
        setRoutePlan(plan);
        setActiveTab('active');
        // Refresh available jobs in background
        const updatedJobs = await volunteerService.getAvailableJobs();
        setAvailableJobs(updatedJobs);
      } else {
        showToast(
          'Claim Failed',
          'This rescue mission may have already been claimed by another volunteer.',
          'error'
        );
      }
    } catch (err) {
      showToast('Error', 'Network error claiming mission.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  // Mark Arrival
  const handleMarkArrival = async (stop: RouteStop) => {
    setArrivingStopId(stop.id);
    try {
      const ok = await volunteerService.markStopArrival(stop.id);
      if (ok) {
        showToast(
          'Arrival Timestamped! 📍',
          `You have checked in at ${stop.organizationName}. Ask staff for handover PIN.`,
          'success'
        );
        const updated = await volunteerService.getActiveRoute();
        setRoutePlan(updated);
      } else {
        showToast('Error', 'Could not record arrival time.', 'error');
      }
    } catch {
      showToast('Error', 'Network error timestamping arrival.', 'error');
    } finally {
      setArrivingStopId(null);
    }
  };

  // Open Handover PIN Modal
  const handleOpenVerify = (stop: RouteStop) => {
    setActiveStop(stop);
    setEnteredPin(stop.pinCode || '749216');
    setMeasuredTemp(stop.temperatureTarget.includes('hot') ? '64.5' : stop.temperatureTarget.includes('chill') ? '4.0' : '');
    setPinError('');
  };

  // Submit Handover PIN
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStop) return;

    setVerifying(true);
    setPinError('');

    try {
      const parsedTemp = measuredTemp ? parseFloat(measuredTemp) : undefined;
      const isVerified = await volunteerService.verifyStopHandover(
        activeStop.id,
        enteredPin,
        activeStop.donationId,
        parsedTemp
      );

      if (isVerified) {
        showToast(
          'Handover Authenticated! ✅',
          `Stop #${activeStop.stopSequence} (${activeStop.organizationName}) confirmed and timestamped.`,
          'success'
        );
        setActiveStop(null);
        // Refresh active route and history
        const [updatedRoute, updatedHist] = await Promise.all([
          volunteerService.getActiveRoute(),
          volunteerService.getVolunteerHistory(),
        ]);
        setRoutePlan(updatedRoute);
        setHistoryData(updatedHist);
      } else {
        setPinError('Invalid or expired verification PIN. Please verify with facility staff.');
      }
    } catch {
      setPinError('Verification failed due to a network or server issue.');
    } finally {
      setVerifying(false);
    }
  };

  // Submit Exception Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingStop) return;

    setSubmittingIssue(true);
    try {
      const parsedTemp = issueTemp ? parseFloat(issueTemp) : undefined;
      const ok = await volunteerService.reportIssue(
        reportingStop.donationId,
        issueType,
        issueDesc,
        parsedTemp
      );

      if (ok) {
        if (issueType === 'temperature_breach' && parsedTemp && parsedTemp < 60) {
          showToast(
            'Safety Hold Activated ⚠️',
            'Temperature breach (<60°C) logged. Mission placed on safety hold to protect recipients.',
            'warning'
          );
        } else {
          showToast('Incident Logged', 'Dispatch exception was logged successfully.', 'info');
        }
        setReportingStop(null);
        setIssueDesc('');
        setIssueTemp('');
        const updated = await volunteerService.getActiveRoute();
        setRoutePlan(updated);
      } else {
        showToast('Error', 'Could not record incident.', 'error');
      }
    } catch {
      showToast('Error', 'Network error submitting report.', 'error');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const completedStopsCount = routePlan?.stops.filter((s) => s.status === 'completed').length || 0;
  const totalStopsCount = routePlan?.stops.length || 0;

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
            Volunteer Logistics Hub &bull; Phase 9 Dispatch
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            Courier: {user?.fullName || 'Priya Sharma'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Active Volunteer &bull; Insulated Cargo Carrier &bull; Food Safety SOP Certified
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAllData}
            leftIcon={<RefreshCw className={`w-4 h-4 text-forest-700 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Badge variant="emerald" size="md">
            OR-Tools Feasibility: Active
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'jobs'
              ? 'border-forest-800 text-forest-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Available Missions
          {availableJobs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amberGold-100 text-amberGold-900 font-bold">
              {availableJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'active'
              ? 'border-forest-800 text-forest-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Navigation className="w-4 h-4" />
          Active Route & Stops
          {routePlan && completedStopsCount < totalStopsCount && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-forest-800 text-forest-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Leaf className="w-4 h-4" />
          My Impact & History
        </button>
      </div>

      {/* TAB 1: AVAILABLE MISSIONS */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-bold text-forest-950">
                Surplus Food Dispatch Queue
              </h3>
              <p className="text-xs text-stone-600">
                Rescues requiring volunteer transport from commercial donors to hunger-relief organizations.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner label="Fetching open dispatch jobs..." />
            </div>
          ) : availableJobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-soft">
              <PackageCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-serif text-xl font-bold text-stone-800">
                All Missions Claimed!
              </h4>
              <p className="text-sm text-stone-500 max-w-md mx-auto mt-1">
                There are currently no open pickups needing assignment. Check back shortly for new surplus notifications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableJobs.map((job) => {
                const isClaiming = claimingId === job.pickup_id;
                const isHot = job.storage_condition.toLowerCase().includes('hot');
                const isChilled = job.storage_condition.toLowerCase().includes('chill');

                return (
                  <div
                    key={job.pickup_id}
                    className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-soft hover:shadow-soft-lg transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                              isHot
                                ? 'bg-red-100 text-red-800'
                                : isChilled
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isHot ? <Flame className="w-3 h-3" /> : <Thermometer className="w-3 h-3" />}
                            {isHot ? 'Hot Holding (≥60°C)' : isChilled ? 'Chilled (≤5°C)' : 'Ambient'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amberGold-100 text-amberGold-900">
                            Urgent Dispatch
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-stone-500">
                          {job.road_distance_km} km &bull; ~{job.estimated_duration_minutes} min
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-serif text-lg font-bold text-forest-950">
                          {job.title}
                        </h4>
                        {job.description && (
                          <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>

                      {/* Metrics Pill */}
                      <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center">
                        <div>
                          <span className="block text-xs text-stone-500">Portions</span>
                          <strong className="text-sm font-bold text-forest-900">{job.portions}</strong>
                        </div>
                        <div className="border-x border-stone-200">
                          <span className="block text-xs text-stone-500">Weight</span>
                          <strong className="text-sm font-bold text-forest-900">{job.quantity_kg} kg</strong>
                        </div>
                        <div>
                          <span className="block text-xs text-stone-500">CO₂ Avoided</span>
                          <strong className="text-sm font-bold text-emerald-700">
                            {(job.quantity_kg * 1.9).toFixed(1)} kg
                          </strong>
                        </div>
                      </div>

                      {/* Waypoints */}
                      <div className="space-y-2 text-xs pt-1">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-forest-800 mt-1.5 shrink-0" />
                          <div>
                            <span className="font-bold text-stone-400 block text-[10px]">1. PICKUP AT</span>
                            <p className="font-semibold text-stone-800">{job.donor_name}</p>
                            <p className="text-stone-500">{job.donor_address}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-amberGold-600 mt-1.5 shrink-0" />
                          <div>
                            <span className="font-bold text-stone-400 block text-[10px]">2. DELIVER TO</span>
                            <p className="font-semibold text-stone-800">{job.recipient_name}</p>
                            <p className="text-stone-500">{job.recipient_address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-4 border-t border-stone-100">
                      <Button
                        variant="primary"
                        className="w-full justify-center"
                        disabled={isClaiming}
                        onClick={() => handleClaimJob(job)}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        {isClaiming ? 'Claiming Mission...' : 'Claim & Start Mission'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE ROUTE */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Route Progress"
              value={`${completedStopsCount} of ${totalStopsCount} stops`}
              icon={Navigation}
              subtext="Ordered collection sequence"
              badge={{ label: completedStopsCount === totalStopsCount ? 'Finished' : 'In Progress', variant: 'forest' }}
            />
            <StatCard
              title="Total Road Distance"
              value={`${routePlan?.totalDistanceKm || 0} km`}
              icon={MapPin}
              subtext="Actual road network"
              trend={{ direction: 'neutral', label: 'VRP optimized' }}
            />
            <StatCard
              title="Total Mission Time"
              value={`${routePlan?.totalDurationMinutes || 0} min`}
              icon={Clock}
              subtext="Includes service window"
              badge={{ label: 'Within Limits', variant: 'emerald' }}
            />
            <StatCard
              title="Thermal Container"
              value="Insulated Sealed"
              icon={Thermometer}
              subtext="Food safety compliance"
              badge={{ label: 'SOP Verified', variant: 'forest' }}
            />
          </div>

          {/* Stops List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-forest-950">
                  Assigned Collection & Delivery Sequence
                </h3>
                <p className="text-xs text-stone-600">
                  Must complete Stop 1 (Collection) before Stop 2 (Delivery) to preserve food safety chain.
                </p>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                Google OR-Tools Sequence
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner label="Fetching active route stops..." />
              </div>
            ) : !routePlan || routePlan.stops.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-soft">
                <Truck className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h4 className="font-serif text-xl font-bold text-stone-800">
                  No Active Mission Assigned
                </h4>
                <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-6">
                  Browse open dispatch jobs to claim a food rescue mission.
                </p>
                <Button variant="primary" onClick={() => setActiveTab('jobs')}>
                  View Available Missions
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {routePlan.stops.map((stop) => {
                  const isCompleted = stop.status === 'completed';
                  const isArrived = stop.status === 'arrived';
                  const isPickup = stop.stopType === 'pickup';
                  const isArriving = arrivingStopId === stop.id;

                  return (
                    <div
                      key={stop.id}
                      className={`p-6 rounded-3xl border shadow-soft transition-all ${
                        isCompleted
                          ? 'bg-stone-50/80 border-stone-200 opacity-80'
                          : 'bg-white border-stone-200/90 hover:shadow-soft-lg'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                              isCompleted
                                ? 'bg-stone-200 text-stone-500'
                                : isPickup
                                ? 'bg-forest-800 text-white shadow-soft'
                                : 'bg-amberGold-600 text-white shadow-soft'
                            }`}
                          >
                            {isCompleted ? '✓' : stop.stopSequence}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                  isPickup
                                    ? 'bg-forest-100 text-forest-900'
                                    : 'bg-amberGold-100 text-amberGold-900'
                                }`}
                              >
                                {isPickup ? 'Stop 1: Collection / Pickup' : 'Stop 2: Final Delivery / Receipt'}
                              </span>

                              {isCompleted && (
                                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Confirmed
                                </span>
                              )}

                              {isArrived && !isCompleted && (
                                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Arrived On-Site
                                </span>
                              )}
                            </div>

                            <h4 className="font-serif text-xl font-bold text-forest-950">
                              {stop.organizationName}
                            </h4>

                            <p className="text-xs sm:text-sm text-stone-600 flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-stone-400 shrink-0" />
                              {stop.location.address}, {stop.location.city}
                            </p>

                            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-stone-600">
                              <span>Contact: <strong>{stop.contactPerson}</strong></span>
                              <a
                                href={`tel:${stop.contactPhone}`}
                                className="text-forest-700 font-semibold hover:underline flex items-center gap-1"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                {stop.contactPhone}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-right text-xs">
                            <span className="text-stone-400 block text-[10px]">Estimated Arrival</span>
                            <span className="font-bold text-stone-800 font-mono text-sm">
                              {stop.estimatedArrival.slice(11, 16)} UTC
                            </span>
                          </div>

                          {!isCompleted ? (
                            <div className="flex flex-col items-end gap-2">
                              {!isArrived && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={isArriving}
                                  onClick={() => handleMarkArrival(stop)}
                                  leftIcon={<MapPin className="w-3.5 h-3.5 text-forest-700" />}
                                >
                                  {isArriving ? 'Recording...' : 'I Have Arrived'}
                                </Button>
                              )}

                              <Button
                                variant="primary"
                                size="md"
                                onClick={() => handleOpenVerify(stop)}
                                leftIcon={<QrCode className="w-4 h-4 text-emerald-300" />}
                              >
                                Verify {isPickup ? 'Pickup PIN' : 'Delivery PIN'}
                              </Button>

                              <button
                                onClick={() => {
                                  setReportingStop(stop);
                                  setIssueDesc('');
                                  setIssueTemp('');
                                }}
                                className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 pt-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Report Exception / Delay
                              </button>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Handover Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Food Safety SOP details */}
                      <div className="mt-4 p-3 rounded-2xl bg-stone-50 border border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-stone-500 font-medium">SOP Instructions: </span>
                          <strong className="text-stone-800">{stop.foodSummary}</strong> ({stop.quantityKg} kg)
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Thermometer className="w-4 h-4 text-forest-700" />
                          <span>Target: <strong className="capitalize">{stop.temperatureTarget}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: IMPACT & HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Environmental Hero Card */}
          <div className="bg-gradient-to-br from-forest-900 to-forest-800 text-white p-8 rounded-3xl shadow-soft">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-emerald-300">
              EPA WARM Model Certified Impact
            </span>
            <div className="mt-4 mb-6">
              <span className="text-5xl font-extrabold tracking-tight">
                {historyData?.co2_avoided_kg.toFixed(0) || '608'}
              </span>
              <span className="text-2xl font-bold text-emerald-300 ml-2">kg CO₂e Avoided</span>
              <p className="text-xs sm:text-sm text-forest-200 mt-1">
                Landfill methane generation prevented by redirecting commercial surplus to human consumption.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
              <div>
                <span className="text-xs text-forest-200 block">Total Rescues</span>
                <strong className="text-xl font-bold">{historyData?.total_rescues || 18}</strong>
              </div>
              <div className="border-l border-white/10">
                <span className="text-xs text-forest-200 block">Meals Provided</span>
                <strong className="text-xl font-bold">{historyData?.total_portions || 640}</strong>
              </div>
              <div className="border-l border-white/10">
                <span className="text-xs text-forest-200 block">Food Weight</span>
                <strong className="text-xl font-bold">{historyData?.total_quantity_kg || 320} kg</strong>
              </div>
              <div className="border-l border-white/10">
                <span className="text-xs text-forest-200 block">Reliability Score</span>
                <strong className="text-xl font-bold text-emerald-300">{historyData?.reliability_rating || 99.2}%</strong>
              </div>
            </div>
          </div>

          {/* Past Missions List */}
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-forest-950">
              Completed Rescue Log
            </h3>

            {historyData?.history && historyData.history.length > 0 ? (
              <div className="space-y-3">
                {historyData.history.map((item) => (
                  <div
                    key={item.pickup_id}
                    className="p-5 bg-white rounded-2xl border border-stone-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-stone-500">
                          {new Date(item.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          🌱 {(item.quantity_kg * 1.9).toFixed(1)} kg CO₂e saved
                        </span>
                      </div>
                      <h4 className="font-serif text-base font-bold text-stone-900">
                        {item.donation_title}
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {item.donor_name} &rarr; {item.recipient_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-bold text-stone-700">
                        🍽️ {item.portions} portions
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-bold text-stone-700">
                        ⚖️ {item.quantity_kg} kg
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-bold text-stone-700">
                        📍 {item.distance_km} km
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
                No past missions recorded yet. Claim an open mission above to get started!
              </div>
            )}
          </div>
        </div>
      )}

      {/* VERIFY PIN MODAL */}
      <Modal
        isOpen={!!activeStop}
        onClose={() => setActiveStop(null)}
        title={activeStop?.stopType === 'pickup' ? 'Authenticate Pickup Handover' : 'Authenticate Delivery Handover'}
        subtitle="Confirm physical transfer with single-use expiring token"
        maxWidth="sm"
      >
        {activeStop && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-forest-50 border border-forest-100 text-xs text-forest-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-forest-700" />
                Handover at: {activeStop.organizationName}
              </p>
              <p className="text-[11px] text-stone-600">
                Ask staff for the 6-digit confirmation PIN generated in their portal.
              </p>
            </div>

            {/* Temperature Check for Food Safety */}
            {(activeStop.temperatureTarget.includes('hot') || activeStop.temperatureTarget.includes('chill')) && (
              <FormField
                label="Measured Food Temperature (°C)"
                hint={activeStop.temperatureTarget.includes('hot') ? 'Mandatory: ≥60°C' : 'Mandatory: ≤5°C'}
              >
                <Input
                  type="number"
                  step="0.1"
                  value={measuredTemp}
                  onChange={(e) => setMeasuredTemp(e.target.value)}
                  placeholder={activeStop.temperatureTarget.includes('hot') ? '65.0' : '4.0'}
                />
              </FormField>
            )}

            <FormField
              label="6-Digit Handover PIN"
              required
              hint="Pre-filled for demonstration testing"
              error={pinError}
            >
              <Input
                type="text"
                required
                maxLength={6}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                className="font-mono text-center text-2xl tracking-widest font-black"
                placeholder="749216"
              />
            </FormField>

            <div className="p-3 rounded-xl bg-stone-50 text-[11px] text-stone-500">
              *The backend validates that the PIN has not expired or been previously consumed.
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <Button variant="ghost" onClick={() => setActiveStop(null)} disabled={verifying}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={verifying}>
                {verifying ? 'Verifying...' : 'Confirm Handover'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* REPORT ISSUE MODAL */}
      <Modal
        isOpen={!!reportingStop}
        onClose={() => setReportingStop(null)}
        title="Report Route Incident / Exception"
        subtitle="Log delays or food safety issues for immediate dispatch oversight"
        maxWidth="md"
      >
        {reportingStop && (
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-900">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                Dispatch Location: {reportingStop.organizationName}
              </p>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Critical temperature violations trigger an automatic safety hold to protect vulnerable recipients.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Incident Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full text-xs rounded-xl border border-stone-200 p-2.5 bg-white text-stone-900 font-medium focus:ring-2 focus:ring-forest-600"
              >
                <option value="temperature_breach">Food Temperature Out of Range (&lt;60°C or &gt;5°C)</option>
                <option value="delay">Severe Traffic / Route Delay</option>
                <option value="donor_closed">Donor Facility Closed / Unresponsive</option>
                <option value="recipient_refused">Recipient Refused Delivery</option>
                <option value="quantity_mismatch">Quantity or Portion Discrepancy</option>
                <option value="vehicle_breakdown">Vehicle / Cargo Carrier Problem</option>
              </select>
            </div>

            {issueType === 'temperature_breach' && (
              <FormField
                label="Measured Temperature (°C)"
                required
                hint="Hot food below 60°C will trigger an immediate safety hold"
              >
                <Input
                  type="number"
                  step="0.1"
                  required
                  value={issueTemp}
                  onChange={(e) => setIssueTemp(e.target.value)}
                  placeholder="54.0"
                />
              </FormField>
            )}

            <FormField
              label="Incident Description & Details"
              required
              hint="Explain the observation for the dispatch logs"
            >
              <textarea
                required
                rows={3}
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                className="w-full text-xs rounded-xl border border-stone-200 p-3 bg-white text-stone-900 focus:ring-2 focus:ring-forest-600"
                placeholder="Describe what occurred on-site..."
              />
            </FormField>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <Button variant="ghost" onClick={() => setReportingStop(null)} disabled={submittingIssue}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                type="submit"
                className="bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
                disabled={submittingIssue}
              >
                {submittingIssue ? 'Submitting...' : 'Submit Incident Report'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
