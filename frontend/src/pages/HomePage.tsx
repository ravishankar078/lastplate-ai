import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Building2, 
  Bike, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Scale, 
  CheckCircle2, 
  QrCode,
  Truck
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { SAMPLE_IMPACT_STATS, SAMPLE_LIVE_RESCUES, TESTIMONIALS } from '../data/mockData';
import { UserRole } from '../types';

export interface HomePageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenAuth }) => {
  const [activeStepTab, setActiveStepTab] = useState<number>(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Donor Posts Surplus',
      role: 'Donor',
      time: '< 3 minutes',
      description: 'A restaurant, bakery, or caterer posts prepared surplus food with preparation time, temperature holding conditions, allergens, and safe pickup deadline.',
      badge: 'Food Safety Gate',
      details: [
        'Mandatory preparation timestamp & safe temperature recording',
        'Specific allergen tagging (Gluten, Dairy, Nuts, etc.)',
        'Automatic quarantine if food safety rules fail'
      ]
    },
    {
      step: '02',
      title: 'AI Eligibility & Ranking',
      role: 'Platform',
      time: 'Instantaneous',
      description: 'Stage 1 filters verify NGO receiving capability, allergen safety, and travel feasibility. Stage 2 ranks verified recipients using transparent heuristic weights.',
      badge: 'Transparent Heuristics',
      details: [
        '35% Distance & Travel-time suitability',
        '30% Urgency & safe window closing speed',
        '20% Receiving capacity & food compatibility',
        '15% Historical pickup & handover reliability'
      ]
    },
    {
      step: '03',
      title: 'Atomic Claim & Route Optimization',
      role: 'NGO & Volunteer',
      time: 'Automated',
      description: 'The NGO accepts the offer via an atomic database transaction (preventing double claims). Google OR-Tools computes optimal collection stops for nearby volunteers.',
      badge: 'OR-Tools Routing',
      details: [
        'Guaranteed atomic reservation — no race conditions',
        'Multi-stop volunteer route planning with service times',
        'Insulated carrier requirements (hot/cold chain)'
      ]
    },
    {
      step: '04',
      title: 'Traceable Handover & Meal Service',
      role: 'Kitchen',
      time: 'Same-day',
      description: 'The volunteer confirms collection and delivery using secure, single-use expiring QR codes or 6-digit PINs. The community kitchen confirms receipt for meal service.',
      badge: 'Verified Outcome',
      details: [
        'Single-use cryptographically expiring tokens',
        'Delivery confirmed only after valid collection record',
        'Real-time verified impact logged to audit trail'
      ]
    }
  ];

  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      
      {/* HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-100 border border-forest-200 text-forest-900 text-xs sm:text-sm font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-forest-700 animate-pulse"></span>
                Operational Food Rescue Platform
                <span className="text-forest-400">|</span>
                <span className="text-stone-600 font-normal">Metro Central Zone</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-forest-950 tracking-tight leading-[1.12]">
                Good Food Deserves a <br className="hidden sm:inline" />
                <span className="text-forest-800 underline decoration-amberGold-400 decoration-wavy decoration-2 underline-offset-8">
                  Second Chance.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-stone-700 max-w-2xl font-normal leading-relaxed">
                LastPlate connects commercial kitchens, restaurants, and caterers with verified community shelters and volunteer networks. We rescue nutritious surplus food before safe consumption windows expire.
              </p>

              {/* Core Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onOpenAuth('donor')}
                  leftIcon={<HeartHandshake className="w-5 h-5 text-emerald-300" />}
                  className="shadow-soft-lg"
                >
                  Donate Surplus Food
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => onOpenAuth('ngo')}
                  leftIcon={<Building2 className="w-5 h-5 text-forest-800" />}
                >
                  Join as an NGO
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => onNavigate('how-it-works')}
                  rightIcon={<ArrowRight className="w-4 h-4 text-stone-500" />}
                >
                  See How It Works
                </Button>
              </div>

              {/* Guarantees */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600 border-t border-stone-200/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0" />
                  <span>Good Samaritan Protected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-forest-700 shrink-0" />
                  <span>38-Min Avg Collection</span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-forest-700 shrink-0" />
                  <span>QR/PIN Traceable Receipt</span>
                </div>
              </div>

            </div>

            {/* Right Visual Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Visual Frame */}
                <div className="relative rounded-3xl overflow-hidden shadow-soft-xl border-4 border-white bg-cream-100 aspect-[4/3] sm:aspect-[16/11]">
                  <img
                    src="/hero-rescue.jpg"
                    alt="Chef packaging fresh surplus food for rescue in a commercial kitchen"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/70 via-transparent to-transparent"></div>
                  
                  {/* Floating Overlay Badge on Image */}
                  <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-soft border border-white/40 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-forest-900">Commercial Kitchen Handover</p>
                      <p className="text-stone-500 text-[11px]">Vegetable Chili & Artisan Breads</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Safety Verified
                    </span>
                  </div>
                </div>

                {/* Floating Metric Pill */}
                <div className="absolute -top-4 -right-4 sm:-right-6 bg-[#FAF8F5] p-3 rounded-2xl shadow-soft-lg border border-stone-200/90 hidden sm:flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amberGold-100 flex items-center justify-center text-amberGold-800">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left pr-2">
                    <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">AI Match Engine</p>
                    <p className="text-sm font-bold text-forest-950">98.4% Feasibility</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SAMPLE OPERATIONAL IMPACT TICKER (CLEARLY LABELED DEMO STATS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-forest-900 text-white p-6 sm:p-10 shadow-soft-lg border border-forest-800 relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-forest-800/80">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-amberGold-300">
                <Sparkles className="w-3.5 h-3.5" />
                Demonstration Operational Metrics
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white mt-1">
                Measured City Impact in Real Time
              </h2>
            </div>
            <div className="text-xs text-forest-200 bg-forest-950/60 px-3 py-1.5 rounded-xl border border-forest-800">
              *Sample demonstration figures per Section 10 of platform specification
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pt-8">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-amberGold-400 font-serif">
                {SAMPLE_IMPACT_STATS.mealsRescued.toLocaleString()}+
              </p>
              <p className="text-xs sm:text-sm font-medium text-forest-100">Wholesome Meals Rescued</p>
              <p className="text-[11px] text-forest-300">Diverted from landfill disposal</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-serif">
                {(SAMPLE_IMPACT_STATS.co2AvoidedKg / 1000).toFixed(1)} t
              </p>
              <p className="text-xs sm:text-sm font-medium text-forest-100">CO₂e Emissions Avoided</p>
              <p className="text-[11px] text-forest-300">Based on EPA WARM food matrix</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-300 font-serif">
                {SAMPLE_IMPACT_STATS.activeDonors + SAMPLE_IMPACT_STATS.verifiedNGOs}
              </p>
              <p className="text-xs sm:text-sm font-medium text-forest-100">Verified Organizations</p>
              <p className="text-[11px] text-forest-300">{SAMPLE_IMPACT_STATS.activeDonors} Donors &bull; {SAMPLE_IMPACT_STATS.verifiedNGOs} Kitchens</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-white font-serif">
                {SAMPLE_IMPACT_STATS.avgPickupTimeMinutes} min
              </p>
              <p className="text-xs sm:text-sm font-medium text-forest-100">Average Pickup Speed</p>
              <p className="text-[11px] text-forest-300">Safe collection window adherence</p>
            </div>
          </div>

        </div>
      </section>

      {/* WHAT LASTPLATE IS (AND WHAT IT IS NOT) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <Badge variant="amber">Dignified Operations</Badge>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-950">
            Engineered Specifically for Food Rescue
          </h2>
          <p className="text-stone-600 text-sm sm:text-base">
            Commercial delivery apps and social media groups fail because food rescue requires immediate safety triage, atomic reservations, and strict traceability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-3xl border border-stone-200/90 shadow-soft space-y-4 hover:border-forest-700/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-forest-950">
              Food Safety & Shelf-Life First
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Every surplus post enforces preparation timestamps, hot/cold holding specifications, and allergen disclosures. Uncertainty triggers automated review holds.
            </p>
            <ul className="text-xs text-stone-500 space-y-1.5 pt-2 border-t border-stone-100">
              <li className="flex items-center gap-1.5 text-stone-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Zero unverified food accepted
              </li>
              <li className="flex items-center gap-1.5 text-stone-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Insulated carrier enforcement
              </li>
            </ul>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200/90 shadow-soft space-y-4 hover:border-forest-700/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amberGold-100 flex items-center justify-center text-amberGold-800">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-forest-950">
              Two-Stage AI Match Engine
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Stage 1 checks hard capacity, dietary rules, and travel feasibility. Stage 2 ranks recipients with an explainable score: 35% distance, 30% urgency, 20% capacity, 15% reliability.
            </p>
            <ul className="text-xs text-stone-500 space-y-1.5 pt-2 border-t border-stone-100">
              <li className="flex items-center gap-1.5 text-stone-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                No black-box decisions
              </li>
              <li className="flex items-center gap-1.5 text-stone-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Atomic anti-collision claims
              </li>
            </ul>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200/90 shadow-soft space-y-4 hover:border-forest-700/50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-forest-950">
              OR-Tools Route Optimization
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Volunteers receive multi-stop collection routes planned by Google OR-Tools with strict service time windows, road routing, and secure QR/PIN handover verification.
            </p>
            <ul className="text-xs text-stone-500 space-y-1.5 pt-2 border-t border-stone-100">
              <li className="flex items-center gap-1.5 text-stone-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Actual road distance & times
              </li>
              <li className="flex items-center gap-1.5 text-stone-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Single-use cryptographic PINs
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* INTERACTIVE 4-STEP OPERATIONAL PIPELINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-cream-100 border border-[#E7DFD5] p-6 sm:p-10 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Badge variant="forest">Step-by-Step Architecture</Badge>
              <h2 className="font-serif text-3xl font-bold text-forest-950 mt-2">
                How a Meal is Rescued in 4 Operational Steps
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 max-w-md">
              Click each step to explore the backend domain rules, safety verifications, and technological integration.
            </p>
          </div>

          {/* Tab selectors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {workflowSteps.map((step, idx) => (
              <button
                key={step.step}
                onClick={() => setActiveStepTab(idx)}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeStepTab === idx
                    ? 'bg-forest-800 text-white border-forest-900 shadow-soft'
                    : 'bg-white text-stone-700 border-stone-200/80 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className={`px-2 py-0.5 rounded ${activeStepTab === idx ? 'bg-forest-700 text-emerald-200' : 'bg-stone-100 text-stone-600'}`}>
                    Step {step.step}
                  </span>
                  <span className="text-[11px] opacity-80">{step.time}</span>
                </div>
                <h4 className="font-bold text-sm truncate">{step.title}</h4>
                <p className={`text-xs mt-1 truncate ${activeStepTab === idx ? 'text-forest-200' : 'text-stone-500'}`}>
                  {step.role}
                </p>
              </button>
            ))}
          </div>

          {/* Active Tab Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-serif font-black text-amberGold-600">
                  {workflowSteps[activeStepTab].step}
                </span>
                <h3 className="text-2xl font-bold text-forest-950">
                  {workflowSteps[activeStepTab].title}
                </h3>
                <Badge variant="stone">{workflowSteps[activeStepTab].badge}</Badge>
              </div>

              <p className="text-stone-700 text-base leading-relaxed">
                {workflowSteps[activeStepTab].description}
              </p>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Engineering Invariants & Logic:
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                  {workflowSteps[activeStepTab].details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl p-5 border border-stone-200/90 space-y-3 text-xs">
              <div className="flex items-center justify-between text-stone-500 font-semibold border-b border-stone-200 pb-2">
                <span>System Component</span>
                <span className="text-forest-800">Status: Automated</span>
              </div>
              <div className="space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span className="text-stone-500">Database Contract:</span>
                  <span className="font-mono text-forest-900 font-medium">PostgreSQL + PostGIS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Optimization Library:</span>
                  <span className="font-mono text-forest-900 font-medium">Google OR-Tools VRP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Verification Mechanism:</span>
                  <span className="font-mono text-forest-900 font-medium">HMAC-SHA256 Token</span>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => onNavigate('how-it-works')}
                >
                  Read Detailed Technical Specification &rarr;
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* LIVE RESCUE DISPATCH PREVIEW (SAMPLE OPERATIONAL FEED) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="amber">Live Rescue Feed</Badge>
              <span className="text-xs text-stone-500 font-medium">(Sample Demonstration Activity)</span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-forest-950 mt-1">
              Active Community Surplus Dispatches
            </h2>
          </div>
          <p className="text-xs text-stone-600 max-w-sm">
            Shows incoming donor surplus, safe countdown timers, and assigned volunteer couriers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SAMPLE_LIVE_RESCUES.map((rescue) => {
            const isUrgent = rescue.urgencyScore >= 90;
            return (
              <div 
                key={rescue.id}
                className="bg-white rounded-3xl p-6 border border-stone-200 shadow-soft hover:shadow-soft-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                        {rescue.donorType} &bull; {rescue.donorName}
                      </span>
                      <h3 className="text-lg font-bold text-forest-950 mt-0.5">
                        {rescue.title}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase shrink-0 ${
                      rescue.status === 'in_transit'
                        ? 'bg-amberGold-100 text-amberGold-900 border border-amberGold-200'
                        : rescue.status === 'assigned'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-forest-100 text-forest-900 border border-forest-200'
                    }`}>
                      {rescue.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2">
                    {rescue.description}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <span className="text-stone-400 block text-[10px]">Quantity</span>
                      <span className="font-bold text-stone-800">{rescue.quantityKg} kg ({rescue.estimatedMeals} meals)</span>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <span className="text-stone-400 block text-[10px]">Storage</span>
                      <span className="font-bold text-stone-800 capitalize">{rescue.storageCondition.replace('_', ' ')}</span>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <span className="text-stone-400 block text-[10px]">Pickup Deadline</span>
                      <span className={`font-bold ${isUrgent ? 'text-amberGold-700' : 'text-stone-800'}`}>
                        {rescue.pickupDeadline}
                      </span>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <span className="text-stone-400 block text-[10px]">Handover Proof</span>
                      <span className="font-bold text-forest-800">{rescue.verificationMethod} Code</span>
                    </div>
                  </div>
                </div>

                {rescue.recipientName && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-forest-700" />
                      <span>Destined for: <strong>{rescue.recipientName}</strong></span>
                    </div>
                    <span className="text-emerald-700 font-semibold">{rescue.distanceKm} km away</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* COMMUNITY RESCUE IMAGE & IMPACT VOICES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-stone-200/90 p-8 sm:p-12 shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl overflow-hidden shadow-soft border border-stone-200 aspect-[16/10]">
              <img
                src="/community-delivery.jpg"
                alt="Volunteer delivering insulated food containers to a local community kitchen"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-2 text-center italic">
              Verified volunteer delivering temperature-monitored carriers to a community shelter.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <Badge variant="forest">Voices from the Field</Badge>
            <h2 className="font-serif text-3xl font-bold text-forest-950">
              Trusted by Local Kitchens, Shelters, and Volunteer Couriers
            </h2>

            <div className="space-y-4">
              {TESTIMONIALS.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200/80 space-y-2">
                  <p className="text-xs sm:text-sm text-stone-700 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-bold text-forest-950">{t.author}</span>
                      <span className="text-xs text-stone-500"> &bull; {t.role}, {t.organization}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-forest-100 text-forest-800">
                      {t.userType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-forest-900 via-forest-800 to-forest-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-soft-xl border border-forest-700">
          
          <span className="inline-block px-3 py-1 rounded-full bg-forest-700/80 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            Join the Local Rescue Network
          </span>

          <h2 className="font-serif text-3xl sm:text-5xl font-bold max-w-2xl mx-auto leading-tight">
            Ready to give good food its rightful second chance?
          </h2>

          <p className="text-forest-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Whether you operate a commercial kitchen with fresh surplus, lead a community pantry, or want to deliver meals on your bike or car, LastPlate makes food rescue seamless and safe.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              variant="accent"
              size="lg"
              onClick={() => onOpenAuth('donor')}
              leftIcon={<HeartHandshake className="w-5 h-5 text-white" />}
            >
              Post Surplus as a Donor
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onOpenAuth('ngo')}
              leftIcon={<Building2 className="w-5 h-5 text-stone-800" />}
            >
              Register Community Kitchen
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onOpenAuth('volunteer')}
              className="border-emerald-300/40 text-white hover:bg-forest-800"
              leftIcon={<Bike className="w-5 h-5 text-emerald-300" />}
            >
              Volunteer as a Courier
            </Button>
          </div>

          <p className="text-xs text-forest-300 pt-3">
            Zero platform fees for non-profits &bull; Full tax deduction documentation for donors
          </p>
        </div>
      </section>

    </div>
  );
};
