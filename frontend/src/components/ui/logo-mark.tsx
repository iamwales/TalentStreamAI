import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const iconSize = Math.round(size * 0.5);
  return (
    <div
      className={cn(
        "bg-[#002723] flex items-center justify-center flex-shrink-0",
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"
          stroke="#C9A84C"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="8" cy="8" r="2.5" fill="#C9A84C" />
      </svg>
    </div>
  );
}
