import React from 'react';
import { 
  Bike, 
  QrCode, 
  CheckCircle2, 
  Smartphone, 
  Navigation, 
  Thermometer, 
  HelpCircle,
  Award
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FAQS } from '../data/mockData';
import { UserRole } from '../types';

export interface ForVolunteersPageProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const ForVolunteersPage: React.FC<ForVolunteersPageProps> = ({ onNavigate, onOpenAuth }) => {
  const volunteerFaqs = FAQS.filter(f => f.category === 'volunteers' || f.category === 'safety');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      
      {/* HEADER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-5">
          <Badge variant="forest">Community Courier Logistics</Badge>
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-forest-950 tracking-tight leading-tight">
            Rescue Real Food in Your Neighborhood on Your Own Schedule
          </h1>
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
            Turn a 30-minute bike ride or car trip into a lifesaving food rescue mission. LastPlate gives you optimized collection stops, turn-by-turn guidance, and single-scan QR verifications.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onOpenAuth('volunteer')}
              leftIcon={<Bike className="w-5 h-5 text-emerald-300" />}
            >
              Sign Up as Volunteer Courier
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigate('how-it-works')}
            >
              Explore Route Technology
            </Button>
          </div>
        </div>

        {/* Mobile App Experience Preview Card */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-forest-950 text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-forest-700" />
              The Volunteer Mobile Experience
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Expo & React Native
            </span>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-forest-100 text-forest-800 shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Multi-Stop OR-Tools Route</p>
                <p className="text-stone-500 text-xs">Stops are ordered to minimize travel time and respect food temperature thresholds.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amberGold-100 text-amberGold-800 shrink-0">
                <Thermometer className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Insulated Carrier SOP</p>
                <p className="text-stone-500 text-xs">Simple checklist to verify hot (&gt;65°C) or cold (&lt;4°C) thermal carriers are sealed.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-forest-100 text-forest-800 shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Single-Scan QR / 6-Digit PIN</p>
                <p className="text-stone-500 text-xs">Verify donor collection in 5 seconds. Recipient confirms delivery with reciprocal scan.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-forest-700 shrink-0" />
              Earn verified community service certificates and food rescue milestones.
            </p>
          </div>
        </div>
      </div>

      {/* TYPICAL 30-MINUTE RESCUE MISSION WALKTHROUGH */}
      <section className="bg-cream-100 rounded-3xl border border-[#E7DFD5] p-6 sm:p-10 space-y-8">
        <div>
          <Badge variant="amber">Volunteer Lifecycle</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
            What a 35-Minute Rescue Mission Looks Like
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Designed to fit around your daily commute, lunch break, or free evening window.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-2">
            <span className="text-xs font-bold text-amberGold-700">Minute 00 &bull; Job Push</span>
            <h4 className="font-bold text-stone-900 text-sm">Accept Mission</h4>
            <p className="text-xs text-stone-600">
              Notification arrives: 40 meals ready at Bistro on Elm St. You review the pickup window and tap Accept.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-2">
            <span className="text-xs font-bold text-forest-700">Minute 12 &bull; Arrival at Donor</span>
            <h4 className="font-bold text-stone-900 text-sm">Scan QR at Handover</h4>
            <p className="text-xs text-stone-600">
              Kitchen staff hand you sealed inserts in thermal bags. Scan the donor QR code to lock in the pickup timestamp.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-2">
            <span className="text-xs font-bold text-forest-700">Minute 24 &bull; En Route</span>
            <h4 className="font-bold text-stone-900 text-sm">Follow Optimized Route</h4>
            <p className="text-xs text-stone-600">
              In-app navigation directs you along verified bike paths or roads directly to St. Jude Youth Kitchen.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft space-y-2">
            <span className="text-xs font-bold text-emerald-700">Minute 35 &bull; Handover Complete</span>
            <h4 className="font-bold text-stone-900 text-sm">Kitchen Scans Delivery</h4>
            <p className="text-xs text-stone-600">
              Shelter staff verify temperature and enter single-use PIN. 40 meals logged as delivered to dinner service!
            </p>
          </div>
        </div>
      </section>

      {/* VOLUNTEER ONBOARDING CHECKLIST */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="stone">Safety First</Badge>
          <h2 className="font-serif text-3xl font-bold text-forest-950">
            Volunteer Onboarding Requirements
          </h2>
          <p className="text-stone-600 text-sm">
            Simple, rigorous preparation to ensure public health and food safety standards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-2">
            <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-stone-900 text-sm">1. ID & Basic Background</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Verify valid ID and contact info. For motor vehicle deliveries, valid driver&apos;s license and insurance.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-2">
            <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-stone-900 text-sm">2. 15-Min Food Safety Video</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Short interactive module on cross-contamination prevention, thermal carrier sealing, and contactless handover.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-2">
            <div className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center text-forest-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-stone-900 text-sm">3. Insulated Bag Kit</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Pick up an official LastPlate insulated food rescue carrier from your nearest local community hub or partner kitchen.
            </p>
          </div>
        </div>
      </section>

      {/* FAQS */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="stone">Courier FAQ</Badge>
          <h2 className="font-serif text-3xl font-bold text-forest-950">
            Frequently Asked Questions by Volunteers
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {volunteerFaqs.map((faq, idx) => (
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
          Deliver Good Food to Those Who Need It Most
        </h3>
        <p className="text-xs sm:text-sm text-forest-200 max-w-xl mx-auto">
          Sign up today and complete your first rescue in your neighborhood.
        </p>
        <div className="pt-2">
          <Button variant="accent" size="lg" onClick={() => onOpenAuth('volunteer')}>
            Start Volunteering as a Courier
          </Button>
        </div>
      </div>

    </div>
  );
};
