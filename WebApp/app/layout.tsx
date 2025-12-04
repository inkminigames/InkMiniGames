import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const robotoMono = Roboto_Mono({
  weight: ['400', '500', '700'],
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: "Ink Mini Games - Exclusively on Ink",
  description: "A collection of fun, competitive mini games on Ink blockchain. Play, compete, and climb the leaderboards!",
  icons: {
    icon: '/ink_mini_games_filled_logo.png',
    apple: '/ink_mini_games_filled_logo.png',
  },
  openGraph: {
    title: "Ink Mini Games - Exclusively on Ink",
    description: "A collection of fun, competitive mini games on Ink blockchain. Play, compete, and climb the leaderboards!",
    images: ['/ink_mini_games_wallpaper.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ink Mini Games - Exclusively on Ink",
    description: "A collection of fun, competitive mini games on Ink blockchain. Play, compete, and climb the leaderboards!",
    images: ['/ink_mini_games_wallpaper.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
