interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

export function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="bg-[#002723] p-8 transition-colors duration-200 hover:bg-[#003d38]">
      <div className="w-11 h-11 rounded-[6px] bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center text-[20px] mb-5">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold text-[#F5F5F0] tracking-[-0.2px] mb-2">
        {title}
      </h3>
      <p className="text-[13.5px] text-[rgba(245,245,240,0.55)] leading-[1.65]">
        {description}
      </p>
    </div>
  );
}
