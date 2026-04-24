import { SectionHeader } from "@/components/ui/section-header";
import { PricingCard } from "./PricingCard";

const plans = [
  {
    plan: "Starter",
    price: "Free",
    period: "3 optimizations / month",
    features: [
      "ATS-optimized CV",
      "Keyword analysis",
      "Basic cover letter",
      "PDF download",
    ],
    ctaLabel: "Get started free",
    featured: false,
  },
  {
    plan: "Pro",
    price: "$19",
    period: "per month, billed monthly",
    features: [
      "Unlimited optimizations",
      "Full cover letter suite",
      "LinkedIn rewrite",
      "Interview question bank",
      "Gap analysis",
      "Priority processing",
    ],
    ctaLabel: "Start with Pro",
    featured: true,
    badge: "Most popular",
  },
  {
    plan: "Teams",
    price: "$49",
    period: "per month, up to 5 members",
    features: [
      "Everything in Pro",
      "Team dashboard",
      "Recruiter collaboration",
      "Bulk CV processing",
      "Analytics & reporting",
      "Dedicated support",
    ],
    ctaLabel: "Contact sales",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-[5%] max-w-[1100px] mx-auto text-center">
      <SectionHeader
        tag="Pricing"
        title="Simple, honest pricing"
        description="Start free. Upgrade when you're ready to go all in."
        align="center"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 text-left">
        {plans.map((plan) => (
          <PricingCard key={plan.plan} {...plan} />
        ))}
      </div>
    </section>
  );
}
