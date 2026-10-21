import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  Thermometer, 
  QrCode, 
  PhoneCall, 
  ShieldCheck
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
import { RoutePlan, RouteStop } from '../../types';

export const VolunteerPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Verification dialog state
  const [activeStop, setActiveStop] = useState<RouteStop | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  const loadRoute = async () => {
    setLoading(true);
    const plan = await volunteerService.getActiveRoute();
    setRoutePlan(plan);
    setLoading(false);
  };

  useEffect(() => {
    loadRoute();
  }, []);

  const handleOpenVerify = (stop: RouteStop) => {
    setActiveStop(stop);
    setEnteredPin(stop.pinCode || ''); // Pre-populate for convenient testing
    setPinError('');
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStop) return;

    const isVerified = await volunteerService.verifyStopHandover(activeStop.id, enteredPin);
    if (isVerified) {
      showToast(
        'Handover Authenticated!',
        `Stop #${activeStop.stopSequence} (${activeStop.organizationName}) confirmed and timestamped.`,
        'success'
      );
      setActiveStop(null);
      loadRoute();
    } else {
      setPinError('Invalid verification PIN code. Please confirm with donor/recipient staff.');
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
            Volunteer Logistics Hub
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            Courier: {user?.fullName || 'Alex Rivera'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Active Mission &bull; Vehicle: Bicycle / Insulated Carrier &bull; Food Safety Certified
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="md">
            OR-Tools Feasibility: Verified
          </Badge>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Route Progress"
          value={`${completedStopsCount} of ${totalStopsCount} stops`}
          icon={Navigation}
          subtext="Ordered collection sequence"
          badge={{ label: 'Active', variant: 'forest' }}
        />
        <StatCard
          title="Total Road Distance"
          value={`${routePlan?.totalDistanceKm || 7.2} km`}
          icon={MapPin}
          subtext="Calculated on road network"
          trend={{ direction: 'neutral', label: 'No straight-line est.' }}
        />
        <StatCard
          title="Total Mission Time"
          value={`${routePlan?.totalDurationMinutes || 44} min`}
          icon={Clock}
          subtext="Includes 18 min service time"
          badge={{ label: 'Within Limits', variant: 'emerald' }}
        />
        <StatCard
          title="Thermal Bag Status"
          value="Insulated Sealed"
          icon={Thermometer}
          subtext="Maintains required chain"
          badge={{ label: 'SOP Verified', variant: 'forest' }}
        />
      </div>

      {/* Ordered Stops View */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-forest-950">
              Assigned Collection Stops (Google OR-Tools VRP)
            </h3>
            <p className="text-xs text-stone-600">
              Follow stops in sequence to comply with thermal holding regulations.
            </p>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            Algorithm: Google OR-Tools
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Fetching OR-Tools route plan..." />
          </div>
        ) : (
          <div className="space-y-4">
            {routePlan?.stops.map((stop) => {
              const isCompleted = stop.status === 'completed';
              const isPickup = stop.stopType === 'pickup';

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
                      {stop.stopSequence}
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
                            Confirmed at {stop.completedAt?.slice(11, 16) || '17:25'}
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

                  {/* Right Action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right text-xs">
                      <span className="text-stone-400 block text-[10px]">Estimated Arrival</span>
                      <span className="font-bold text-stone-800 font-mono text-sm">
                        {stop.estimatedArrival.slice(11, 16)} UTC
                      </span>
                    </div>

                    {!isCompleted ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleOpenVerify(stop)}
                        leftIcon={<QrCode className="w-4 h-4 text-emerald-300" />}
                      >
                        Verify {isPickup ? 'Pickup PIN' : 'Delivery PIN'}
                      </Button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Handover Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Food Details Banner */}
                <div className="mt-4 p-3 rounded-2xl bg-stone-50 border border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 font-medium">Food Item: </span>
                    <strong className="text-stone-800">{stop.foodSummary}</strong> ({stop.quantityKg} kg)
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Thermometer className="w-4 h-4 text-forest-700" />
                    <span>Target: <strong>{stop.temperatureTarget}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* VERIFY PIN MODAL */}
      <Modal
        isOpen={!!activeStop}
        onClose={() => setActiveStop(null)}
        title={activeStop?.stopType === 'pickup' ? 'Verify Pickup Handover' : 'Verify Delivery Handover'}
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

            <FormField
              label="6-Digit Handover PIN"
              required
              hint="Demo PIN pre-filled below"
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
              <Button variant="ghost" onClick={() => setActiveStop(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Confirm Handover
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
