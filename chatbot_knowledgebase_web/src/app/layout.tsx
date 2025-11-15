import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";

// Temporarily use system fonts due to network connectivity issues
// const inter = Inter({
//   subsets: ['latin'],
//   display: 'swap',
//   fallback: ['system-ui', 'arial']
// })

// Use system fonts as fallback
const inter = {
  className: ''
}

export const metadata: Metadata = {
  title: "Chatbot",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className}  antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
