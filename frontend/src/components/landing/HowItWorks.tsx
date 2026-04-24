import { SectionHeader } from "@/components/ui/section-header";
import { StepCard } from "./StepCard";

const steps = [
  {
    step: 1,
    label: "Upload",
    icon: "📄",
    title: "Drop your CV",
    description:
      "Upload your existing CV in any format — PDF, DOCX, or paste the text. We handle the rest.",
  },
  {
    step: 2,
    label: "Target",
    icon: "🎯",
    title: "Paste the job link",
    description:
      "Add the URL or description of the role you want. Our AI reads the job post and extracts every requirement.",
  },
  {
    step: 3,
    label: "Download",
    icon: "✨",
    title: "Get your full kit",
    description:
      "Receive an ATS-optimized CV, tailored cover letter, LinkedIn summary, and interview prep — all in under 60 seconds.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-[5%] max-w-[1100px] mx-auto">
      <SectionHeader
        tag="Process"
        title={
          <>
            Three steps to your
            <br />
            next interview
          </>
        }
        description="No more guessing if your CV is good enough. We guarantee it is."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14">
        {steps.map((step, i) => (
          <StepCard
            key={step.step}
            {...step}
            showConnector={i < steps.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
