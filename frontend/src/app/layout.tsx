import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ClerkProviderClient } from "@/components/clerk-provider";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "TalentStreamAI — Land Interviews, Not Rejections",
    description:
        "AI-powered career co-pilot: tailored resumes, cover letters, and match scores in seconds.",
    keywords: [
        "CV optimizer",
        "ATS score",
        "cover letter",
        "job application",
        "interview prep",
    ],
    openGraph: {
        title: "TalentStreamAI — Land Interviews, Not Rejections",
        description:
            "AI-powered CV optimization that gets you interviews. Tailored CVs, cover letters, and interview prep in under 60 seconds.",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} antialiased`}>
                <ClerkProviderClient>
                    <Providers>{children}</Providers>
                </ClerkProviderClient>
            </body>
        </html>
    );
}
