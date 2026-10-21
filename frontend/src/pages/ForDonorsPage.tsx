import React, { useState } from 'react';
import { 
  Clock, 
  ShieldCheck, 
  HeartHandshake, 
  Receipt, 
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FAQS } from '../data/mockData';
import { UserRole } from '../types';

export interface ForDonorsPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const ForDonorsPage: React.FC<ForDonorsPageProps> = ({ onNavigate, onOpenAuth }) => {
  // Calculator state
  const [weeklyPortions, setWeeklyPortions] = useState<number>(150);
  const [avgPortionValue, setAvgPortionValue] = useState<number>(6.5);

  const annualMeals = weeklyPortions * 52;
  const annualCO2AvoidedKg = Math.round(annualMeals * 0.42 * 2.6); // 0.42kg per meal * 2.6kg CO2e per kg food
  const annualTaxDeduction = Math.round(annualMeals * (avgPortionValue * 0.6)); // eligible cost-recovery basis

  const donorFaqs = FAQS.filter(f => f.category === 'donors' || f.category === 'safety');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      
      {/* HERO FOR DONORS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-5">
          <Badge variant="forest">For Food Businesses & Caterers</Badge>
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-forest-950 tracking-tight leading-tight">
            Turn Daily Surplus into Community Nourishment in Under 3 Minutes
          </h1>
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
            Restaurants, bakeries, corporate canteens, and caterers: prevent food waste without distracting your kitchen brigade. Post surplus, verify food safety, and hand over to vetted volunteer couriers.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenAuth('donor')}
              leftIcon={<HeartHandshake className="w-5 h-5 text-emerald-300" />}
            >
              Register Your Kitchen
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigate('contact')}
            >
              Schedule an Onboarding Demo
            </Button>
          </div>
        </div>

        {/* 3-Minute Post Flow Card */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-forest-950 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 text-forest-700" />
              The 3-Minute Surplus Post
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-100 text-forest-800">
              Kitchen-Friendly
            </span>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
              <div>
                <p className="font-bold text-stone-900">Select Food Type & Quantity</p>
                <p className="text-stone-500 text-xs">Prepared hot meals, bakery trays, produce, or chilled boxes.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
              <div>
                <p className="font-bold text-stone-900">Log Temp & Pickup Deadline</p>
                <p className="text-stone-500 text-xs">Specify holding condition (e.g. &gt;65°C hot, &lt;4°C cold) and allergen tags.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
              <div>
                <p className="font-bold text-stone-900">Scan QR Code at Handover</p>
                <p className="text-stone-500 text-xs">Courier arrives with insulated carrier. Scan single-use QR for instant tax receipt.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700 shrink-0" />
              Full liability protection under the Bill Emerson Good Samaritan Food Donation Act.
            </p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DONOR IMPACT & TAX DEDUCTION ESTIMATOR */}
      <section className="bg-cream-100 rounded-3xl border border-[#E7DFD5] p-6 sm:p-10 space-y-8">
        <div>
          <Badge variant="amber">Impact & Value Calculator</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
            Calculate Your Organization&apos;s Annual Rescue Impact
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            See the social, environmental, and tax-saving advantages of donating your kitchen surplus through LastPlate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700">Estimated Surplus Portions Per Week:</span>
                <span className="font-mono text-forest-900 font-bold text-sm">{weeklyPortions} portions</span>
              </div>
              <input
                type="range"
                min="20"
                max="1000"
                step="10"
                value={weeklyPortions}
                onChange={(e) => setWeeklyPortions(parseInt(e.target.value))}
                className="w-full accent-forest-800"
              />
              <div className="flex justify-between text-[11px] text-stone-500">
                <span>Small Cafe (20)</span>
                <span>Medium Restaurant (150)</span>
                <span>Hotel / Canteen (1000)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-stone-700">Average Cost of Goods per Portion ($):</span>
                <span className="font-mono text-forest-900 font-bold text-sm">${avgPortionValue.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="15.0"
                step="0.5"
                value={avgPortionValue}
                onChange={(e) => setAvgPortionValue(parseFloat(e.target.value))}
                className="w-full accent-forest-800"
              />
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-1 text-xs text-stone-600">
              <p className="font-bold text-stone-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-forest-700" />
                Automated End-of-Month Tax Receipts
              </p>
              <p>
                Every completed donation generates an IRS / tax-compliant receipt with recipient EIN, exact itemized weight, and timestamped delivery confirmation.
              </p>
            </div>

          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-1">
              <span className="text-xs text-stone-500 block uppercase font-bold tracking-wide">Annual Meals Provided</span>
              <p className="text-3xl font-extrabold text-forest-900 font-serif">
                {annualMeals.toLocaleString()}
              </p>
              <p className="text-[11px] text-stone-500">Nourishing local families through verified community kitchens.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-1">
              <span className="text-xs text-stone-500 block uppercase font-bold tracking-wide">CO₂e Diverted</span>
              <p className="text-3xl font-extrabold text-emerald-700 font-serif">
                {(annualCO2AvoidedKg / 1000).toFixed(1)} t
              </p>
              <p className="text-[11px] text-stone-500">Organic landfill methane prevention credit.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-1 sm:col-span-2">
              <span className="text-xs text-stone-500 block uppercase font-bold tracking-wide">Estimated Annual Tax Deduction Basis</span>
              <p className="text-3xl font-extrabold text-amberGold-700 font-serif">
                ${annualTaxDeduction.toLocaleString()}
              </p>
              <p className="text-[11px] text-stone-500">
                Calculated on enhanced IRC Section 170(e)(3) basis for corporate and commercial food donations.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* DONOR FAQS */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="stone">Food Safety & FAQ</Badge>
          <h2 className="font-serif text-3xl font-bold text-forest-950">
            Frequently Asked Questions by Food Donors
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {donorFaqs.map((faq, idx) => (
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

      {/* CTA */}
      <div className="rounded-3xl bg-forest-900 text-white p-8 sm:p-12 text-center space-y-4 shadow-soft">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold">
          Ready to turn excess food into community impact?
        </h3>
        <p className="text-xs sm:text-sm text-forest-200 max-w-xl mx-auto">
          Join dozens of restaurants, caterers, and bakeries in our metro launch area. Registration takes less than 2 minutes.
        </p>
        <div className="pt-2">
          <Button variant="accent" size="lg" onClick={() => onOpenAuth('donor')}>
            Create Food Donor Account
          </Button>
        </div>
      </div>

    </div>
  );
};
