import React from 'react';
import { 
  ShieldCheck, 
  Leaf, 
  FileCheck2, 
  Info
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { UserRole } from '../types';

export interface AboutImpactPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const AboutImpactPage: React.FC<AboutImpactPageProps> = ({ onOpenAuth }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      
      {/* MISSION & ORIGIN */}
      <div className="max-w-3xl space-y-5">
        <Badge variant="forest">Mission & Impact Transparency</Badge>
        <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-forest-950 tracking-tight leading-tight">
          Good Food Deserves a Second Chance.
        </h1>
        <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
          In every urban center, tons of fresh, wholesome food prepared by restaurants, bakeries, and caterers end up in dumpsters simply because safe distribution cannot be coordinated fast enough. Simultaneously, local community kitchens struggle with tight meal budgets.
        </p>
        <p className="text-stone-700 leading-relaxed text-sm sm:text-base">
          LastPlate solves this operational challenge. We are not a commercial marketplace, an on-demand food delivery app, or a social network. We are an operational surplus rescue infrastructure designed to move wholesome food before its safe consumption window closes.
        </p>
      </div>

      {/* SAMPLE DATA TRANSPARENCY DISCLAIMER */}
      <div className="bg-[#FAF4EB] border border-[#E8DEC8] p-6 rounded-3xl space-y-3">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <Info className="w-5 h-5 text-amber-700 shrink-0" />
          <span>Data Transparency & Demonstration Notice</span>
        </div>
        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
          Per Section 10 of our Master Platform Specification, <strong>all live counters, donation volumes, and metrics currently displayed on LastPlate are representative sample operational data</strong>. In Phase 4 and 12, as the platform connects to production PostgreSQL databases and verified physical handovers, these numbers will reflect cryptographically confirmed handovers in our launch metro area.
        </p>
      </div>

      {/* THREE STRUCTURAL COMMITMENTS */}
      <section className="space-y-6">
        <div className="border-b border-stone-200 pb-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Our 3 Structural Commitments
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800">
              <Leaf className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-forest-950 text-base">Zero Commercial Monopolization</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Rescued food is never resold, marked up, or converted into consumer discounts. 100% of donations are transferred to verified non-profits and community feeding kitchens free of charge.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-forest-950 text-base">Uncompromising Food Safety</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Food safety rules cannot be bypassed for convenience or higher matching scores. Every listing requires temperature logs, allergens, and safe preparation timestamps.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-800">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-forest-950 text-base">Verifiable Traceability</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              No donation is marked complete until the receiving community kitchen confirms receipt with a secure, expiring QR/PIN token. Donors receive immutable audit documentation for tax and liability purposes.
            </p>
          </div>
        </div>
      </section>

      {/* IMPACT MEASUREMENT METHODOLOGY */}
      <section className="bg-cream-100 rounded-3xl border border-[#E7DFD5] p-6 sm:p-10 space-y-6">
        <div>
          <Badge variant="amber">Transparent Math</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
            How LastPlate Calculates Environmental & Social Impact
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            We follow EPA WARM (Waste Reduction Model) and FAO global food loss benchmarks:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <span className="font-bold text-forest-900 block text-sm">Meal Equivalency Metric</span>
            <p className="text-stone-600 leading-relaxed">
              <strong>1 Rescued Meal = 0.42 kg (0.92 lbs)</strong> of edible food, aligned with USDA and Feeding America nutritional meal weight standards.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <span className="font-bold text-forest-900 block text-sm">CO₂e Avoidance Factor</span>
            <p className="text-stone-600 leading-relaxed">
              <strong>1 kg of food rescued = 2.62 kg CO₂e avoided</strong> by preventing anaerobic methane emission in municipal landfills.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-2">
            <span className="font-bold text-forest-900 block text-sm">Water Footprint Conservation</span>
            <p className="text-stone-600 leading-relaxed">
              <strong>1 kg of prepared surplus = ~410 liters</strong> of embedded freshwater conserved across the agricultural supply chain.
            </p>
          </div>
        </div>
      </section>

      {/* SAMPLE DEMONSTRATION RECORD */}
      <section className="space-y-6">
        <h3 className="font-serif text-2xl font-bold text-forest-950">
          Target Launch Milestone (Metro Central Area)
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft text-center space-y-1">
            <span className="text-3xl font-extrabold text-forest-800 font-serif">50,000</span>
            <p className="text-xs font-semibold text-stone-700">Meals Target (Year 1)</p>
            <p className="text-[10px] text-stone-500">Diverted from waste stream</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft text-center space-y-1">
            <span className="text-3xl font-extrabold text-amberGold-700 font-serif">200+</span>
            <p className="text-xs font-semibold text-stone-700">Participating Kitchens</p>
            <p className="text-[10px] text-stone-500">Commercial & Non-profit</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft text-center space-y-1">
            <span className="text-3xl font-extrabold text-emerald-700 font-serif">&lt; 40 min</span>
            <p className="text-xs font-semibold text-stone-700">Collection Latency</p>
            <p className="text-[10px] text-stone-500">Median pickup response time</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft text-center space-y-1">
            <span className="text-3xl font-extrabold text-forest-900 font-serif">100%</span>
            <p className="text-xs font-semibold text-stone-700">QR/PIN Verified</p>
            <p className="text-[10px] text-stone-500">Zero unverified deliveries</p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <div className="rounded-3xl bg-forest-900 text-white p-8 sm:p-12 text-center space-y-4 shadow-soft">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold">
          Be Part of the Solution
        </h3>
        <p className="text-xs sm:text-sm text-forest-200 max-w-xl mx-auto">
          Every kilogram of food saved preserves community dignity and protects our climate.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Button variant="accent" size="lg" onClick={() => onOpenAuth('donor')}>
            Register as Food Donor
          </Button>
          <Button variant="secondary" size="lg" onClick={() => onOpenAuth('ngo')}>
            Register as Community Kitchen
          </Button>
          <Button variant="outline" size="lg" className="border-emerald-300 text-white hover:bg-forest-800" onClick={() => onOpenAuth('volunteer')}>
            Join Volunteer Courier Network
          </Button>
        </div>
      </div>

    </div>
  );
};
