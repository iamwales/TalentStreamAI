const stats = [
  { number: "94", suffix: "%", label: "Average ATS score" },
  { number: "3", suffix: "×", label: "More interview callbacks" },
  { number: "60", suffix: "s", label: "To full application kit" },
  { number: "4.2", suffix: "k", label: "Interviews landed this month" },
];

export function Stats() {
  return (
    <section className="bg-white border-t border-b border-[rgba(0,39,35,0.08)] py-[72px] px-[5%]">
      <div
        className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 rounded-[20px] overflow-hidden"
        style={{ gap: "1px", background: "rgba(0,39,35,0.08)" }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white px-7 py-9 text-center"
          >
            <p className="text-[42px] font-bold text-[#002723] tracking-[-2px] leading-none mb-[6px]">
              {stat.number}
              <em className="not-italic text-[#C9A84C]">{stat.suffix}</em>
            </p>
            <p className="text-[13px] text-[#8A8A84] font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
