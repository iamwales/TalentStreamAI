import { CTA } from "@/components/landing/CTA";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LogoBar } from "@/components/landing/LogoBar";
import { Navbar } from "@/components/landing/Navbar";
import { Outputs } from "@/components/landing/Outputs";
import { Pricing } from "@/components/landing/Pricing";
import { Stats } from "@/components/landing/Stats";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <Hero />
      <LogoBar />
      <HowItWorks />
      <Features />
      <Outputs />
      <Stats />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
