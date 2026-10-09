import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axlori City · District Life",
  description: "Walk, work, build a home and find your story in an original Nigerian-inspired third-person 3D district.",
  applicationName: "Axlori City",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Axlori City" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#202329",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
