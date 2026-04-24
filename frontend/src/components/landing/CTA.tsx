"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingCtaButton } from "./LandingCtaButton";

export function CTA() {
  return (
    <section className="px-[5%] pb-24 max-w-[900px] mx-auto">
      <div className="bg-[#002723] rounded-[32px] px-12 py-[72px] text-center relative overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute top-[-50%] right-[-20%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 65%)",
          }}
        />

        <h2 className="relative text-[clamp(28px,4vw,44px)] font-bold text-[#F5F5F0] tracking-[-1.5px] leading-[1.1] mb-[14px]">
          Your next interview
          <br />
          is one upload away
        </h2>
        <p className="relative text-[16px] text-[rgba(245,245,240,0.6)] mb-9">
          Join thousands who stopped getting rejected and started getting hired.
        </p>

        <div className="relative flex justify-center gap-3 flex-wrap">
          <LandingCtaButton variant="gold" size="xl">
            Optimize my CV now
            <ArrowRight size={14} />
          </LandingCtaButton>
          <Button variant="ghost-dark" size="xl" asChild>
            <Link href="#outputs">View sample output</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
