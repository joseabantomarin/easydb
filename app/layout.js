import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "EasyDB",
  description: "Crea y gestiona bases de datos de forma simple",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="bg-blue-600 text-white px-4 sm:px-6 py-3 sm:py-4 shadow">
          <a href="/" className="text-lg sm:text-xl font-bold">EasyDB</a>
        </header>
        <main className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full min-w-0">{children}</main>
      </body>
    </html>
  );
}
