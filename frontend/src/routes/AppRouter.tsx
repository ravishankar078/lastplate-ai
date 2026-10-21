import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AuthModal } from '../components/modals/AuthModal';

import { HomePage } from '../pages/HomePage';
import { HowItWorksPage } from '../pages/HowItWorksPage';
import { ForDonorsPage } from '../pages/ForDonorsPage';
import { ForNGOsPage } from '../pages/ForNGOsPage';
import { ForVolunteersPage } from '../pages/ForVolunteersPage';
import { AboutImpactPage } from '../pages/AboutImpactPage';
import { ContactPage } from '../pages/ContactPage';

import { DonorPortalView } from '../pages/portal/DonorPortalView';
import { NGOPortalView } from '../pages/portal/NGOPortalView';
import { VolunteerPortalView } from '../pages/portal/VolunteerPortalView';
import { AdminPortalView } from '../pages/portal/AdminPortalView';
import { UserRole } from '../types';

export const AppRouter: React.FC = () => {
  const { role, isAuthenticated, login } = useAuth();

  const [currentHash, setCurrentHash] = useState<string>(() => {
    return window.location.hash || '#/home';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole>('donor');
  const [dashboardSection, setDashboardSection] = useState('overview');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/home';
      setCurrentHash(hash);
    };

    window.addEventListener('popstate', handleHashChange);
    return () => window.removeEventListener('popstate', handleHashChange);
  }, []);

  const navigateTo = (path: string) => {
    const targetHash = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
    window.location.hash = targetHash;
    setCurrentHash(targetHash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (targetRole: UserRole = 'donor') => {
    setAuthModalRole(targetRole);
    setAuthModalOpen(true);
  };

  // Check if current route is a portal route
  const isPortalRoute = currentHash.startsWith('#/portal');

  // If user visits a portal route without being authenticated, automatically authenticate with default role for seamless testing
  useEffect(() => {
    if (isPortalRoute && !isAuthenticated) {
      login('donor');
    }
  }, [isPortalRoute, isAuthenticated, login]);

  // If user is inside portal, render DashboardLayout
  if (isPortalRoute) {
    const renderPortalContent = () => {
      switch (role) {
        case 'ngo':
          return <NGOPortalView />;
        case 'volunteer':
          return <VolunteerPortalView />;
        case 'admin':
          return <AdminPortalView />;
        case 'donor':
        default:
          return <DonorPortalView />;
      }
    };

    return (
      <>
        <DashboardLayout
          currentSection={dashboardSection}
          onNavigateSection={(sec) => setDashboardSection(sec)}
          onNavigateToPublic={() => navigateTo('#/home')}
        >
          {renderPortalContent()}
        </DashboardLayout>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialRole={authModalRole}
        />
      </>
    );
  }

  // Otherwise, render PublicLayout
  const publicPageId = currentHash.replace('#/', '').replace('#', '') || 'home';

  const renderPublicPage = () => {
    switch (publicPageId) {
      case 'how-it-works':
        return <HowItWorksPage onNavigate={(p) => navigateTo(`#/${p}`)} onOpenAuth={handleOpenAuth} />;
      case 'donors':
        return <ForDonorsPage onNavigate={(p) => navigateTo(`#/${p}`)} onOpenAuth={handleOpenAuth} />;
      case 'ngos':
        return <ForNGOsPage onNavigate={(p) => navigateTo(`#/${p}`)} onOpenAuth={handleOpenAuth} />;
      case 'volunteers':
        return <ForVolunteersPage onNavigate={(p) => navigateTo(`#/${p}`)} onOpenAuth={handleOpenAuth} />;
      case 'impact':
        return <AboutImpactPage onNavigate={(p) => navigateTo(`#/${p}`)} onOpenAuth={handleOpenAuth} />;
      case 'contact':
        return <ContactPage />;
      case 'home':
      default:
        return <HomePage onNavigate={(p) => navigateTo(`#/${p}`)} onOpenAuth={handleOpenAuth} />;
    }
  };

  return (
    <>
      <PublicLayout
        currentPage={publicPageId}
        onNavigate={(p) => navigateTo(`#/${p}`)}
        onOpenAuth={handleOpenAuth}
      >
        {renderPublicPage()}
      </PublicLayout>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authModalRole}
      />
    </>
  );
};
