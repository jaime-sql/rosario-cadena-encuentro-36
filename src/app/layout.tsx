import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { EventoPie } from "@/components/evento-rango";
import { SiteHeader } from "@/components/site-header";
import { EVENT_GROUP, EVENT_PARISH, EVENT_TITLE } from "@/lib/event";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: EVENT_TITLE,
  description: `Inscripción de turnos para el Rosario en Cadena. ${EVENT_PARISH}, ${EVENT_GROUP}.`,
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-primary/20 px-4 py-6 text-center text-xs text-muted-foreground">
          {EVENT_PARISH} · {EVENT_GROUP} · <EventoPie />
        </footer>
      </body>
    </html>
  );
}
