import { 
  Donation, 
  Organization, 
  MatchRecommendation, 
  RoutePlan, 
  AuditLogEntry, 
  SystemNotification,
  CreateDonationDTO
} from '../../types';

// Seeded Organizations
const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-donor-01',
    name: 'The Grand Heritage Bistro',
    type: 'Restaurant',
    category: 'donor',
    contactPerson: 'Chef Maya Lin',
    email: 'chef.maya@grandbistro.com',
    phone: '+1 (555) 392-8172',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '450 West Elm Street',
      city: 'Metro Central',
      postalCode: '10001',
    },
    verificationStatus: 'verified',
    licenseNumber: 'FD-NYC-2024-8819',
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      openTime: '11:00',
      closeTime: '23:00',
    },
    reliabilityScore: 98,
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'org-donor-02',
    name: 'Artisan Hearth Bakery',
    type: 'Bakery',
    category: 'donor',
    contactPerson: 'David Miller',
    email: 'david@artisanhearth.com',
    phone: '+1 (555) 481-9920',
    location: {
      latitude: 40.7180,
      longitude: -74.0010,
      address: '88 Baker Avenue',
      city: 'Metro Central',
      postalCode: '10002',
    },
    verificationStatus: 'verified',
    licenseNumber: 'FD-BK-2024-3104',
    operatingHours: {
      days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      openTime: '06:00',
      closeTime: '18:00',
    },
    reliabilityScore: 94,
    createdAt: '2026-01-14T09:00:00Z',
  },
  {
    id: 'org-ngo-01',
    name: 'Hope Community Shelter & Kitchen',
    type: 'CommunityKitchen',
    category: 'recipient',
    contactPerson: 'Rev. Marcus Vance',
    email: 'intake@hopecommunityshelter.org',
    phone: '+1 (555) 728-4901',
    location: {
      latitude: 40.7250,
      longitude: -73.9980,
      address: '124 Hope Lane',
      city: 'Metro Central',
      postalCode: '10003',
    },
    verificationStatus: 'verified',
    dailyCapacityMeals: 250,
    acceptedFoodTypes: ['prepared_meals', 'baked_goods', 'produce'],
    refrigerationAvailable: true,
    hotHoldingAvailable: true,
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      openTime: '07:00',
      closeTime: '21:00',
    },
    reliabilityScore: 96,
    createdAt: '2026-01-08T08:00:00Z',
  },
  {
    id: 'org-ngo-02',
    name: 'St. Jude Youth Kitchen',
    type: 'Shelter',
    category: 'recipient',
    contactPerson: 'Elena Rostova',
    email: 'elena@stjudeyouth.org',
    phone: '+1 (555) 639-1124',
    location: {
      latitude: 40.7310,
      longitude: -74.0090,
      address: '310 Pine Street',
      city: 'Metro Central',
      postalCode: '10004',
    },
    verificationStatus: 'verified',
    dailyCapacityMeals: 150,
    acceptedFoodTypes: ['prepared_meals', 'dairy_refrigerated'],
    refrigerationAvailable: true,
    hotHoldingAvailable: true,
    operatingHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      openTime: '08:00',
      closeTime: '20:00',
    },
    reliabilityScore: 92,
    createdAt: '2026-01-12T11:00:00Z',
  },
];

