import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center gap-2 font-semibold transition-colors",
    {
        variants: {
            variant: {
                /** Neutral / muted; common shadcn name for app UI like “Base” labels */
                secondary:
                    "bg-[rgba(0,39,35,0.08)] text-[#002723] text-[12px] px-[10px] py-1 rounded-full font-medium border border-[rgba(0,39,35,0.12)]",
                hero: "bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.3)] text-[#8B6B1A] text-[12.5px] px-[14px] py-[5px] rounded-full tracking-[0.3px]",
                section:
                    "bg-[rgba(0,39,35,0.06)] text-[#002723] text-[12px] px-[14px] py-[5px] rounded-full uppercase tracking-[0.5px]",
                "section-dark":
                    "bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.2)] text-[#E8C96A] text-[12px] px-[14px] py-[5px] rounded-full uppercase tracking-[0.5px]",
                featured:
                    "bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.25)] text-[#E8C96A] text-[11px] px-[10px] py-[3px] rounded-full tracking-[0.5px]",
                score: "bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)] text-[#166534] text-[12px] px-[12px] py-[5px] rounded-full",
                warning:
                    "bg-[rgba(234,179,8,0.12)] border border-[rgba(202,138,4,0.35)] text-[#a16207] text-[12px] px-[12px] py-[5px] rounded-full",
                destructive:
                    "bg-[rgba(248,113,113,0.12)] border border-[rgba(220,38,38,0.35)] text-[#b91c1c] text-[12px] px-[12px] py-[5px] rounded-full",
                keyword:
                    "bg-[rgba(0,39,35,0.06)] text-[#002723] text-[11px] px-[10px] py-1 rounded-full font-medium",
                "keyword-highlight":
                    "bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] text-[#8B6B1A] text-[11px] px-[10px] py-1 rounded-full font-medium",
                ats: "bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] text-[#f0dfa0] text-[11px] px-[10px] py-1 rounded-full font-medium",
            },
        },
        defaultVariants: {
            variant: "section",
        },
    },
);

export interface BadgeProps
    extends
        React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
