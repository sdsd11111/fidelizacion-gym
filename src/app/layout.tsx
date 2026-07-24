import type { Metadata } from "next";
import { Montserrat, Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  title: "ALL-crm — Plataforma de Fidelización & Retención",
  description: "Plataforma Inteligente de Fidelización, Comisiones por Referidos y Evaluaciones para Gimnasios y Tiendas Retail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${inter.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#0B0C10] text-[#FFFFFF]">{children}</body>
    </html>
  );
}
