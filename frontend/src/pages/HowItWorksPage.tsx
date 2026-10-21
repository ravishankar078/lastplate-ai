import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Scale, 
  MapPin, 
  Clock, 
  Truck, 
  QrCode, 
  Lock, 
  Sparkles
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { UserRole } from '../types';

export interface HowItWorksPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate, onOpenAuth }) => {
  // Interactive Matching Score Simulator state
  const [distanceKm, setDistanceKm] = useState<number>(2.5);
  const [urgencyHours, setUrgencyHours] = useState<number>(2.0);
  const [capacityMeals, setCapacityMeals] = useState<number>(120);
  const [reliabilityPct, setReliabilityPct] = useState<number>(96);

  // Calculate Heuristic Score per Section 4 of Spec:
  // Distance: 35% (closer is higher; 1km = 100%, 10km = 10%)
  const distanceScore = Math.max(10, Math.min(100, Math.round(100 - (distanceKm - 0.5) * 10)));
  // Urgency: 30% (less time remaining = higher urgency score)
  const urgencyScore = Math.max(20, Math.min(100, Math.round(100 - urgencyHours * 15)));
  // Capacity: 20% (ability to handle donation of 60 meals)
  const capacityScore = capacityMeals >= 60 ? 100 : Math.round((capacityMeals / 60) * 100);
  // Reliability: 15% (historical verified on-time handovers)
  const reliabilityScore = reliabilityPct;

