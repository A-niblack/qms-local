import React, { useContext, useEffect, useMemo, useState } from 'react';

// Context & roles
import { AppContext, ROLES } from './context/AppContext.jsx';

// Pages
import IncomingInspections from './features/inspections/IncomingInspections';
import Warranty from './features/warranty/Warranty';
import ToolManagement from './features/gages/ToolManagement';
import Reports from './features/reports/Reports';
import InspectionPlans from './features/plans/InspectionPlans';
import PartTypeManagement from './features/admin/PartTypeManagement';
import UserManagement from './features/admin/UserManagement';

// Assets
import pdiLogo from './assets/pdi-logo.png';

// Page keys
const PAGES = {
  PART_INSPECTION: 'part-inspection',
  WARRANTY: 'warranty',
  GAGES: 'gages',
  REPORTS: 'reports',
  PLANS: 'plans',
  PART_TYPES: 'part-types',
  USERS: 'users',
};

// Landing by role
function resolveLandingPageForRole(role) {
  switch (role) {
    case ROLES.warranty_manager:
    case ROLES.WARRANTY_MANAGER:
      return PAGES.WARRANTY;
    case ROLES.inspector:
    case ROLES.engineer:
    case ROLES.admin:
    case ROLES.INSPECTOR:
    case ROLES.ENGINEER:
    case ROLES.ADMIN:
    default:
      return PAGES.PART_INSPECTION;
  }
}

// Top nav links by role
function getNavLinksForRole(role) {
  // Warranty Manager: warranty-centric
  if (role === ROLES.warranty_manager || role === ROLES.WARRANTY_MANAGER) {
    return [
      { key: PAGES.WARRANTY, label: 'Warranty Claims' },
      { key: PAGES.REPORTS, label: 'Warranty Reports' },
    ];
  }

  // Inspector / Engineer / Admin
  const links = [
    { key: PAGES.PART_INSPECTION, label: 'Part Inspection' },
    { key: PAGES.GAGES, label: 'Measuring Gages' },
    { key: PAGES.REPORTS, label: 'QC Reports' },
    { key: PAGES.WARRANTY, label: 'Warranty Claims' },
  ];
  if (role === ROLES.admin || role === ROLES.ADMIN) {
    links.push({ key: PAGES.PLANS, label: 'Inspection Plans' });
    links.push({ key: PAGES.PART_TYPES, label: 'Part Types' });
    links.push({ key: PAGES.USERS, label: 'User Management' });
  }
  return links;
}

export default function App() {
  const { user, loading, logout } = useContext(AppContext) || { user: null, loading: true, logout: () => {} };
  const role = user?.role;

  const [currentPage, setCurrentPage] = useState(() => resolveLandingPageForRole(role));

  const navLinks = useMemo(() => getNavLinksForRole(role), [role]);

  useEffect(() => {
    const landing = resolveLandingPageForRole(role);
    const allowed = new Set(navLinks.map((l) => l.key));
    if (!allowed.has(currentPage)) {
      setCurrentPage(landing);
    }
  }, [role, navLinks, currentPage]);

  const handleNav = (pageKey) => {
    setCurrentPage(pageKey);
  };

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.PART_INSPECTION:
        return <IncomingInspections initialFilter={null} />;
      case PAGES.GAGES:
        return <ToolManagement />;
      case PAGES.REPORTS:
        return <Reports />;
      case PAGES.PLANS:
        return <InspectionPlans />;
      case PAGES.PART_TYPES:
        return <PartTypeManagement />;
      case PAGES.USERS:
        return <UserManagement />;
      case PAGES.WARRANTY:
        return <Warranty />;
      default:
        return <IncomingInspections initialFilter={null} />;
    }
  };

  const TopBar = () => (
    <header className="sticky top-0 z-40 w-full bg-white border-b shadow-sm">
      <div className="max-w-full mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src={pdiLogo} alt="PDI" className="h-12 w-auto" />
            <span className="font-semibold text-lg tracking-tight whitespace-nowrap">Quality Control</span>
          </div>
          
          {/* Center: nav buttons */}
          <div className="flex items-center gap-3 flex-grow justify-center">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNav(link.key)}
                className={[
                  'whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium border transition inline-flex items-center',
                  currentPage === link.key
                    ? 'bg-[#233B6C] text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
                ].join(' ')}
                title={link.label}
              >
                {link.label}
              </button>
            ))}
          </div>
          
          {/* Right: user + logout */}
<div className="flex items-center justify-end gap-4 text-sm text-gray-600 flex-shrink-0 min-w-[250px]">
  {user ? (
    <>
      <span className="truncate">
        <span className="font-medium">{user.displayName || user.email || 'User'}</span>
        {user.role ? <span className="ml-2 text-gray-400">({user.role})</span> : null}
      </span>
      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to log out?')) {
                logout();
                  }
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300"
                >
                Logout
              </button>
          </>
          ) : (
          <span>Not signed in</span>
          )}
          </div>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <TopBar />
      <main className="max-w-7xl w-full mx-auto flex-1 p-4">{renderPage()}</main>
      <footer className="w-full border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 text-[10px] text-gray-500">© {new Date().getFullYear()} QC App</div>
      </footer>
    </div>
  );
}