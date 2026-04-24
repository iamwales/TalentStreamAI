export function HeroMockup() {
  const bars = [
    { label: "Keywords matched", value: 96 },
    { label: "Format score", value: 92 },
    { label: "Relevance", value: 90 },
  ];

  const tags = ["Python", "React", "CI/CD", "Agile"];

  return (
      <div className='w-full max-w-[820px] mx-auto mt-16 animate-fade-up-5'>
          {/* Window chrome */}
          <div
              className='rounded-[32px] p-[2px]'
              style={{
                  background: "#002723",
                  boxShadow:
                      "0 40px 100px rgba(0,39,35,0.25), 0 12px 32px rgba(0,0,0,0.1)",
              }}
          >
              <div className='bg-[#0F2220] rounded-[30px] overflow-hidden'>
                  {/* Title bar */}
                  <div className='bg-[rgba(255,255,255,0.04)] px-5 py-[14px] flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)]'>
                      <span className='w-[10px] h-[10px] rounded-full bg-[#FF5F56]' />
                      <span className='w-[10px] h-[10px] rounded-full bg-[#FFBD2E]' />
                      <span className='w-[10px] h-[10px] rounded-full bg-[#27C93F]' />
                      <div className='flex-1 mx-3 bg-[rgba(255,255,255,0.06)] rounded-[6px] px-3 py-[5px] text-[12px] text-[rgba(255,255,255,0.4)] font-mono'>
                          app.talentstreamai.ai/optimize
                      </div>
                  </div>

                  {/* Body — two panels */}
                  <div className='p-7 grid grid-cols-2 gap-4 min-h-[320px]'>
                      {/* ATS Score Panel */}
                      <div className='bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-[12px] p-5'>
                          <p className='text-[10px] font-semibold text-[rgba(255,255,255,0.35)] uppercase tracking-[1px] mb-3'>
                              ATS Score
                          </p>
                          <div className='flex items-baseline gap-[6px] mb-4'>
                              <span className='text-[42px] font-bold text-[#C9A84C] tracking-[-2px] leading-none'>
                                  94
                              </span>
                              <span className='text-[14px] text-[rgba(255,255,255,0.4)]'>
                                  / 100
                              </span>
                          </div>

                          {bars.map((bar) => (
                              <div key={bar.label} className='mb-[10px]'>
                                  <div className='flex justify-between text-[11px] text-[rgba(255,255,255,0.45)] mb-[5px]'>
                                      <span>{bar.label}</span>
                                      <span>{bar.value}%</span>
                                  </div>
                                  <div className='h-1 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden'>
                                      <div
                                          className='h-full bg-[#C9A84C] rounded-full'
                                          style={{ width: `${bar.value}%` }}
                                      />
                                  </div>
                              </div>
                          ))}

                          <div className='mt-4 flex flex-wrap gap-[6px]'>
                              {tags.map((tag) => (
                                  <span
                                      key={tag}
                                      className='inline-flex items-center gap-[5px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] text-[#f0dfa0] text-[11px] font-medium px-[10px] py-1 rounded-full'
                                  >
                                      <span className='text-[#4ade80] text-[10px]'>
                                          ✓
                                      </span>
                                      {tag}
                                  </span>
                              ))}
                          </div>
                      </div>

                      {/* CV Preview Panel */}
                      <div className='bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-[12px] p-5 flex flex-col gap-3'>
                          <p className='text-[10px] font-semibold text-[rgba(255,255,255,0.35)] uppercase tracking-[1px]'>
                              Optimized CV
                          </p>
                          {[
                              100,
                              65,
                              null,
                              100,
                              100,
                              45,
                              null,
                              100,
                              65,
                              100,
                          ].map((w, i) =>
                              w === null ? (
                                  <div
                                      key={i}
                                      className='h-px bg-[rgba(255,255,255,0.07)] my-0.5'
                                  />
                              ) : (
                                  <div
                                      key={i}
                                      className='h-2 bg-[rgba(255,255,255,0.08)] rounded-[3px]'
                                      style={{ width: `${w}%` }}
                                  />
                              ),
                          )}
                          <div className='mt-auto'>
                              <div className='inline-flex items-center gap-[6px] text-[11px] font-semibold text-[#4ade80] bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] px-3 py-[6px] rounded-[6px]'>
                                  <span className='w-[10px] h-[10px] rounded-full bg-[#4ade80]' />
                                  Ready to download
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}
