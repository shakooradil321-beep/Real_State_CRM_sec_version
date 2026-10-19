import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { AppProviders } from '@/components/app/AppProviders';

import '../src/index.css';

export const metadata: Metadata = {
  title: 'DealFlow',
  description: 'Mobile-first Karachi real estate CRM for pipeline, follow-ups, and agency workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
