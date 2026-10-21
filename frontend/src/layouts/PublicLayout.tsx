import React from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { DemoBanner } from '../components/common/DemoBanner';
import { UserRole } from '../types';

export interface PublicLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenAuth: (role?: UserRole) => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  onOpenAuth,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-800 antialiased selection:bg-forest-800 selection:text-white">
      {/* Demonstration Banner clearly labeling illustrative data */}
      <DemoBanner />

      {/* Main Sticky Header */}
      <Navbar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
      />

      {/* Main Dynamic View */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Global Comprehensive Footer */}
      <Footer
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
};
