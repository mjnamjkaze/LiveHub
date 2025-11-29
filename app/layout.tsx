import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "LiveHub - Livestream Platform",
    description: "Stream and watch live videos with real-time chat and interactions",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
