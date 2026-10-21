import React from 'react';
import { 
  Building2, 
  AlertTriangle, 
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FAQS } from '../data/mockData';
import { UserRole } from '../types';

export interface ForNGOsPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const ForNGOsPage: React.FC<ForNGOsPageProps> = ({ onNavigate, onOpenAuth }) => {
  const ngoFaqs = FAQS.filter(f => f.category === 'ngos' || f.category === 'safety');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      
      {/* HEADER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-5">
          <Badge variant="forest">For Shelters, Kitchens & Food Pantries</Badge>
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-forest-950 tracking-tight leading-tight">
            Predictable, Verified Food Inflow for Community Kitchens
          </h1>
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
            Stop dealing with random, unusable food drops. LastPlate matches your kitchen with wholesome surplus based on your exact storage capacity, dietary needs, and operating hours.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenAuth('ngo')}
              leftIcon={<Building2 className="w-5 h-5 text-emerald-300" />}
            >
              Register Community Kitchen
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigate('contact')}
            >
              Verify Organization Criteria
            </Button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-soft space-y-4">
          <h3 className="font-bold text-forest-950 text-base flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-forest-700" />
            Kitchen-Centric Controls
          </h3>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
              <span className="font-bold text-stone-900 block">Strict Capacity Limits</span>
              <p className="text-stone-500 text-xs">
                Configure max meals per day and available refrigeration. You will never be sent more food than you can safely store.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
              <span className="font-bold text-stone-900 block">Dietary & Allergen Filtering</span>
              <p className="text-stone-500 text-xs">
                Specify acceptable food categories (e.g. Vegetarian only, Halal, Nut-free, Bakery only) to match your guests.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
              <span className="font-bold text-stone-900 block">1-Click Accept or Decline</span>
              <p className="text-stone-500 text-xs">
                Full autonomy. If your freezer is full or staff are off-duty, decline with zero penalty. Fallback matching activates instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-STEP NGO VERIFICATION PROCESS */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="stone">Onboarding & Integrity</Badge>
          <h2 className="font-serif text-3xl font-bold text-forest-950">
            Our 3-Step NGO Verification Standard
          </h2>
          <p className="text-stone-600 text-sm">
            To protect food donors and ensure safe distribution, all recipient non-profits are vetted prior to dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              1
            </div>
            <h3 className="font-bold text-forest-950 text-base">Non-Profit Credential Check</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Submission of registered charity / 501(c)(3) tax exemption determination and operational license.
            </p>
            <span className="text-[11px] font-semibold text-forest-700 bg-forest-50 px-2.5 py-1 rounded-lg inline-block">
              24-Hour Review Turnaround
            </span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              2
            </div>
            <h3 className="font-bold text-forest-950 text-base">Cold Chain & Storage Audit</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Verification of on-site commercial refrigeration, walk-in coolers, dry pantry shelving, and hot holding warmers.
            </p>
            <span className="text-[11px] font-semibold text-forest-700 bg-forest-50 px-2.5 py-1 rounded-lg inline-block">
              Prevents Food Spoilage
            </span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800 font-bold">
              3
            </div>
            <h3 className="font-bold text-forest-950 text-base">Food Safety Staff Certified</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Kitchen manager or intake director must hold a valid food safety / ServSafe credential for accepting prepared items.
            </p>
            <span className="text-[11px] font-semibold text-forest-700 bg-forest-50 px-2.5 py-1 rounded-lg inline-block">
              Ensures Safe Distribution
            </span>
          </div>
        </div>
      </section>

      {/* FOOD SAFETY & REJECTION WORKFLOW */}
      <section className="bg-cream-100 rounded-3xl border border-[#E7DFD5] p-6 sm:p-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="amber">Safety Assurance</Badge>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
              Food Safety Inspection & Incident Reporting
            </h2>
          </div>
          <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Kitchen Right to Reject
          </span>
        </div>

        <p className="text-xs sm:text-sm text-stone-700 max-w-3xl leading-relaxed">
          Your guests deserve dignity and wholesome nutrition. If any incoming donation fails sensory inspection, arrives at an improper temperature, or exhibits compromised packaging, your kitchen has the unilateral right to reject the item on the spot through the LastPlate app.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
            <span className="text-xs font-bold text-stone-900 block">1. Instant Photo Log</span>
            <p className="text-xs text-stone-500">Take a photo of compromised packaging or log off-spec thermometer readings.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
            <span className="text-xs font-bold text-stone-900 block">2. Automatic Safety Hold</span>
            <p className="text-xs text-stone-500">The donor&apos;s active listings are temporarily held for administrative quality audit.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
            <span className="text-xs font-bold text-stone-900 block">3. Zero Cost or Liability</span>
            <p className="text-xs text-stone-500">LastPlate arranges compost/disposal diversion and protects your organization entirely.</p>
          </div>
        </div>
      </section>

      {/* NGO FAQS */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="stone">Questions & Answers</Badge>
          <h2 className="font-serif text-3xl font-bold text-forest-950">
            Frequently Asked Questions by Community Kitchens
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {ngoFaqs.map((faq, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-2">
              <h3 className="font-bold text-forest-950 text-sm sm:text-base flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-forest-700 shrink-0 mt-0.5" />
                <span>{faq.question}</span>
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm pl-7 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <div className="rounded-3xl bg-forest-900 text-white p-8 sm:p-12 text-center space-y-4 shadow-soft">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold">
          Partner with LastPlate to Receive Fresh Surplus Meals
        </h3>
        <p className="text-xs sm:text-sm text-forest-200 max-w-xl mx-auto">
          Completely free for verified non-profit shelters, soup kitchens, and food pantries.
        </p>
        <div className="pt-2">
          <Button variant="accent" size="lg" onClick={() => onOpenAuth('ngo')}>
            Submit Verification Application
          </Button>
        </div>
      </div>

    </div>
  );
};
