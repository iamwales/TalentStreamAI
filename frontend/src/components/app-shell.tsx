"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/react";
import { FileText, LayoutDashboard, Sparkles, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoMark } from "./ui/logo-mark";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/apply", label: "Apply", icon: Sparkles },
    { href: "/applications", label: "Applications", icon: Send },
    { href: "/resume", label: "Resumes", icon: FileText },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className='flex min-h-screen flex-col bg-muted/30'>
            <header className='sticky top-0 z-40 border-b bg-background/80 backdrop-blur'>
                <div className='mx-auto flex max-w-7xl items-center justify-between px-6 py-3'>
                    <div className='flex items-center gap-8'>
                        <Link
                            href='/dashboard'
                            className='flex items-center gap-2 text-lg font-semibold tracking-tight'
                        >
                            <LogoMark size={32} />
                            TalentStream<span className='text-primary'>AI</span>
                        </Link>
                        <nav className='hidden items-center gap-1 md:flex'>
                            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                                const active =
                                    pathname === href ||
                                    pathname?.startsWith(`${href}/`);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                        )}
                                    >
                                        <Icon className='h-4 w-4' />
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <div className='flex items-center gap-3'>
                        <UserButton />
                    </div>
                </div>
                <nav className='flex gap-1 border-t px-4 py-2 md:hidden'>
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                        const active =
                            pathname === href ||
                            pathname?.startsWith(`${href}/`);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "inline-flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                            >
                                <Icon className='h-4 w-4' />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </header>
            <main className='mx-auto w-full max-w-7xl flex-1 px-6 py-8'>
                {children}
            </main>
        </div>
    );
}
