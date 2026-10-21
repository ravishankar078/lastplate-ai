import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  UtensilsCrossed, 
  HeartHandshake, 
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Button } from './Button';

export interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: 'donor' | 'ngo' | 'volunteer') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenAuth,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'donors', label: 'For Donors' },
    { id: 'ngos', label: 'For NGOs' },
    { id: 'volunteers', label: 'For Volunteers' },
    { id: 'impact', label: 'About & Impact' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo and Brand */}
          <button 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 text-left group focus:outline-none"
            aria-label="LastPlate Home"
          >
            <div className="w-11 h-11 rounded-xl bg-forest-800 flex items-center justify-center text-white shadow-soft group-hover:bg-forest-700 transition-colors">
              <UtensilsCrossed className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-2xl font-bold tracking-tight text-forest-900">
                  LastPlate
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-amberGold-600"></span>
              </div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider hidden sm:block">
                Surplus Food Rescue
              </p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-forest-900 bg-forest-100/70 font-semibold'
                      : 'text-stone-600 hover:text-forest-900 hover:bg-stone-200/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => onOpenAuth()}
              className="text-sm font-semibold text-stone-700 hover:text-forest-900 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-forest-700" />
              Sign In
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onOpenAuth('donor')}
              leftIcon={<HeartHandshake className="w-4 h-4 text-emerald-300" />}
            >
              Donate Surplus Food
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenAuth('donor')}
            >
              Donate
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-700 hover:bg-stone-200/60 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-stone-200 bg-[#FAF8F5] px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-soft-lg">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-forest-100 text-forest-900 font-semibold'
                      : 'text-stone-700 hover:bg-stone-200/50'
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-forest-700' : 'text-stone-400'}`} />
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-stone-200 flex flex-col gap-2.5">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
            >
              Log In to Portal
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('donor')}
              }
              leftIcon={<HeartHandshake className="w-4 h-4 text-emerald-300" />}
            >
              Donate Surplus Food
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-stone-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
              Verified safety & legal compliance for all food donations
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