// Seeded Donations
const INITIAL_DONATIONS: Donation[] = [
  {
    id: 'don-101',
    donorOrgId: 'org-donor-01',
    donorOrgName: 'The Grand Heritage Bistro',
    donorType: 'Restaurant',
    title: '50 Servings Vegetable Biryani & Dal Makhani',
    description: 'Hot luncheon buffet surplus, kept above 65°C hot holding until packaging.',
    foodType: 'prepared_meals',
    quantityKg: 35,
    estimatedMeals: 70,
    preparationTime: '2026-10-21T13:30:00Z',
    pickupDeadline: '2026-10-21T18:45:00Z',
    storageCondition: 'hot_holding',
    measuredTemperatureCelsius: 68.5,
    allergens: ['Dairy'],
    packagingType: 'Stainless Gastro Inserts',
    pickupLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '450 West Elm Street',
      city: 'Metro Central',
      postalCode: '10001',
    },
    status: 'assigned',
    recipientOrgId: 'org-ngo-02',
    recipientOrgName: 'St. Jude Youth Kitchen',
    assignedVolunteerId: 'usr-vol-01',
    assignedVolunteerName: 'Alex Rivera',
    verificationMethod: 'PIN',
    pinCode: '749216',
    createdAt: '2026-10-21T14:00:00Z',
    updatedAt: '2026-10-21T14:30:00Z',
  },
  {
    id: 'don-102',
    donorOrgId: 'org-donor-02',
    donorOrgName: 'Artisan Hearth Bakery',
    donorType: 'Bakery',
    title: '45 Loaves Sourdough & Assorted Focaccia',
    description: 'Freshly baked artisan loaves unsold at daily afternoon close.',
    foodType: 'baked_goods',
    quantityKg: 28,
    estimatedMeals: 75,
    preparationTime: '2026-10-21T06:00:00Z',
    pickupDeadline: '2026-10-21T19:30:00Z',
    storageCondition: 'ambient',
    allergens: ['Gluten', 'Sesame'],
    packagingType: 'Food-grade sanitized crates',
    pickupLocation: {
      latitude: 40.7180,
      longitude: -74.0010,
      address: '88 Baker Avenue',
      city: 'Metro Central',
      postalCode: '10002',
    },
    status: 'available',
    verificationMethod: 'QR',
    verificationToken: 'vtok_qr_99182371a',
    createdAt: '2026-10-21T15:00:00Z',
    updatedAt: '2026-10-21T15:00:00Z',
  },
  {
    id: 'don-103',
    donorOrgId: 'org-donor-01',
    donorOrgName: 'The Grand Heritage Bistro',
    donorType: 'Restaurant',
    title: '30 Portions Roasted Vegetable Medley',
    description: 'Fresh steamed and roasted seasonal root vegetables from dinner prep.',
    foodType: 'prepared_meals',
    quantityKg: 18,
    estimatedMeals: 40,
    preparationTime: '2026-10-21T12:00:00Z',
    pickupDeadline: '2026-10-21T17:00:00Z',
    storageCondition: 'refrigerated',
    measuredTemperatureCelsius: 3.8,
    allergens: [],
    packagingType: 'Sealed Poly Containers',
    pickupLocation: {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '450 West Elm Street',
      city: 'Metro Central',
      postalCode: '10001',
    },
    status: 'delivered',
    recipientOrgId: 'org-ngo-01',
    recipientOrgName: 'Hope Community Shelter & Kitchen',
    assignedVolunteerId: 'usr-vol-01',
    assignedVolunteerName: 'Alex Rivera',
    verificationMethod: 'QR',
    createdAt: '2026-10-21T10:00:00Z',
    updatedAt: '2026-10-21T13:10:00Z',
    deliveredAt: '2026-10-21T13:10:00Z',
  },
];

// Seeded Route Plan
const INITIAL_ROUTE_PLAN: RoutePlan = {
  id: 'route-701',
  volunteerId: 'usr-vol-01',
  volunteerName: 'Alex Rivera',
  date: '2026-10-21',
  totalDistanceKm: 7.2,
  totalDurationMinutes: 44,
  isFeasible: true,
  algorithm: 'Google OR-Tools VRP',
  stops: [
    {
      id: 'stop-01',
      routeId: 'route-701',
      donationId: 'don-101',
      stopSequence: 1,
      stopType: 'pickup',
      organizationName: 'The Grand Heritage Bistro',
      contactPerson: 'Chef Maya Lin',
      contactPhone: '+1 (555) 392-8172',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '450 West Elm Street',
        city: 'Metro Central',
        postalCode: '10001',
      },
      estimatedArrival: '2026-10-21T17:15:00Z',
      timeWindowStart: '2026-10-21T17:00:00Z',
      timeWindowEnd: '2026-10-21T17:45:00Z',
      serviceTimeMinutes: 8,
      status: 'pending',
      verificationMethod: 'PIN',
      pinCode: '749216',
      foodSummary: '50 Servings Vegetable Biryani',
      quantityKg: 35,
      temperatureTarget: '> 65°C Hot Holding',
    },
    {
      id: 'stop-02',
      routeId: 'route-701',
      donationId: 'don-101',
      stopSequence: 2,
      stopType: 'delivery',
      organizationName: 'St. Jude Youth Kitchen',
      contactPerson: 'Elena Rostova',
      contactPhone: '+1 (555) 639-1124',
      location: {
        latitude: 40.7310,
        longitude: -74.0090,
        address: '310 Pine Street',
        city: 'Metro Central',
        postalCode: '10004',
      },
      estimatedArrival: '2026-10-21T17:45:00Z',
      timeWindowStart: '2026-10-21T17:30:00Z',
      timeWindowEnd: '2026-10-21T18:15:00Z',
      serviceTimeMinutes: 10,
      status: 'pending',
      verificationMethod: 'PIN',
      pinCode: '749216',
      foodSummary: '50 Servings Vegetable Biryani',
      quantityKg: 35,
      temperatureTarget: 'Immediate Kitchen Service',
    },
  ],
  createdAt: '2026-10-21T15:30:00Z',
};

