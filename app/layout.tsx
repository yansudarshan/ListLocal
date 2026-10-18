import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import FooterBadge from '@/components/FooterBadge';

export const metadata: Metadata = {
  title: 'ListLocal | Local-First AI E-Commerce Back Office',
  description:
    'A local-first AI back office for small online sellers. Authentic voice listing generation, receipt scanning, true cost per product, and margin-aware pricing powered 100% by local open-weight models.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 flex flex-col min-h-screen selection:bg-emerald-500/20 selection:text-emerald-800">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
        <FooterBadge />
      </body>
    </html>
  );
}
