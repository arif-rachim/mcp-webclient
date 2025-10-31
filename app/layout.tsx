import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP WebClient",
  description: "AI-powered chat with MCP protocol support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