  const totalScore = Math.round(
    (distanceScore * 0.35) +
    (urgencyScore * 0.30) +
    (capacityScore * 0.20) +
    (reliabilityScore * 0.15)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      
      {/* HEADER */}
      <div className="max-w-3xl space-y-4">
        <Badge variant="forest">System Architecture & Engineering</Badge>
        <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-forest-950 tracking-tight">
          How LastPlate Works: Deterministic, Safe, and Traceable
        </h1>
        <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
          LastPlate replaces chaotic ad-hoc food rescue with an automated, two-stage AI matching engine, Google OR-Tools routing, and cryptographic single-use handover verification.
        </p>
      </div>

      {/* 5 OPERATIONAL PILLARS */}
      <section className="space-y-10">
        <div className="border-b border-stone-200 pb-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            The 5 Invariant Pillars of LastPlate
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            Engineered to ensure zero compromised food reaches a beneficiary, and zero double-claims occur.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              1
            </div>
            <h3 className="text-lg font-bold text-forest-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-forest-700" />
              Food Safety Gate
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              A donor-entered deadline alone is not enough. The backend enforces safe temperature thresholds, preparation timestamps, and allergen declarations.
            </p>
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
              <strong>Domain Rule:</strong> Uncertain storage or past-safe-threshold donations are automatically quarantined into an Admin Review Hold.
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              2
            </div>
            <h3 className="text-lg font-bold text-forest-950 flex items-center gap-2">
              <Scale className="w-5 h-5 text-forest-700" />
              Two-Stage AI Matching
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Stage 1 validates hard constraints (dietary, operating hours, capacity). Stage 2 computes an explainable heuristic score to order potential recipients transparently.
            </p>
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
              <strong>Domain Rule:</strong> Matching heuristics can never override safety rules. No black-box AI makes unaccountable allocation decisions.
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              3
            </div>
            <h3 className="text-lg font-bold text-forest-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-forest-700" />
              Atomic Claim Transactions
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              When an eligible NGO accepts an offer, the backend executes an atomic PostgreSQL transaction. This strictly prevents race conditions or duplicate claims.
            </p>
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
              <strong>Domain Rule:</strong> Status transitions are validated strictly via finite state machine: Available &rarr; Accepted &rarr; Assigned &rarr; Delivered.
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              4
            </div>
            <h3 className="text-lg font-bold text-forest-950 flex items-center gap-2">
              <Truck className="w-5 h-5 text-forest-700" />
              Google OR-Tools Routing
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Volunteer collection routes are solved with Google OR-Tools Vehicle Routing Problem (VRP) algorithms, accounting for service times and actual road network distances.
            </p>
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
              <strong>Domain Rule:</strong> Never present straight-line Euclidean distance as road distance. Feasibility includes collection deadline buffers.
            </div>
          </div>

          {/* Pillar 5 */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              5
            </div>
            <h3 className="text-lg font-bold text-forest-950 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-forest-700" />
              Single-Use QR / PIN Handover
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Every pickup and drop-off requires scanning a time-expiring cryptographic token or entering a 6-digit PIN. Delivery cannot be marked completed without valid pickup.
            </p>
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500">
              <strong>Domain Rule:</strong> Used or expired tokens are rejected immediately. Immutable audit logs store physical timestamps for liability.
            </div>
          </div>

          {/* Pillar 6 */}
          <div className="bg-forest-900 text-white p-6 rounded-3xl border border-forest-800 shadow-soft space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amberGold-300">
                Summary Invariant
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                Zero Social Media Gimmicks
              </h3>
              <p className="text-xs text-forest-200 leading-relaxed mt-2">
                LastPlate is an operational platform. We prioritize quick collection of perishable surplus over likes, public feeds, or commercial food delivery markups.
              </p>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={() => onOpenAuth('donor')}
              fullWidth
            >
              Start as a Food Donor
            </Button>
          </div>

        </div>
      </section>

      {/* INTERACTIVE STAGE 2 MATCHING SCORE SIMULATOR */}
      <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-10 shadow-soft space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
          <div>
            <Badge variant="amber">Interactive Heuristic Explorer</Badge>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
              AI Matching Engine: Stage 2 Scoring Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Simulate how LastPlate ranks prospective recipient kitchens for an active surplus of 60 hot meals.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-stone-500 block">Calculated Match Score</span>
            <span className={`text-4xl font-extrabold font-serif ${
              totalScore >= 80 ? 'text-forest-800' : totalScore >= 60 ? 'text-amberGold-700' : 'text-rose-700'
            }`}>
              {totalScore} <span className="text-lg font-normal text-stone-400">/ 100</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Controls */}
          <div className="space-y-6">
            
            {/* Control 1: Distance */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-forest-700" />
                  Road Distance to Recipient (Weight: 35%)
                </span>
                <span className="font-mono text-forest-900">{distanceKm} km (Score: {distanceScore}/100)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                className="w-full accent-forest-800"
              />
              <p className="text-[11px] text-stone-500">Closer proximity minimizes transit time and thermal degradation.</p>
            </div>

            {/* Control 2: Urgency */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amberGold-600" />
                  Safe Collection Window Remaining (Weight: 30%)
                </span>
                <span className="font-mono text-forest-900">{urgencyHours} hours (Score: {urgencyScore}/100)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.5"
                value={urgencyHours}
                onChange={(e) => setUrgencyHours(parseFloat(e.target.value))}
                className="w-full accent-forest-800"
              />
              <p className="text-[11px] text-stone-500">Shorter windows prioritize recipients with immediate volunteer pickup readiness.</p>
            </div>

            {/* Control 3: Capacity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-forest-700" />
                  Recipient Receiving Capacity (Weight: 20%)
                </span>
                <span className="font-mono text-forest-900">{capacityMeals} meals (Score: {capacityScore}/100)</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="10"
                value={capacityMeals}
                onChange={(e) => setCapacityMeals(parseInt(e.target.value))}
                className="w-full accent-forest-800"
              />
              <p className="text-[11px] text-stone-500">Full compatibility achieved when recipient can accommodate full 60-portion batch.</p>
            </div>

            {/* Control 4: Reliability */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Historical On-Time Reliability (Weight: 15%)
                </span>
                <span className="font-mono text-forest-900">{reliabilityPct}% (Score: {reliabilityScore}/100)</span>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                step="1"
                value={reliabilityPct}
                onChange={(e) => setReliabilityPct(parseInt(e.target.value))}
                className="w-full accent-forest-800"
              />
              <p className="text-[11px] text-stone-500">Based on verified prompt acceptance and safe meal distribution records.</p>
            </div>

          </div>

          {/* Transparent Score Output Breakdown */}
          <div className="bg-[#FAF8F5] p-6 rounded-2xl border border-stone-200/90 space-y-4">
            <h4 className="text-sm font-bold text-forest-950 uppercase tracking-wider">
              Transparent Recommendation Explanation
            </h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-stone-200/60">
                <span className="text-stone-600">Travel Suitability (35% &times; {distanceScore}):</span>
                <span className="font-mono font-bold text-forest-900">{(distanceScore * 0.35).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-stone-200/60">
                <span className="text-stone-600">Urgency & Feasibility (30% &times; {urgencyScore}):</span>
                <span className="font-mono font-bold text-forest-900">{(urgencyScore * 0.30).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-stone-200/60">
                <span className="text-stone-600">Capacity Match (20% &times; {capacityScore}):</span>
                <span className="font-mono font-bold text-forest-900">{(capacityScore * 0.20).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-stone-200/60">
                <span className="text-stone-600">Historical Reliability (15% &times; {reliabilityScore}):</span>
                <span className="font-mono font-bold text-forest-900">{(reliabilityScore * 0.15).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-sm font-bold text-forest-950">
                <span>Total Combined Score:</span>
                <span className="font-mono text-base text-forest-800">{totalScore} / 100</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-forest-100/60 border border-forest-200 text-xs text-forest-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                Algorithm Recommendation:
              </p>
              <p className="text-[11px] text-stone-700">
                {totalScore >= 80 
                  ? 'High Priority Recommendation. Dispatch direct push notification to NGO and reserve immediate volunteer window.' 
                  : totalScore >= 60 
                  ? 'Secondary Match. Display in discovery portal with fallback broadcast if primary recipient declines within 15 minutes.'
                  : 'Marginal Compatibility. Retain on discovery queue; volunteer route extension may be required.'}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* CTA FOOTER */}
      <div className="text-center space-y-4 pt-6 border-t border-stone-200">
        <h3 className="font-serif text-2xl font-bold text-forest-950">
          Want to see this in your commercial kitchen or community organization?
        </h3>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="primary" onClick={() => onOpenAuth('donor')}>
            Register as Food Donor
          </Button>
          <Button variant="secondary" onClick={() => onOpenAuth('ngo')}>
            Register as Recipient NGO
          </Button>
          <Button variant="outline" onClick={() => onNavigate('contact')}>
            Contact Technical Team
          </Button>
        </div>
      </div>

    </div>
  );
};
