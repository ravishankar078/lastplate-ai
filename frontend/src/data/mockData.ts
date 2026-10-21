import { DonationItem, ImpactStats, Testimonial, FAQItem } from '../types';

export const SAMPLE_IMPACT_STATS: ImpactStats = {
  mealsRescued: 42850,
  co2AvoidedKg: 47135,
  activeDonors: 184,
  verifiedNGOs: 62,
  activeVolunteers: 310,
  avgPickupTimeMinutes: 38,
  landfillDiversionKg: 18000,
  isSampleData: true, // Transparently labeled per Section 10 of Master Spec
};

export const SAMPLE_LIVE_RESCUES: DonationItem[] = [
  {
    id: 'resc-01',
    donorName: 'Artisan Hearth Bakery',
    donorType: 'Bakery',
    title: '45 Loaves Sourdough & Assorted Focaccia',
    description: 'Freshly baked this morning, unsold at 4 PM closing. Packaged in sanitized food-grade paper liners.',
    foodType: 'baked_goods',
    quantityKg: 28,
    estimatedMeals: 75,
    preparationTime: 'Today, 06:00 AM',
    pickupDeadline: 'Today, 06:30 PM (1h 15m left)',
    storageCondition: 'ambient',
    allergens: ['Gluten', 'Sesame'],
    distanceKm: 1.8,
    status: 'assigned',
    urgencyScore: 92,
    recipientName: 'Hope Community Shelter',
    verificationMethod: 'QR',
  },
  {
    id: 'resc-02',
    donorName: 'The Grand Heritage Bistro',
    donorType: 'Restaurant',
    title: '50 Servings Vegetable Biryani & Dal Makhani',
    description: 'Prepared for a private luncheon buffet. Maintained above 65°C hot holding until packaging in stainless inserts.',
    foodType: 'prepared_meals',
    quantityKg: 35,
    estimatedMeals: 70,
    preparationTime: 'Today, 01:30 PM',
    pickupDeadline: 'Today, 05:45 PM (30m left)',
    storageCondition: 'hot_holding',
    allergens: ['Dairy'],
    distanceKm: 2.4,
    status: 'in_transit',
    urgencyScore: 98,
    recipientName: 'St. Jude Youth Kitchen',
    verificationMethod: 'PIN',
  },
  {
    id: 'resc-03',
    donorName: 'Urban Greens Supermarket',
    donorType: 'Supermarket',
    title: '80kg Fresh Seasonal Produce & Citrus',
    description: 'Grade-A surplus apples, oranges, and organic leafy greens approaching store display cycle.',
    foodType: 'produce',
    quantityKg: 80,
    estimatedMeals: 160,
    preparationTime: 'Harvested 3 days ago',
    pickupDeadline: 'Today, 08:00 PM',
    storageCondition: 'refrigerated',
    allergens: [],
    distanceKm: 4.1,
    status: 'available',
    urgencyScore: 84,
    verificationMethod: 'QR',
  },
  {
    id: 'resc-04',
    donorName: 'Catering Royale Events',
    donorType: 'Caterer',
    title: '60 Portions Roasted Vegetable Medley & Quinoa',
    description: 'Corporate summit surplus. Immediately blast-chilled to 3°C per food safety SOP.',
    foodType: 'prepared_meals',
    quantityKg: 24,
    estimatedMeals: 60,
    preparationTime: 'Today, 11:30 AM',
    pickupDeadline: 'Today, 07:00 PM',
    storageCondition: 'refrigerated',
    allergens: [],
    distanceKm: 3.2,
    status: 'matched',
    urgencyScore: 89,
    recipientName: 'Civic Center Meal Program',
    verificationMethod: 'QR',
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    quote: "LastPlate completely replaced our frantic end-of-day phone calls. We post our prepared surplus in 90 seconds, and a verified volunteer arrives with insulated carriers before dinner service starts. It's safe, organized, and dignified.",
    author: "Chef Maya Lin",
    role: "Executive Head Chef",
    organization: "The Grand Heritage Bistro",
    userType: 'donor',
    avatarInitials: 'ML',
  },
  {
    id: 't-2',
    quote: "Unlike generic donation schemes where food turns up unexpectedly or past safety thresholds, LastPlate gives us transparent match scores and precise temperature logs. We can plan our evening meal service with total confidence.",
    author: "Rev. Marcus Vance",
    role: "Program Director",
    organization: "Hope Community Shelter & Kitchen",
    userType: 'ngo',
    avatarInitials: 'MV',
  },
  {
    id: 't-3',
    quote: "The volunteer routing is brilliant. I get a route on my phone with clear pickup and delivery windows, verify the food temperature, and scan the QR code in five seconds. It feels like high-tech logistics with genuine heart.",
    author: "Alex Rivera",
    role: "Lead Volunteer Courier",
    organization: "Civic Rescue Network",
    userType: 'volunteer',
    avatarInitials: 'AR',
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "Is LastPlate a food delivery marketplace or social media platform?",
    answer: "No. LastPlate is strictly an operational surplus food rescue platform. We connect food businesses with verified non-profits and vetted volunteers before safe food consumption windows expire. We do not facilitate commercial food sales or consumer deliveries.",
    category: 'general'
  },
  {
    question: "How does LastPlate enforce food safety and legal liability?",
    answer: "Every donation requires preparation timestamps, safe storage classification (hot-holding, refrigerated, ambient), and allergen documentation. Food is covered by Good Samaritan food donation laws when donated in good faith to verified non-profits. Donations failing safety gates are immediately quarantined for review.",
    category: 'safety'
  },
  {
    question: "How long does it take for a donor to list surplus food?",
    answer: "Under 3 minutes. With pre-saved business profiles, donors simply input the food category, approximate quantity, prep time, and pickup deadline. The system immediately calculates rescue radius and alerts the best-matched recipients.",
    category: 'donors'
  },
  {
    question: "How are NGOs matched and can an NGO decline an offer?",
    answer: "NGOs set their receiving hours, dietary restrictions, and daily storage capacity. Our AI matching engine ranks eligible recipients using transparent heuristics (35% travel time, 30% urgency, 20% capacity, 15% reliability). NGOs have full autonomy to accept or decline with a single click.",
    category: 'ngos'
  },
  {
    question: "What equipment do volunteers need to transport food?",
    answer: "Volunteers receive verified food handling training during onboarding. Deliveries require food-grade insulated thermal carriers (hot or cold holding) provided by LastPlate or partner hubs. Deliveries are tracked with secure, single-use QR/PIN handovers.",
    category: 'volunteers'
  }
];
