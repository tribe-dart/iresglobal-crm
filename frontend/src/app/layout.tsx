import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crm.iresglobal.com"),
  title: "Ires Global CRM | Earth becomes home",
  description: "Enterprise CRM and client pipeline for Ires Global. Sustainable rammed earth architecture and luxury estate development.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/Ires-icon.png", type: "image/png" },
    ],
    apple: "/Ires-icon.png",
    shortcut: "/Ires-icon.png",
  },
  openGraph: {
    title: "Ires Global CRM | Earth becomes home",
    description: "Enterprise CRM and client pipeline for Ires Global.",
    url: "https://crm.iresglobal.com",
    siteName: "Ires Global CRM",
    images: [
      {
        url: "/Ires-logo.png",
        width: 1200,
        height: 630,
        alt: "Ires Global",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ires Global CRM",
    description: "Enterprise CRM and client pipeline for Ires Global.",
    images: ["/Ires-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/Ires-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/Ires-icon.png" />
        <link rel="shortcut icon" href="/Ires-icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-(--color-bg) text-(--color-text) transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
