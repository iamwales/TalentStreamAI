"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { OutputPreview } from "./OutputPreview";
import { cn } from "@/lib/utils";

const outputs = [
  {
    icon: "📄",
    title: "ATS-Optimized CV",
    description: "Tailored to the job description. Scores above 90 on every major ATS.",
  },
  {
    icon: "✉️",
    title: "Cover Letter",
    description: "Personalized, compelling, and formatted for the role and company.",
  },
  {
    icon: "🔗",
    title: "LinkedIn Summary",
    description: "Rewritten about section optimized for recruiter searches.",
  },
  {
    icon: "❓",
    title: "Interview Question Bank",
    description: "10 role-specific questions with suggested STAR-format answers.",
  },
];

export function Outputs() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section
      id="outputs"
      className="py-24 px-[5%] max-w-[1100px] mx-auto scroll-mt-28"
    >
      <SectionHeader
        tag="Deliverables"
        title={
          <>
            Your complete
            <br />
            application kit
          </>
        }
        description="Every document you need to apply with confidence, all generated in one go."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 mt-14 items-center">
        {/* Output list */}
        <div className="flex flex-col gap-4">
          {outputs.map((item, i) => (
            <button
              key={item.title}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "flex items-start gap-4 p-5 bg-white border rounded-[12px] text-left w-full transition-all duration-200 cursor-pointer",
                activeIndex === i
                  ? "border-l-[3px] border-[#C9A84C] shadow-[0_4px_16px_rgba(0,39,35,0.06)]"
                  : "border-[rgba(0,39,35,0.08)] hover:border-[rgba(0,39,35,0.2)] hover:shadow-[0_4px_16px_rgba(0,39,35,0.06)]"
              )}
            >
              <div className="w-10 h-10 min-w-[40px] rounded-[6px] bg-[rgba(0,39,35,0.06)] flex items-center justify-center text-[18px]">
                {item.icon}
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-[#002723] mb-1">
                  {item.title}
                </h4>
                <p className="text-[13px] text-[#8A8A84] leading-[1.5]">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Preview panel */}
        <OutputPreview />
      </div>
    </section>
  );
}
