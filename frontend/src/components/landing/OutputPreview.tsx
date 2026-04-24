import { Badge } from "@/components/ui/badge";

const keywords = [
  { text: "Product Management", highlight: true },
  { text: "Roadmapping", highlight: true },
  { text: "Agile", highlight: true },
  { text: "Stakeholder mgmt", highlight: false },
  { text: "Data-driven", highlight: true },
  { text: "B2B SaaS", highlight: false },
  { text: "OKRs", highlight: true },
  { text: "GTM strategy", highlight: false },
];

export function OutputPreview() {
  return (
    <div className="bg-white border border-[rgba(0,39,35,0.08)] rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,39,35,0.08)]">
      {/* Header */}
      <div className="bg-[#002723] px-5 py-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[rgba(255,255,255,0.7)]">
          CV Score Report
        </span>
        <span className="text-[11px] font-bold bg-[rgba(201,168,76,0.15)] text-[#E8C96A] border border-[rgba(201,168,76,0.3)] px-[10px] py-[3px] rounded-full">
          94 / 100
        </span>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Score row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold text-[#8A8A84] uppercase tracking-[0.8px] mb-1">
              ATS Score
            </p>
            <p className="text-[36px] font-bold text-[#002723] tracking-[-1.5px] leading-none">
              94
              <span className="text-[14px] font-medium text-[#8A8A84]">
                /100
              </span>
            </p>
          </div>
          <Badge variant="score">✓ Interview-ready</Badge>
        </div>

        {/* Keywords */}
        <p className="text-[10px] font-bold text-[#8A8A84] uppercase tracking-[1px] mb-3">
          Matched keywords
        </p>
        <div className="flex flex-wrap gap-[6px] mb-5">
          {keywords.map((kw) => (
            <Badge
              key={kw.text}
              variant={kw.highlight ? "keyword-highlight" : "keyword"}
            >
              {kw.text}
            </Badge>
          ))}
        </div>

        {/* Experience lines */}
        <p className="text-[10px] font-bold text-[#8A8A84] uppercase tracking-[1px] mb-3">
          Experience summary
        </p>
        {[100, 75, 100, 50].map((w, i) => (
          <div
            key={i}
            className="h-[7px] bg-[rgba(0,39,35,0.06)] rounded-[3px] mb-2"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}