// Seeded Audit Logs
const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-01',
    action: 'DONATION_CREATED',
    entityType: 'Donation',
    entityId: 'don-101',
    performedByUserId: 'usr-donor-01',
    performedByName: 'Chef Maya Lin',
    performedByRole: 'donor',
    details: { quantityKg: 35, storageCondition: 'hot_holding', tempCheckPassed: true },
    timestamp: '2026-10-21T14:00:00Z',
  },
  {
    id: 'aud-02',
    action: 'MATCH_RECOMMENDED',
    entityType: 'Donation',
    entityId: 'don-101',
    performedByUserId: 'system',
    performedByName: 'Stage 2 AI Matching Service',
    performedByRole: 'system',
    details: { recommendedTo: 'org-ngo-02', compositeScore: 94.2, distanceKm: 2.4 },
    timestamp: '2026-10-21T14:02:00Z',
  },
  {
    id: 'aud-03',
    action: 'MATCH_ACCEPTED',
    entityType: 'Donation',
    entityId: 'don-101',
    performedByUserId: 'usr-ngo-02',
    performedByName: 'Elena Rostova',
    performedByRole: 'ngo',
    details: { atomicLockGranted: true, collisionAvoided: true },
    timestamp: '2026-10-21T14:15:00Z',
  },
  {
    id: 'aud-04',
    action: 'ROUTE_OPTIMIZED',
    entityType: 'Route',
    entityId: 'route-701',
    performedByUserId: 'system',
    performedByName: 'Google OR-Tools VRP Solver',
    performedByRole: 'system',
    details: { totalStops: 2, estimatedMinutes: 44, feasibility: 'FEASIBLE' },
    timestamp: '2026-10-21T14:30:00Z',
  },
];

class MockDataStore {
  private donations: Donation[] = [];
  private organizations: Organization[] = [];
  private routePlan: RoutePlan = INITIAL_ROUTE_PLAN;
  private auditLogs: AuditLogEntry[] = [];
  private notifications: SystemNotification[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    const savedDonations = localStorage.getItem('lp_mock_donations');
    const savedOrgs = localStorage.getItem('lp_mock_orgs');
    const savedLogs = localStorage.getItem('lp_mock_logs');

    this.donations = savedDonations ? JSON.parse(savedDonations) : [...INITIAL_DONATIONS];
    this.organizations = savedOrgs ? JSON.parse(savedOrgs) : [...INITIAL_ORGANIZATIONS];
    this.auditLogs = savedLogs ? JSON.parse(savedLogs) : [...INITIAL_AUDIT_LOGS];
  }

  private saveState() {
    localStorage.setItem('lp_mock_donations', JSON.stringify(this.donations));
    localStorage.setItem('lp_mock_orgs', JSON.stringify(this.organizations));
    localStorage.setItem('lp_mock_logs', JSON.stringify(this.auditLogs));
  }

  // Donations API
  public getDonations(): Donation[] {
    return [...this.donations];
  }

  public getDonationById(id: string): Donation | undefined {
    return this.donations.find((d) => d.id === id);
  }

