import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import ThemeSelector from "@/components/ThemeSelector";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import Script from "next/script";
import "./globals.css";

const elevatia = localFont({
  src: "../../Assets/fonts/Elevatia.ttf",
  variable: "--font-elevatia",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChaosDeck",
  description: "MTG deckbuilder + goldfish-plus playtester",
  appleWebApp: {
    title: "ChaosDeck",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#201913",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${elevatia.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background" style={{ fontFamily: "var(--font-elevatia)" }}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var theme = window.localStorage.getItem("chaosdeck-theme");
                var validThemes = ["default", "default-light", "charcoal", "charcoal-light", "plum", "plum-light", "tide", "tide-light"];
                if (validThemes.indexOf(theme) === -1) return;
                if (theme === "default") {
                  document.documentElement.removeAttribute("data-theme");
                } else {
                  document.documentElement.setAttribute("data-theme", theme);
                }
              } catch (error) {}
            })();
          `}
        </Script>
        <ClerkProvider>
          <ServiceWorkerRegistration />
          <ThemeSelector />
          <main className="min-h-full pt-36 sm:pt-24">
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
