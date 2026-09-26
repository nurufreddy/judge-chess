import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Judge Chess | How good were your moves?',
  description:
    'Play real-time multiplayer chess. Then find out how good your moves really were with Judge Chess post-game Stockfish analysis.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>♞</text></svg>'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-judge-bg text-judge-text antialiased min-h-screen selection:bg-judge-accent selection:text-judge-bg">
        {children}
      </body>
    </html>
  );
}
