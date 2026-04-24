import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002723] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary:
                    "bg-[#002723] text-[#FAFAF8] rounded-[6px] shadow-[0_4px_24px_rgba(0,39,35,0.2)] hover:bg-[#003d38] hover:-translate-y-[1px] hover:shadow-[0_8px_32px_rgba(0,39,35,0.28)] active:translate-y-0",
                /** Secondary action; same visual as ghost, named for shadcn / common API compatibility */
                outline:
                    "bg-transparent text-[#002723] border border-[rgba(0,39,35,0.1)] rounded-[6px] hover:bg-[rgba(0,39,35,0.05)] hover:border-[rgba(0,39,35,0.25)]",
                ghost: "bg-transparent text-[#002723] border border-[rgba(0,39,35,0.1)] rounded-[6px] hover:bg-[rgba(0,39,35,0.05)] hover:border-[rgba(0,39,35,0.25)]",
                hero: "bg-[#002723] text-[#FAFAF8] rounded-[12px] shadow-[0_4px_24px_rgba(0,39,35,0.2)] hover:bg-[#004d45] hover:-translate-y-[2px] hover:shadow-[0_8px_32px_rgba(0,39,35,0.28)] active:translate-y-0",
                "hero-secondary":
                    "bg-transparent text-[#002723] border border-[rgba(0,39,35,0.1)] rounded-[12px] hover:bg-[rgba(0,39,35,0.04)]",
                gold: "bg-[#C9A84C] text-[#002723] rounded-[12px] shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:bg-[#E8C96A] hover:-translate-y-[2px] hover:shadow-[0_8px_28px_rgba(201,168,76,0.4)] active:translate-y-0",
                "ghost-dark":
                    "bg-[rgba(255,255,255,0.06)] text-[rgba(245,245,240,0.8)] border border-[rgba(255,255,255,0.12)] rounded-[12px] hover:bg-[rgba(255,255,255,0.1)]",
                "pricing-ghost":
                    "bg-transparent text-[#002723] border border-[rgba(0,39,35,0.1)] rounded-[6px] hover:bg-[rgba(0,39,35,0.05)] w-full",
                "pricing-primary":
                    "bg-[#C9A84C] text-[#002723] rounded-[6px] hover:bg-[#E8C96A] hover:-translate-y-[1px] w-full",
            },
            size: {
                sm: "h-8 px-4 text-[13px]",
                md: "h-9 px-[18px] text-[14px]",
                lg: "h-[46px] px-7 text-[15px]",
                xl: "h-[50px] px-8 text-[15px]",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);

export interface ButtonProps
    extends
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    },
);

Button.displayName = "Button";

export { Button, buttonVariants };
