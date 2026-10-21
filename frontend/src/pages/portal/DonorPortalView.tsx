import React, { useState, useEffect } from 'react';
import { 
  Package, 
  PlusCircle, 
  QrCode, 
  Heart, 
  TrendingUp, 
  FileCheck2
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
import { Donation, FoodType, StorageCondition, Allergen, CreateDonationDTO } from '../../types';

export const DonorPortalView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeQrDonation, setActiveQrDonation] = useState<Donation | null>(null);

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
          {d.status === 'available' || d.status === 'assigned' ? (
            <>
              <button
                onClick={() => setActiveQrDonation(d)}
                className="px-2.5 py-1 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest-800 text-xs font-semibold border border-forest-200 flex items-center gap-1"
                title="View Handover QR"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
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
              {d.status === 'delivered' ? 'Receipt Generated' : 'In Transit'}
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

    </div>
  );
};
