import { SectionHeader } from "../ui/section-header";
import { FeatureItem } from "./FeatureItem";

const features = [
  {
    icon: "🤖",
    title: "ATS Optimization",
    description:
      "We reverse-engineer what each company's ATS is looking for and rewrite your CV to score above 90 — consistently.",
  },
  {
    icon: "✍️",
    title: "Cover Letter Generator",
    description:
      "Compelling, personalized cover letters that match your voice and the company's tone. Never generic, never a template.",
  },
  {
    icon: "🔍",
    title: "Keyword Analysis",
    description:
      "See exactly which keywords the job requires, which ones you're missing, and why each one matters.",
  },
  {
    icon: "💼",
    title: "LinkedIn Headline",
    description:
      "Your LinkedIn profile rewritten to attract recruiters searching for this exact role — optimized for search rankings.",
  },
  {
    icon: "🎤",
    title: "Interview Prep",
    description:
      "Role-specific questions, STAR-format answer frameworks, and the top 10 questions this company historically asks.",
  },
  {
    icon: "📊",
    title: "Gap Analysis",
    description:
      "Understand what skills or experience are missing and get actionable suggestions to close the gap before applying.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-[#002723] py-24 px-[5%]">
      <div className="max-w-[1100px] mx-auto">
        <SectionHeader
          tag="What you get"
          title={
            <>
              Everything you need
              <br />
              to get the offer
            </>
          }
          description="One upload. A complete application package built specifically for each role."
          dark
        />

        {/* Grid with 1px gap separator effect */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 mt-14 rounded-[20px] overflow-hidden"
          style={{ gap: "1px", background: "rgba(255,255,255,0.06)" }}
        >
          {features.map((feature) => (
            <FeatureItem key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
