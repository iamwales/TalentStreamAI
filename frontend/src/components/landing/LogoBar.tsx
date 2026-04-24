const companies = ["Google", "Stripe", "McKinsey", "Shopify", "Notion", "Airbnb"];

export function LogoBar() {
  return (
    <div className="py-12 px-[5%] border-t border-b border-[rgba(0,39,35,0.08)] bg-white text-center">
      <p className="text-[12px] font-semibold text-[#8A8A84] uppercase tracking-[1px] mb-7">
        Used by candidates targeting
      </p>
      <div className="flex items-center justify-center gap-12 flex-wrap">
        {companies.map((name) => (
          <span
            key={name}
            className="text-[15px] font-bold uppercase tracking-[-0.3px] text-[rgba(74,74,69,0.3)] font-sans"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
