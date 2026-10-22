import React, { useState, useEffect } from 'react';
import { 
  Package, 
  PlusCircle, 
  QrCode, 
  Heart, 
  TrendingUp, 
  FileCheck2,
  Sparkles,
  RefreshCw,
  Split,
  MapPin,
  Users,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { donationService } from '../../services/api/donationService';
import { matchingService } from '../../services/api/matchingService';
import { 
  Donation, 
  FoodType, 
  StorageCondition, 
  Allergen, 
  CreateDonationDTO,
  DonationRecipientsResponse,
  SplitDonationPlan
} from '../../types';

export const DonorPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeQrDonation, setActiveQrDonation] = useState<Donation | null>(null);

  // Phase 8: AI Match Inspection & Split Plan state
  const [activeMatchesDonation, setActiveMatchesDonation] = useState<Donation | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [donationRecipients, setDonationRecipients] = useState<DonationRecipientsResponse | null>(null);
  const [splitPlan, setSplitPlan] = useState<SplitDonationPlan | null>(null);
  const [rematching, setRematching] = useState(false);
  const [activeMatchesTab, setActiveMatchesTab] = useState<'recipients' | 'split'>('recipients');

  // New Donation Form state
  const [title, setTitle] = useState('');
  const [foodType, setFoodType] = useState<FoodType>('prepared_meals');
  const [quantityKg, setQuantityKg] = useState('25');
  const [estimatedMeals, setEstimatedMeals] = useState('50');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('hot_holding');
  const [tempCelsius, setTempCelsius] = useState('68');
  const [pickupHours, setPickupHours] = useState('2');
  const [allergens, setAllergens] = useState<Allergen[]>(['Dairy']);
  const [description, setDescription] = useState('');

  const loadDonations = async () => {
    setLoading(true);
    const data = await donationService.getAll();
    setDonations(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateDonationDTO = {
      title,
      description: description || 'Fresh commercial surplus prepared today.',
      foodType,
      quantityKg: parseFloat(quantityKg),
      estimatedMeals: parseInt(estimatedMeals),
      preparationTime: new Date().toISOString(),
      pickupDeadline: new Date(Date.now() + parseFloat(pickupHours) * 3600 * 1000).toISOString(),
      storageCondition,
      measuredTemperatureCelsius: parseFloat(tempCelsius),
      allergens,
      packagingType: 'Sanitized Stainless Gastro Containers',
    };

    const newDon = await donationService.create(
      dto,
      user?.organizationId || 'org-donor-01',
      user?.organizationName || 'The Grand Heritage Bistro'
    );

    setDonations((prev) => [newDon, ...prev]);
    setCreateModalOpen(false);
    showToast(
      'Surplus Listed Successfully!',
      `${dto.title} (${dto.estimatedMeals} meals) entered Stage 1 AI matching gate.`,
      'success'
    );

    // Reset form
    setTitle('');
    setDescription('');
  };

  const handleCancelDonation = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this donation?')) {
      await donationService.cancel(id, 'Kitchen service schedule changed');
      showToast('Donation Cancelled', 'The listing was retracted from matching queue.', 'warning');
      loadDonations();
    }
  };

  const handleInspectMatches = async (d: Donation) => {
    setActiveMatchesDonation(d);
    setActiveMatchesTab('recipients');
    setRecipientsLoading(true);
    const [recRes, splitRes] = await Promise.all([
      matchingService.getDonationRecipients(d.id),
      matchingService.getSplitPlan(d.id),
    ]);
    setDonationRecipients(recRes);
    setSplitPlan(splitRes);
    setRecipientsLoading(false);
  };

  const handleTriggerRematching = async () => {
    if (!activeMatchesDonation) return;
    setRematching(true);
    const success = await matchingService.triggerRematching(activeMatchesDonation.id);
    if (success) {
      showToast('AI Matching Re-calculated', 'Candidate matches and recipient notifications refreshed.', 'success');
      const [recRes, splitRes] = await Promise.all([
        matchingService.getDonationRecipients(activeMatchesDonation.id),
        matchingService.getSplitPlan(activeMatchesDonation.id),
      ]);
      setDonationRecipients(recRes);
      setSplitPlan(splitRes);
      loadDonations();
    } else {
      showToast('Matching Busy', 'Could not re-calculate matches right now.', 'warning');
    }
    setRematching(false);
  };

  // Stat metrics
  const activeDonationsCount = donations.filter((d) => ['available', 'matched', 'assigned', 'in_transit'].includes(d.status)).length;
  const deliveredMealsTotal = donations
    .filter((d) => d.status === 'delivered')
    .reduce((sum, d) => sum + d.estimatedMeals, 1420); // Seed offset

  const columns: Column<Donation>[] = [
    {
      key: 'title',
      header: 'Listing & Description',
      sortable: true,
      render: (d) => (
        <div>
          <p className="font-bold text-forest-950">{d.title}</p>
          <p className="text-[11px] text-stone-500 line-clamp-1">{d.description}</p>
        </div>
      ),
    },
    {
      key: 'quantityKg',
      header: 'Quantity & Meals',
      sortable: true,
      render: (d) => (
        <div>
          <span className="font-semibold text-stone-800">{d.quantityKg} kg</span>
          <span className="text-[11px] text-stone-500 block">~{d.estimatedMeals} meals</span>
        </div>
      ),
    },
    {
      key: 'storageCondition',
      header: 'Holding & Temp',
      render: (d) => (
        <div>
          <span className="capitalize font-medium text-stone-700 block">
            {d.storageCondition.replace('_', ' ')}
          </span>
          {d.measuredTemperatureCelsius && (
            <span className="text-[10px] text-emerald-700 font-mono">
              {d.measuredTemperatureCelsius}°C Logged
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (d) => {
        const variantMap: Record<string, 'emerald' | 'amber' | 'forest' | 'rose' | 'stone'> = {
          available: 'forest',
          matched: 'emerald',
          assigned: 'emerald',
          in_transit: 'amber',
          delivered: 'stone',
          cancelled: 'rose',
        };
        return (
          <Badge variant={variantMap[d.status] || 'stone'} size="sm">
            {d.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action / Proof',
      align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          {['available', 'matched', 'assigned'].includes(d.status) && (
            <button
              id={`btn-ai-matches-${d.id}`}
              data-testid="btn-ai-matches"
              onClick={() => handleInspectMatches(d)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1 shadow-xs transition"
              title="Inspect AI Recipient Matches & Split Plan"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Matches</span>
            </button>
          )}
          {['available', 'assigned'].includes(d.status) ? (
            <>
              <button
                onClick={() => setActiveQrDonation(d)}
                className="px-2.5 py-1 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest-800 text-xs font-semibold border border-forest-200 flex items-center gap-1"
                title="View Handover QR"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR</span>
              </button>
              <button
                onClick={() => handleCancelDonation(d.id)}
                className="px-2 py-1 rounded-lg text-stone-400 hover:text-rose-600 text-xs font-medium"
                title="Cancel donation"
              >
                Cancel
              </button>
            </>
          ) : (
            <span className="text-[11px] text-stone-400">
              {d.status === 'delivered' ? 'Receipt Generated' : d.status === 'matched' ? 'Waiting Claim' : 'In Transit'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      
      {/* Top Banner with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
            Commercial Kitchen Portal
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-0.5">
            {user?.organizationName || 'The Grand Heritage Bistro'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Logged in as <strong>{user?.fullName}</strong> &bull; Verified Food Donor ID: {user?.organizationId || 'org-donor-01'}
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<PlusCircle className="w-5 h-5 text-emerald-300" />}
        >
          Post Surplus Food
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Rescues"
          value={activeDonationsCount}
          icon={Package}
          subtext="Pending pickup or in transit"
          badge={{ label: 'Live Queue', variant: 'forest' }}
        />
        <StatCard
          title="Total Meals Provided"
          value={deliveredMealsTotal.toLocaleString()}
          icon={Heart}
          subtext="Delivered to local shelters"
          trend={{ direction: 'up', label: '+18% this month' }}
        />
        <StatCard
          title="CO₂e Avoided"
          value={`${(deliveredMealsTotal * 0.42 * 2.62 / 1000).toFixed(1)} t`}
          icon={TrendingUp}
          subtext="Methane landfill credit"
          trend={{ direction: 'up', label: 'EPA WARM Model' }}
        />
        <StatCard
          title="Est. Tax Deduction"
          value={`$${(deliveredMealsTotal * 4.2).toLocaleString()}`}
          icon={FileCheck2}
          subtext="IRS Section 170(e)(3)"
          badge={{ label: 'Verified EIN', variant: 'amber' }}
        />
      </div>

      {/* Active Listings Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-forest-950">
            Surplus Inventory & Dispatch Log
          </h3>
          <span className="text-xs text-stone-500">
            {donations.length} total entries recorded
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading surplus inventory..." />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={donations}
            keyExtractor={(d) => d.id}
            searchPlaceholder="Search surplus title, status, or packaging..."
            searchFilter={(d, q) =>
              d.title.toLowerCase().includes(q) || d.status.toLowerCase().includes(q)
            }
            emptyTitle="No surplus postings yet"
            emptyDescription="Click 'Post Surplus Food' above to list fresh surplus meals before your shift ends."
          />
        )}
      </div>

      {/* CREATE SURPLUS MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Post Surplus Food Listing"
        subtitle="Enforces food safety, temperature logs, and safe pickup deadline"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateDonation} className="space-y-4">
          <FormField label="Surplus Food Title" required hint="Item & quantity description">
            <Input
              required
              placeholder="e.g. 40 Portions Roasted Vegetable Medley"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Food Category" required>
              <Select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value as FoodType)}
              >
                <option value="prepared_meals">Prepared Meals (Hot/Chilled)</option>
                <option value="baked_goods">Bakery & Breads</option>
                <option value="produce">Fresh Produce / Vegetables</option>
                <option value="dairy_refrigerated">Dairy & Refrigerated Items</option>
                <option value="packaged_groceries">Packaged Groceries</option>
              </Select>
            </FormField>

            <FormField label="Storage & Holding Spec" required>
              <Select
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
              >
                <option value="hot_holding">Hot Holding (&gt; 65°C / 150°F)</option>
                <option value="refrigerated">Refrigerated (&lt; 4°C / 40°F)</option>
                <option value="ambient">Ambient / Room Temp (Breads/Produce)</option>
                <option value="frozen">Deep Frozen (&lt; -18°C)</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Quantity (kg)" required>
              <Input
                type="number"
                required
                min="1"
                step="0.5"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
              />
            </FormField>

            <FormField label="Estimated Portions" required>
              <Input
                type="number"
                required
                min="1"
                value={estimatedMeals}
                onChange={(e) => setEstimatedMeals(e.target.value)}
              />
            </FormField>

            <FormField label="Measured Temp (°C)" hint="Thermometer log">
              <Input
                type="number"
                step="0.1"
                value={tempCelsius}
                onChange={(e) => setTempCelsius(e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Safe Pickup Deadline" required hint="Hours from now">
              <Select
                value={pickupHours}
                onChange={(e) => setPickupHours(e.target.value)}
              >
                <option value="1">1 Hour (High Urgency)</option>
                <option value="2">2 Hours (Standard Luncheon)</option>
                <option value="3">3 Hours (Evening Prep)</option>
                <option value="6">6 Hours (Bakery / Produce)</option>
              </Select>
            </FormField>

            <FormField label="Allergen Notice" hint="Select prominent tags">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Sesame'] as Allergen[]).map((alg) => {
                  const has = allergens.includes(alg);
                  return (
                    <button
                      type="button"
                      key={alg}
                      onClick={() =>
                        setAllergens((prev) =>
                          has ? prev.filter((a) => a !== alg) : [...prev, alg]
                        )
                      }
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                        has
                          ? 'bg-amberGold-600 text-white border-amberGold-700'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {alg}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>

          <FormField label="Special Handling or Reheating Notes">
            <Textarea
              rows={2}
              placeholder="e.g. In stainless 1/2 inserts. Seal intact. Handover through kitchen back door."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>

          <div className="pt-3 flex justify-end gap-3 border-t border-stone-100">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit to AI Matching Queue
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR HANDOVER PROOF MODAL */}
      <Modal
        isOpen={!!activeQrDonation}
        onClose={() => setActiveQrDonation(null)}
        title="Handover Verification Proof"
        subtitle="Present this QR or PIN code to the verified courier on collection"
        maxWidth="sm"
      >
        {activeQrDonation && (
          <div className="text-center space-y-4 py-2">
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-forest-800/40 inline-block mx-auto shadow-soft">
              {/* SVG QR Code Simulation */}
              <div className="w-48 h-48 bg-stone-900 rounded-xl p-3 flex flex-col justify-between text-white font-mono text-[9px] relative overflow-hidden">
                <div className="flex justify-between">
                  <div className="w-12 h-12 bg-white rounded-md p-1.5">
                    <div className="w-full h-full bg-stone-900 rounded-sm"></div>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-md p-1.5">
                    <div className="w-full h-full bg-stone-900 rounded-sm"></div>
                  </div>
                </div>
                <div className="text-center text-xs tracking-widest text-emerald-300 font-bold">
                  LASTPLATE VERIFY
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-12 h-12 bg-white rounded-md p-1.5">
                    <div className="w-full h-full bg-stone-900 rounded-sm"></div>
                  </div>
                  <span className="text-[10px] text-stone-400">{activeQrDonation.id}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-stone-500 font-medium">Backup 6-Digit Handover PIN:</p>
              <p className="font-mono text-2xl font-black text-forest-900 tracking-wider">
                {activeQrDonation.pinCode || '749216'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 text-xs text-stone-600 text-left">
              <p className="font-bold text-forest-900">Security Rule:</p>
              <p className="text-[11px] mt-0.5">
                This token expires in 2 hours and can only be scanned once. The pickup timestamp is immutably logged for Good Samaritan liability protection.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* AI MATCH DISCOVERY & SPLIT PLAN MODAL */}
      <Modal
        isOpen={!!activeMatchesDonation}
        onClose={() => setActiveMatchesDonation(null)}
        title="AI Match Discovery & Redistribution Plan"
        subtitle={
          activeMatchesDonation
            ? `Two-stage heuristic matching for "${activeMatchesDonation.title}" (${activeMatchesDonation.estimatedMeals} meals)`
            : ''
        }
        maxWidth="2xl"
      >
        {activeMatchesDonation && (
          <div className="space-y-5">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center gap-2">
                <Badge variant="forest" size="sm">
                  {activeMatchesDonation.quantityKg} kg
                </Badge>
                <Badge variant="emerald" size="sm">
                  ~{activeMatchesDonation.estimatedMeals} portions
                </Badge>
                <span className="text-xs text-stone-500 font-medium capitalize">
                  {activeMatchesDonation.storageCondition.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={handleTriggerRematching}
                disabled={rematching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200 shadow-2xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rematching ? 'animate-spin text-emerald-600' : 'text-stone-500'}`} />
                <span>{rematching ? 'Re-calculating...' : 'Re-run AI Matching'}</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200">
              <button
                id="tab-ranked-recipients"
                onClick={() => setActiveMatchesTab('recipients')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  activeMatchesTab === 'recipients'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Ranked Recipient Kitchens ({donationRecipients?.recipients.length || 0})</span>
              </button>
              <button
                id="tab-split-plan"
                onClick={() => setActiveMatchesTab('split')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  activeMatchesTab === 'split'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Split className="w-4 h-4" />
                <span>Split Redistribution Plan</span>
                {splitPlan?.is_split_recommended && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Multi-Hub
                  </span>
                )}
              </button>
            </div>

            {recipientsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <LoadingSpinner size="lg" />
                <p className="text-xs text-stone-500 font-medium">Running geospatial heuristics and capacity checks...</p>
              </div>
            ) : activeMatchesTab === 'recipients' ? (
              /* TAB 1: RANKED RECIPIENTS */
              <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                {donationRecipients?.recipients && donationRecipients.recipients.length > 0 ? (
                  donationRecipients.recipients.map((rec, idx) => (
                    <div
                      key={rec.recipient_id}
                      className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 transition shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-forest-900 text-white text-[10px] font-bold flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <h4 className="font-bold text-forest-950 text-sm">{rec.recipient_name}</h4>
                            <Badge variant="stone" size="sm">
                              {rec.org_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" />
                              {rec.distance_km} km (~{rec.estimated_travel_time_minutes}m)
                            </span>
                            <span>•</span>
                            <span>Cap: {rec.max_daily_meals} meals/day</span>
                            {rec.refrigeration_available && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium">Cold Storage Ready</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Composite Score Pill */}
                        <div className="text-right flex-shrink-0">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>{rec.score}% Match</span>
                          </div>
                          <span className="block text-[10px] text-stone-400 mt-0.5 capitalize">
                            Status: {rec.status}
                          </span>
                        </div>
                      </div>

                      {/* Section 4 Explainable Scoring Breakdown */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 bg-stone-50 rounded-xl text-center text-[10px]">
                        <div>
                          <span className="text-stone-400 block">Distance (35%)</span>
                          <span className="font-bold text-stone-800">{rec.score_breakdown.distanceScore}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block">Urgency (30%)</span>
                          <span className="font-bold text-stone-800">{rec.score_breakdown.urgencyScore}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block">Capacity (20%)</span>
                          <span className="font-bold text-stone-800">{rec.score_breakdown.capacityScore}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block">Reliability (15%)</span>
                          <span className="font-bold text-stone-800">{rec.score_breakdown.reliabilityScore}</span>
                        </div>
                      </div>

                      {/* Human-Readable Explanation */}
                      <p className="text-[11px] text-stone-600 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                        <span className="font-semibold text-emerald-900">AI Recommendation Reason: </span>
                        {rec.explanation}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-stone-500 text-xs">
                    No eligible verified recipients within operational range for this post.
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: SPLIT DONATION PLAN */
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                <div className="p-3.5 rounded-2xl bg-forest-50 border border-forest-100 text-xs text-forest-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck className="w-4 h-4 text-forest-700" />
                    <span>Redistribution Allocation Strategy</span>
                  </div>
                  <p className="text-stone-600 text-[11px]">{splitPlan?.notes}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Batch Total</span>
                    <span className="text-lg font-black text-forest-950">{splitPlan?.total_portions} Meals</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 block uppercase font-bold">Allocated</span>
                    <span className="text-lg font-black text-emerald-900">{splitPlan?.allocated_portions} Meals</span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] text-stone-500 block uppercase font-bold">Unallocated</span>
                    <span className="text-lg font-black text-stone-700">{splitPlan?.unallocated_portions} Meals</span>
                  </div>
                </div>

                {/* Allocation List */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Recipient Kitchen Allocations
                  </h5>
                  {splitPlan?.allocations && splitPlan.allocations.length > 0 ? (
                    splitPlan.allocations.map((alloc) => (
                      <div
                        key={alloc.recipient_id}
                        className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-forest-950">{alloc.recipient_name}</span>
                          <span className="font-mono font-bold text-emerald-800">
                            {alloc.allocated_portions} portions ({alloc.allocated_quantity_kg} kg)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${alloc.percentage_of_total}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-400">
                          <span>Proximity: {alloc.distance_km} km</span>
                          <span>{alloc.percentage_of_total}% of Batch</span>
                          <span>Score: {alloc.score}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-500 text-center py-4">No allocations available.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};
