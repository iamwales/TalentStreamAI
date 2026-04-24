import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

interface SectionHeaderProps {
  tag: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  tag,
  title,
  description,
  align = "left",
  dark = false,
  className,
  descriptionClassName,
}: SectionHeaderProps) {
  const badgeVariant: BadgeProps["variant"] = dark
    ? "section-dark"
    : "section";

  return (
    <div
      className={cn(
        align === "center" && "text-center",
        className
      )}
    >
      <Badge variant={badgeVariant} className="mb-5">
        {tag}
      </Badge>
      <h2
        className={cn(
          "text-[clamp(28px,4vw,44px)] font-bold tracking-[-1.2px] leading-[1.1] mb-4",
          dark ? "text-[#F5F5F0]" : "text-[#002723]"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-[16px] leading-[1.65]",
            dark ? "text-[rgba(245,245,240,0.6)]" : "text-[#4A4A45]",
            align === "center" && "mx-auto max-w-[480px]",
            align === "left" && "max-w-[480px]",
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
