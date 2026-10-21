import React from 'react';
import { 
  UtensilsCrossed, 
  ShieldCheck, 
  Heart, 
  MapPin, 
  Mail, 
  PhoneCall, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export interface FooterProps {
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: 'donor' | 'ngo' | 'volunteer') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAuth }) => {
  const handleNav = (page: string) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-forest-950 text-stone-300 border-t border-forest-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-forest-900/80">
          
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center text-white shadow-soft">
                <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-white">
                LastPlate
              </span>
            </div>

            <p className="text-stone-300 text-sm leading-relaxed max-w-sm">
              An operational surplus food rescue platform connecting verified food donors with local NGOs, community kitchens, and volunteer logistics before safe consumption windows expire.
            </p>

            <div className="p-3.5 rounded-xl bg-forest-900/60 border border-forest-800/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wide uppercase">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Operational Promise
              </div>
              <p className="text-xs text-stone-300 italic">
                &ldquo;Good Food Deserves a Second Chance.&rdquo;
              </p>
              <p className="text-[11px] text-stone-400 leading-normal">
                LastPlate is NOT a commercial food marketplace or on-demand delivery app. We exclusively operate time-critical rescue missions.
              </p>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNav('home')} className="hover:text-emerald-400 transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('how-it-works')} className="hover:text-emerald-400 transition-colors">
                  How Matching Works
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('donors')} className="hover:text-emerald-400 transition-colors">
                  For Food Donors
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('ngos')} className="hover:text-emerald-400 transition-colors">
                  For NGOs & Kitchens
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('volunteers')} className="hover:text-emerald-400 transition-colors">
                  For Volunteer Couriers
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('impact')} className="hover:text-emerald-400 transition-colors">
                  Impact & Methodology
                </button>
              </li>
            </ul>
          </div>

          {/* Safety & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Safety & Standards
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li className="flex items-center gap-1.5 text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Good Samaritan Liability</span>
              </li>
              <li className="flex items-center gap-1.5 text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strict Hot/Cold Chain SOP</span>
              </li>
              <li className="flex items-center gap-1.5 text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>QR/PIN Handover Proof</span>
              </li>
              <li className="flex items-center gap-1.5 text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Commercial Resale</span>
              </li>
              <li className="pt-2">
                <button 
                  onClick={() => handleNav('contact')} 
                  className="text-amberGold-400 hover:text-amberGold-300 text-xs font-medium underline underline-offset-2 flex items-center gap-1"
                >
                  Report Food Safety Incident <ExternalLink className="w-3 h-3" />
                </button>
              </li>
            </ul>
          </div>

          {/* Portal Access & Local Hub */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Community Hub
            </h4>
            <div className="space-y-2 text-xs text-stone-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Metro Central Rescue Zone 1 (Initial Launch Area)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>rescue@lastplate.org</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+1 (800) 527-8752 (24/7 Dispatch)</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => onOpenAuth()}
                className="w-full text-center py-2 px-3 rounded-lg bg-forest-900 hover:bg-forest-800 text-emerald-300 border border-forest-700 text-xs font-semibold transition-colors"
              >
                Access Account Portals
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} LastPlate Rescue Initiative. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => handleNav('contact')} className="hover:text-stone-300">
              Privacy Policy
            </button>
            <button onClick={() => handleNav('contact')} className="hover:text-stone-300">
              Terms of Food Safety
            </button>
            <span className="flex items-center gap-1 text-stone-400">
              Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for Zero Hunger
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