  public createDonation(dto: CreateDonationDTO, donorOrgId: string, donorOrgName: string): Donation {
    const newDonation: Donation = {
      id: `don-${Date.now().toString().slice(-4)}`,
      donorOrgId,
      donorOrgName,
      donorType: 'Restaurant',
      title: dto.title,
      description: dto.description,
      foodType: dto.foodType,
      quantityKg: dto.quantityKg,
      estimatedMeals: dto.estimatedMeals,
      preparationTime: dto.preparationTime,
      pickupDeadline: dto.pickupDeadline,
      storageCondition: dto.storageCondition,
      measuredTemperatureCelsius: dto.measuredTemperatureCelsius,
      allergens: dto.allergens,
      packagingType: dto.packagingType,
      pickupLocation: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: dto.address || '450 West Elm Street',
        city: 'Metro Central',
        postalCode: '10001',
      },
      status: 'available',
      verificationMethod: 'QR',
      verificationToken: `vtok_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.donations.unshift(newDonation);

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: 'DONATION_CREATED',
      entityType: 'Donation',
      entityId: newDonation.id,
      performedByUserId: 'current_user',
      performedByName: donorOrgName,
      performedByRole: 'donor',
      details: { title: newDonation.title, meals: newDonation.estimatedMeals },
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return newDonation;
  }

  public cancelDonation(id: string, reason: string): Donation | null {
    const donation = this.donations.find((d) => d.id === id);
    if (!donation) return null;
    donation.status = 'cancelled';
    donation.updatedAt = new Date().toISOString();

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: 'DONATION_CANCELLED',
      entityType: 'Donation',
      entityId: donation.id,
      performedByUserId: 'current_user',
      performedByName: donation.donorOrgName,
      performedByRole: 'donor',
      details: { reason },
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return donation;
  }

  // Matches API
  public getMatchesForNGO(ngoOrgId: string): MatchRecommendation[] {
    const available = this.donations.filter((d) => d.status === 'available');
    return available.map((donation, index) => {
      // Heuristic calculations
      const distanceKm = 1.8 + index * 1.2;
      const distanceScore = Math.max(10, Math.round(100 - distanceKm * 8));
      const urgencyScore = 90;
      const capacityScore = 95;
      const reliabilityScore = 96;
      const totalScore = Math.round(
        distanceScore * 0.35 + urgencyScore * 0.30 + capacityScore * 0.20 + reliabilityScore * 0.15
      );

      return {
        id: `match-${donation.id}-${ngoOrgId}`,
        donationId: donation.id,
        donation,
        recipientOrgId: ngoOrgId,
        scoreBreakdown: {
          distanceScore,
          urgencyScore,
          capacityScore,
          reliabilityScore,
          totalScore,
        },
        explanation: `Optimal proximity (${distanceKm.toFixed(1)} km) and full receiving capacity compatibility.`,
        estimatedTravelTimeMinutes: Math.round(distanceKm * 4),
        roadDistanceKm: distanceKm,
        status: 'recommended',
        expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
    });
  }

  public acceptMatch(donationId: string, recipientOrgId: string, recipientOrgName: string): boolean {
    const donation = this.donations.find((d) => d.id === donationId);
    if (!donation || donation.status !== 'available') {
      return false; // Atomic collision prevention
    }

    donation.status = 'accepted';
    donation.recipientOrgId = recipientOrgId;
    donation.recipientOrgName = recipientOrgName;
    donation.updatedAt = new Date().toISOString();

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: 'MATCH_ACCEPTED',
      entityType: 'Donation',
      entityId: donation.id,
      performedByUserId: 'current_user',
      performedByName: recipientOrgName,
      performedByRole: 'ngo',
      details: { atomicLock: true, recipientOrgId },
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return true;
  }

  // Volunteer Routes
  public getRoutePlan(): RoutePlan {
    return this.routePlan;
  }

  public verifyStop(stopId: string, code: string): boolean {
    const stop = this.routePlan.stops.find((s) => s.id === stopId);
    if (!stop) return false;

    // PIN check
    if (stop.verificationMethod === 'PIN' && stop.pinCode && code !== stop.pinCode) {
      return false;
    }

    stop.status = 'completed';
    stop.completedAt = new Date().toISOString();

    const donation = this.donations.find((d) => d.id === stop.donationId);
    if (donation) {
      if (stop.stopType === 'pickup') {
        donation.status = 'in_transit';
      } else if (stop.stopType === 'delivery') {
        donation.status = 'delivered';
        donation.deliveredAt = new Date().toISOString();
      }
      donation.updatedAt = new Date().toISOString();
    }

    this.saveState();
    return true;
  }

  // Organizations & Audit
  public getOrganizations(): Organization[] {
    return [...this.organizations];
  }

  public verifyOrganization(orgId: string): Organization | null {
    const org = this.organizations.find((o) => o.id === orgId);
    if (!org) return null;
    org.verificationStatus = 'verified';

    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      action: 'ORGANIZATION_VERIFIED',
      entityType: 'Organization',
      entityId: org.id,
      performedByUserId: 'admin_user',
      performedByName: 'Sarah Chen',
      performedByRole: 'admin',
      details: { organizationName: org.name },
      timestamp: new Date().toISOString(),
    });

    this.saveState();
    return org;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  public getNotifications(): SystemNotification[] {
    return [...this.notifications];
  }
}

export const mockStore = new MockDataStore();
