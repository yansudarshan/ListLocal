'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  ShoppingBag,
  Mic,
  Receipt,
  Swords,
  Layers,
  BookOpen,
  ShieldCheck,
  Menu,
  X,
  Compass,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/new', label: 'New Listing', icon: Sparkles },
  { href: '/library', label: 'Library', icon: ShoppingBag },
  { href: '/voice', label: 'Voice Studio', icon: Mic },
  { href: '/receipts', label: 'Receipts & Costs', icon: Receipt },
  { href: '/arena', label: 'Model Arena', icon: Swords },
  { href: '/batch', label: 'Batch Mode', icon: Layers },
  { href: '/glossary', label: 'Glossary', icon: BookOpen },
  { href: '/privacy', label: 'Privacy Proof', icon: ShieldCheck },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
              ListLocal
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-medium border border-emerald-200">
              LOCAL-FIRST
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right action / Setup Wizard */}
        <div className="flex items-center gap-2">
          <Link
            href="/wizard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white border border-slate-200/90 shadow-xs transition-all"
            title="First-run Setup Wizard"
          >
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Setup Wizard</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 space-y-1 shadow-md">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

export default Navbar;
