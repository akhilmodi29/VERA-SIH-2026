import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Users, 
  FileText,
  ShieldCheck,
  Phone
} from 'lucide-react';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-[100dvh] bg-[#070b14] text-gray-200 font-sans overflow-hidden flex-col md:flex-row">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-[#0a101d] border-r border-[#1a2333] flex-col z-20 shrink-0">
        <div className="p-6">
          <nav className="space-y-2 mt-4">
            <NavItem to="/" icon={<Home size={18} />} label="Dashboard" exact />
            <NavItem to="/sessions" icon={<Clock size={18} />} label="Sessions" />
            <NavItem to="/voice-profiles" icon={<Users size={18} />} label="Voice Profiles" />
            <NavItem to="/evidence" icon={<FileText size={18} />} label="Evidence" />
            <NavItem to="/demo-call" icon={<Phone size={18} />} label="Demo Call" />
          </nav>
        </div>

        <div className="mt-auto p-6 flex items-center">
          <ShieldCheck className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <div className="text-sm font-bold text-white tracking-widest">VERA</div>
            <div className="text-[10px] text-gray-500">Detect • Verify • Protect</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#070b14] overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden flex bg-[#0a101d] border-t border-[#1a2333] justify-around items-center p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 shrink-0">
        <MobileNavItem to="/" icon={<Home size={20} />} label="Dash" exact />
        <MobileNavItem to="/sessions" icon={<Clock size={20} />} label="Sessions" />
        <MobileNavItem to="/demo-call" icon={<Phone size={20} />} label="Demo" />
      </nav>
    </div>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, exact }) => (
  <NavLink
    to={to}
    end={exact}
    className={({ isActive }) =>
      `flex items-center px-4 py-3 rounded-lg transition-all duration-300 ${
        isActive 
          ? 'bg-[#121d30] text-blue-400 font-medium' 
          : 'text-gray-400 hover:bg-[#121d30]/50 hover:text-gray-300'
      }`
    }
  >
    {icon}
    <span className="ml-3 text-sm">{label}</span>
  </NavLink>
);

export default MainLayout;

const MobileNavItem: React.FC<NavItemProps> = ({ to, icon, label, exact }) => (
  <NavLink
    to={to}
    end={exact}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
        isActive 
          ? 'text-blue-400' 
          : 'text-gray-500 hover:text-gray-300'
      }`
    }
  >
    {icon}
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </NavLink>
);
