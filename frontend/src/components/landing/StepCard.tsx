interface StepCardProps {
  step: number;
  label: string;
  icon: string;
  title: string;
  description: string;
  showConnector?: boolean;
}

export function StepCard({
  step,
  label,
  icon,
  title,
  description,
  showConnector = false,
}: StepCardProps) {
  return (
    <div className="relative bg-white border border-[rgba(0,39,35,0.08)] rounded-[20px] p-7 group transition-all duration-200 hover:border-[rgba(0,39,35,0.2)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,39,35,0.08)]">
      {/* Step number */}
      <div className="flex items-center gap-2 text-[11px] font-bold text-[#C9A84C] uppercase tracking-[1.5px] mb-5">
        <div className="w-6 h-6 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center text-[11px] font-bold text-[#C9A84C]">
          {step}
        </div>
        {label}
      </div>

      {/* Icon */}
      <div className="w-12 h-12 bg-[rgba(0,39,35,0.06)] rounded-[12px] flex items-center justify-center text-[22px] mb-5">
        {icon}
      </div>

      <h3 className="text-[17px] font-semibold text-[#002723] tracking-[-0.3px] mb-[10px]">
        {title}
      </h3>
      <p className="text-[14px] text-[#4A4A45] leading-[1.65]">{description}</p>

      {/* Connector arrow */}
      {showConnector && (
        <div className="hidden lg:flex absolute -right-[11px] top-1/2 -translate-y-1/2 w-[22px] h-[22px] bg-[#FAFAF8] border border-[rgba(0,39,35,0.08)] rounded-full items-center justify-center text-[10px] text-[#8A8A84] z-10">
          →
        </div>
      )}
    </div>
  );
}
