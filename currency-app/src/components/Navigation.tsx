'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, Star, List, LogIn, UserPlus, Menu, X, User, LogOut } from 'lucide-react';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/watchlist', label: 'Watchlist', icon: List },
  { href: '/favorites', label: 'Favorites', icon: Star },
];

const authNavItems = [
  { href: '/login', label: 'Login', icon: LogIn },
  { href: '/register', label: 'Register', icon: UserPlus },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = () => {
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      if (userId && userName) {
        setUser({ id: parseInt(userId, 10), name: userName });
      }
    };
    checkUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setUser(null);
    window.location.href = '/';
  };

  const NavLink = ({
    href,
    label,
    icon: Icon,
    isActive,
    onClick,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    isActive: boolean;
    onClick?: () => void;
  }) => (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-white/15 to-white/10 text-white shadow-lg shadow-white/5'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon size={18} className={isActive ? 'text-white' : 'text-white/70'} />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950 backdrop-blur-xl shadow-lg shadow-black/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg p-1.5">
                <Home className="text-white" size={20} />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              Currency Tracker
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {/* Main Navigation */}
            <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1.5 border border-white/10">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={isActive}
                  />
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-white/10 mx-2" />

            {/* Auth Section */}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-400 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/90 hidden lg:inline">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <LogOut size={18} />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {authNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isLogin = item.href === '/login';
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isLogin
                          ? 'bg-white text-slate-900 hover:bg-white/90 shadow-lg'
                          : isActive
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-4 space-y-2">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={isActive}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              );
            })}
            <div className="h-px bg-white/10 my-2" />
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-400 flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-white/60">Logged in</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {authNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isLogin = item.href === '/login';
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isLogin
                          ? 'bg-white text-slate-900 hover:bg-white/90'
                          : isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
