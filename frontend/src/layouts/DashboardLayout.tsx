import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  LayoutDashboard, 
  PlusCircle, 
  Package, 
  FileText, 
  Compass, 
  Truck, 
  Settings, 
  MapPin, 
  CheckSquare, 
  ShieldCheck, 
  Users, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  currentSection: string;
  onNavigateSection: (section: string) => void;
  onNavigateToPublic: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentSection,
  onNavigateSection,
  onNavigateToPublic,
}) => {
  const { user, role, switchRole, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Navigation schema per role
  const roleNavItems: Record<UserRole, { id: string; label: string; icon: React.ReactNode }[]> = {
    donor: [
      { id: 'overview', label: 'Donor Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'create', label: 'Post Surplus Food', icon: <PlusCircle className="w-4 h-4 text-emerald-500" /> },
      { id: 'active', label: 'Active Donations', icon: <Package className="w-4 h-4" /> },
      { id: 'history', label: 'Donation History & Tax', icon: <FileText className="w-4 h-4" /> },
    ],
    ngo: [
      { id: 'overview', label: 'Kitchen Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'discover', label: 'Available Matches', icon: <Compass className="w-4 h-4 text-amber-500" /> },
      { id: 'incoming', label: 'Incoming Deliveries', icon: <Truck className="w-4 h-4" /> },
      { id: 'settings', label: 'Capacity & Filters', icon: <Settings className="w-4 h-4" /> },
    ],
    volunteer: [
      { id: 'overview', label: 'Courier Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'route', label: 'Optimized Route (OR-Tools)', icon: <MapPin className="w-4 h-4 text-emerald-500" /> },
      { id: 'jobs', label: 'Active Assignments', icon: <CheckSquare className="w-4 h-4" /> },
      { id: 'history', label: 'Completed Deliveries', icon: <History className="w-4 h-4" /> },
    ],
    admin: [
      { id: 'overview', label: 'Operations Command', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'organizations', label: 'Organization Verification', icon: <Users className="w-4 h-4" /> },
      { id: 'safety', label: 'Safety Holds & Triage', icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
      { id: 'audit', label: 'Audit Trail & Analytics', icon: <ShieldCheck className="w-4 h-4" /> },
    ],
  };

  const navItems = roleNavItems[role] || roleNavItems.donor;

  const roleColorMap: Record<UserRole, { badge: string; label: string }> = {
    donor: { badge: 'bg-emerald-100 text-emerald-900 border-emerald-200', label: 'Food Donor' },
    ngo: { badge: 'bg-amberGold-100 text-amberGold-900 border-amberGold-200', label: 'Recipient NGO' },
    volunteer: { badge: 'bg-forest-100 text-forest-900 border-forest-200', label: 'Volunteer Courier' },
    admin: { badge: 'bg-purple-100 text-purple-900 border-purple-200', label: 'System Administrator' },
  };

  const handleNav = (sectionId: string) => {
    onNavigateSection(sectionId);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5EFEB] flex flex-col antialiased text-stone-800">
      
      {/* TOP PORTAL BAR */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/90 h-16 flex items-center justify-between px-4 sm:px-6">
        
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-200/60"
            aria-label="Toggle navigation menu"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={onNavigateToPublic}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-forest-800 flex items-center justify-center text-white shadow-soft">
              <UtensilsCrossed className="w-5 h-5 text-emerald-300" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-forest-950 hidden sm:inline">
              LastPlate
            </span>
          </button>

          <span className="text-stone-300 hidden sm:inline">/</span>

          {/* Role Badge */}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleColorMap[role].badge}`}>
            {roleColorMap[role].label}
          </span>
        </div>

        {/* Right: Role Switcher & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          
          {/* Quick Demo Role Switcher */}
          <div className="hidden md:flex items-center gap-1.5 p-1 bg-stone-200/70 rounded-xl text-xs font-medium">
            <span className="text-[11px] text-stone-500 px-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amberGold-600" />
              Role:
            </span>
            {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2 py-1 rounded-lg capitalize transition-colors ${
                  role === r
                    ? 'bg-white text-forest-900 font-bold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-stone-600 hover:bg-stone-200/60 relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amberGold-600 ring-2 ring-white"></span>
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-soft-xl border border-stone-200 p-4 space-y-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    System Alerts ({role.toUpperCase()})
                  </h5>
                  <span className="text-[10px] text-forest-700 font-medium">Mock Events</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-forest-50 border border-forest-100 space-y-1">
                    <p className="font-bold text-forest-900">Stage 2 AI Match Recommended</p>
                    <p className="text-[11px] text-stone-600">Surplus batch resc-01 recommended with 92% match score.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amberGold-50 border border-amberGold-100 space-y-1">
                    <p className="font-bold text-amberGold-900">Collection Window Closing</p>
                    <p className="text-[11px] text-stone-600">Hot holding window for Bistro Dal closes in 42 minutes.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
            <div className="w-8 h-8 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-xs">
              {user?.fullName?.split(' ').map((n) => n[0]).join('') || 'LP'}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <p className="font-bold text-stone-900 leading-none">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-stone-500 leading-none mt-1 truncate max-w-[120px]">
                {user?.organizationName || 'Verified Portal'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 ml-1 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </header>

      {/* BODY WITH SIDEBAR & MAIN */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#FAF8F5] border-r border-stone-200/90 p-4 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3">
              Portal Navigation
            </span>
            <nav className="space-y-1 pt-1">
              {navItems.map((item) => {
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-forest-800 text-white shadow-soft'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                    }`}
                  >
                    <span className={isActive ? 'text-emerald-300' : 'text-stone-500'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto pt-4 border-t border-stone-200/80 space-y-2">
            <button
              onClick={onNavigateToPublic}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-stone-600 hover:bg-stone-200/50 font-medium transition-colors"
            >
              <span>Back to Public Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
            </button>
            <div className="p-3 rounded-xl bg-cream-100 text-[11px] text-stone-500 space-y-1 border border-stone-200">
              <span className="font-semibold text-stone-700 block">Good Food Promise</span>
              <p>All activities are subject to food safety audits and temperature logs.</p>
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWER */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 bg-[#FAF8F5] p-5 flex flex-col space-y-6 shadow-soft-xl z-50">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-serif font-bold text-lg text-forest-950">
                  {roleColorMap[role].label}
                </span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Role Switcher */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Simulate Role:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setMobileSidebarOpen(false);
                      }}
                      className={`p-2 rounded-lg text-xs font-semibold capitalize border ${
                        role === r
                          ? 'bg-forest-800 text-white border-forest-900'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <nav className="space-y-1 pt-2">
                {navItems.map((item) => {
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-forest-800 text-white shadow-soft'
                          : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-emerald-300' : 'text-stone-500'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto pt-4 border-t border-stone-200">
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    onNavigateToPublic();
                  }}
                  className="w-full text-center py-2 text-xs font-semibold text-stone-600 hover:text-forest-900"
                >
                  Return to Public Website
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
};
