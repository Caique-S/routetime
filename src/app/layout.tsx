import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Route-Time",
  description: "RouteTime Tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
