"use client";

import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingCtaButton } from "./LandingCtaButton";
import { HeroMockup } from "./HeroMockup";

const avatars = [
  { initials: "AK", bg: "#1B4D3E" },
  { initials: "LM", bg: "#C9A84C" },
  { initials: "BO", bg: "#3D6B5E" },
  { initials: "FN", bg: "#8B6B1A" },
];

export function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-[5%] pt-[120px] pb-20 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,39,35,0.05) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Hero badge */}
      <div className="animate-fade-up">
        <Badge variant="hero" className="mb-7">
          <span className="w-[6px] h-[6px] rounded-full bg-[#C9A84C] badge-pulse" />
          AI-powered job application suite
        </Badge>
      </div>

      {/* Headline */}
      <h1 className="animate-fade-up-1 text-[clamp(40px,6vw,72px)] font-bold leading-[1.08] tracking-[-2px] text-[#002723] max-w-[760px] mx-auto mb-6">
        Stop getting ignored.{" "}
        <em className="not-italic text-[#C9A84C] relative">
          Start getting interviews.
          <span
            className="absolute bottom-1 left-0 right-0 h-[2px] rounded-sm bg-[#C9A84C] opacity-40"
            aria-hidden="true"
          />
        </em>
      </h1>

      {/* Subheadline */}
      <p className="animate-fade-up-2 text-[18px] text-[#4A4A45] max-w-[500px] mx-auto mb-10 leading-[1.65]">
        Upload your CV, paste any job link — we rewrite your application to beat
        ATS filters and land in front of the hiring manager.
      </p>

      {/* CTA buttons */}
      <div className="animate-fade-up-3 flex items-center justify-center gap-[14px] flex-wrap mb-[60px]">
        <LandingCtaButton variant="hero" size="xl">
          Optimize my CV — it&apos;s free
          <ArrowRight size={14} />
        </LandingCtaButton>
        <Button variant="hero-secondary" size="xl" asChild>
          <Link href="#how-it-works">
            <HelpCircle size={14} />
            See how it works
          </Link>
        </Button>
      </div>

      {/* Social proof */}
      <div className="animate-fade-up-4 flex items-center justify-center gap-5">
        <div className="flex items-center">
          {avatars.map((av, i) => (
            <div
              key={av.initials}
              className="w-8 h-8 rounded-full border-2 border-[#FAFAF8] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{
                background: av.bg,
                marginLeft: i === 0 ? 0 : "-8px",
                zIndex: avatars.length - i,
                position: "relative",
              }}
            >
              {av.initials}
            </div>
          ))}
        </div>
        <p className="text-[13px] text-[#4A4A45] font-medium">
          <strong className="text-[#002723]">4,200+</strong> job seekers got
          interviews this month
        </p>
      </div>

      {/* Mockup visual */}
      <HeroMockup />
    </section>
  );
}
