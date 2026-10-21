import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  HeartHandshake, 
  Bike, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../../types';
import { Button } from '../common/Button';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
  initialMode?: 'signin' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'donor',
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('100');

  useEffect(() => {
    setRole(initialRole);
    setMode(initialMode);
    setStatusMessage(null);
  }, [initialRole, initialMode, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleQuickDemoFill = (targetRole: UserRole) => {
    setRole(targetRole);
    if (targetRole === 'donor') {
      setEmail('chef.maya@grandbistro.com');
      setPassword('DonorPass123!');
      setOrgName('The Grand Heritage Bistro');
      setContactName('Chef Maya Lin');
      setPhone('+1 (555) 392-8172');
      setAddress('450 West Elm Street, Food Arts District');
    } else if (targetRole === 'ngo') {
      setEmail('intake@hopecommunityshelter.org');
      setPassword('NgoPass123!');
      setOrgName('Hope Community Shelter & Kitchen');
      setContactName('Rev. Marcus Vance');
      setPhone('+1 (555) 728-4901');
      setAddress('124 Hope Lane, North End');
      setCapacity('250');
    } else if (targetRole === 'volunteer') {
      setEmail('alex.rivera.courier@gmail.com');
      setPassword('VolunteerPass123!');
      setOrgName('Independent Courier');
      setContactName('Alex Rivera');
      setPhone('+1 (555) 819-2041');
      setAddress('78 Maple Avenue, Central');
    }
    setStatusMessage(`Loaded sample demo credentials for ${targetRole.toUpperCase()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      setStatusMessage(
        `Simulation: Successfully authenticated as ${role.toUpperCase()} (${email || 'demo@lastplate.org'}). Full JWT token exchange connects in Phase 5!`
      );
    } else {
      setStatusMessage(
        `Registration submitted for "${orgName || contactName}"! Verification review queued for Admin authorization.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-soft-xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        
        {/* Header with Title & Tabs */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 bg-[#FAF8F5]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 id="modal-headline" className="font-serif text-2xl font-bold text-forest-900">
                {mode === 'signin' ? 'Welcome Back to LastPlate' : 'Join the Rescue Platform'}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Safe, verified surplus food rescue coordination
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-stone-200/60 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('signin'); setStatusMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'signin' ? 'bg-white text-forest-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sign In to Account
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setStatusMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'register' ? 'bg-white text-forest-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Register Organization / Volunteer
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Quick Demo Pre-fill Toolbar */}
          <div className="p-3 rounded-xl bg-[#F5EFEB] border border-[#E5DFD7] space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-stone-700">
              <span className="flex items-center gap-1.5 text-forest-800 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amberGold-600" />
                Quick Test: Load Demo Persona
              </span>
              <span className="text-[11px] text-stone-500">One-click test fill</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('donor')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left transition-colors flex items-center gap-1.5 ${
                  role === 'donor' 
                    ? 'bg-forest-800 text-white border-forest-900' 
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Grand Bistro (Donor)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('ngo')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left transition-colors flex items-center gap-1.5 ${
                  role === 'ngo' 
                    ? 'bg-forest-800 text-white border-forest-900' 
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Hope Shelter (NGO)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('volunteer')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-left transition-colors flex items-center gap-1.5 ${
                  role === 'volunteer' 
                    ? 'bg-forest-800 text-white border-forest-900' 
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Bike className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Alex R. (Courier)</span>
              </button>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('donor')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'donor'
                    ? 'border-forest-700 bg-forest-50/70 text-forest-900 ring-1 ring-forest-700'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                <Building2 className={`w-5 h-5 mb-1.5 ${role === 'donor' ? 'text-forest-700' : 'text-stone-400'}`} />
                <p className="text-xs font-bold">Food Donor</p>
                <p className="text-[10px] text-stone-500">Restaurant, Bakery, Canteen</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('ngo')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'ngo'
                    ? 'border-forest-700 bg-forest-50/70 text-forest-900 ring-1 ring-forest-700'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                <HeartHandshake className={`w-5 h-5 mb-1.5 ${role === 'ngo' ? 'text-forest-700' : 'text-stone-400'}`} />
                <p className="text-xs font-bold">NGO / Kitchen</p>
                <p className="text-[10px] text-stone-500">Shelter, Community Pantry</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('volunteer')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  role === 'volunteer'
                    ? 'border-forest-700 bg-forest-50/70 text-forest-900 ring-1 ring-forest-700'
                    : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
              >
                <Bike className={`w-5 h-5 mb-1.5 ${role === 'volunteer' ? 'text-forest-700' : 'text-stone-400'}`} />
                <p className="text-xs font-bold">Volunteer</p>
                <p className="text-[10px] text-stone-500">Collection & Delivery Courier</p>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      {role === 'volunteer' ? 'Full Legal Name' : 'Organization Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={role === 'volunteer' ? 'Jane Doe' : 'e.g. Hearthside Bistro'}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      {role === 'volunteer' ? 'Mobile Phone' : 'Primary Contact Person'}
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={role === 'volunteer' ? '+1 (555) 000-0000' : 'Manager / Chef Name'}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Physical Address / Location
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, City, Postal Code"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                    />
                  </div>
                </div>

                {role === 'ngo' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Daily Meal Capacity / Storage Capacity (meals/day)
                    </label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      min="10"
                      max="2000"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                    />
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.org"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest-700"
                />
              </div>
            </div>

            {/* Notification message */}
            {statusMessage && (
              <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {mode === 'signin' ? `Sign In as ${role.toUpperCase()}` : 'Submit for Administrator Verification'}
              </Button>
            </div>
          </form>

          {/* Safe harbor & Verification Notice */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-stone-700">
              <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
              Food Safety & Verification Policy
            </div>
            <p>
              All organization accounts undergo strict verification. Food handling guidelines and digital QR/PIN verification protect donors and beneficiaries under applicable Good Samaritan protections.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
