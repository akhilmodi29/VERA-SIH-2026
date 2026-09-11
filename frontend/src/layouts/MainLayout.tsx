import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Users, 
  FileText,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#070b14] text-gray-200 font-sans overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0a101d] border-b border-[#1a2333] z-30">
        <div className="flex items-center">
          <ShieldCheck className="w-6 h-6 text-blue-500 mr-2" />
          <div className="text-sm font-bold text-white tracking-widest">VERA</div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-400 hover:text-white focus:outline-none"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-[#0a101d] border-r border-[#1a2333] flex flex-col z-30 h-full`}>
        <div className="p-6">
          <nav className="space-y-2 md:mt-4">
            <NavItem to="/" icon={<Home size={18} />} label="Dashboard" exact />
            <NavItem to="/sessions" icon={<Clock size={18} />} label="Sessions" />
            <NavItem to="/voice-profiles" icon={<Users size={18} />} label="Voice Profiles" />
            <NavItem to="/evidence" icon={<FileText size={18} />} label="Evidence" />
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
