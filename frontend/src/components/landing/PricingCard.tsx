"use client";

import { cn } from "@/lib/utils";
import { LandingCtaButton } from "./LandingCtaButton";

interface PricingCardProps {
  plan: string;
  price: string;
  period: string;
  features: string[];
  ctaLabel: string;
  featured?: boolean;
  badge?: string;
}

export function PricingCard({
  plan,
  price,
  period,
  features,
  ctaLabel,
  featured = false,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] p-8 border transition-all duration-200 hover:-translate-y-1",
        featured
          ? "bg-[#002723] border-[#002723] hover:shadow-[0_20px_48px_rgba(0,39,35,0.3)]"
          : "bg-white border-[rgba(0,39,35,0.08)] hover:shadow-[0_20px_48px_rgba(0,39,35,0.1)]"
      )}
    >
      {badge && (
        <span className="self-start text-[11px] font-bold bg-[rgba(201,168,76,0.12)] text-[#E8C96A] border border-[rgba(201,168,76,0.25)] px-[10px] py-[3px] rounded-full tracking-[0.5px] mb-3">
          {badge}
        </span>
      )}

      <p
        className={cn(
          "text-[12px] font-bold uppercase tracking-[1px] mb-5",
          featured ? "text-[rgba(255,255,255,0.5)]" : "text-[#8A8A84]"
        )}
      >
        {plan}
      </p>

      <p
        className={cn(
          "text-[40px] font-bold tracking-[-2px] leading-none mb-1",
          featured ? "text-[#F5F5F0]" : "text-[#002723]"
        )}
      >
        {price}
      </p>
      <p
        className={cn(
          "text-[13px] mb-6",
          featured ? "text-[rgba(255,255,255,0.45)]" : "text-[#8A8A84]"
        )}
      >
        {period}
      </p>

      <div
        className={cn(
          "h-px mb-6",
          featured ? "bg-[rgba(255,255,255,0.1)]" : "bg-[rgba(0,39,35,0.08)]"
        )}
      />

      <ul className="flex flex-col gap-3 flex-1 mb-7 list-none">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-[10px]">
            <span
              className={cn(
                "w-[18px] h-[18px] min-w-[18px] rounded-full flex items-center justify-center text-[10px]",
                featured
                  ? "bg-[rgba(201,168,76,0.15)] text-[#E8C96A]"
                  : "bg-[rgba(74,222,128,0.1)] text-[#166534]"
              )}
            >
              ✓
            </span>
            <span
              className={cn(
                "text-[14px]",
                featured ? "text-[rgba(255,255,255,0.75)]" : "text-[#4A4A45]"
              )}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <LandingCtaButton
        variant={featured ? "pricing-primary" : "pricing-ghost"}
        size="md"
        className="w-full justify-center"
      >
        {ctaLabel}
      </LandingCtaButton>
    </div>
  );
}
