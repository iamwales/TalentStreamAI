import Link from "next/link";
import { LogoMark } from "@/components/ui/logo-mark";

const footerLinks = [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/blog", label: "Blog" },
    { href: "/support", label: "Support" },
];

export function Footer() {
    return (
        <footer className='border-t border-[rgba(0,39,35,0.08)] px-[5%] py-12 flex items-center justify-between flex-wrap gap-6'>
            <Link
                href='/'
                className='flex items-center gap-[10px] no-underline'
            >
                <LogoMark size={28} />
                <span className='text-[15px] font-semibold text-[#002723]'>
                    TalentStreamAI
                </span>
            </Link>

            <ul className='flex gap-6 list-none flex-wrap'>
                {footerLinks.map((link) => (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            className='text-[13px] text-[#8A8A84] no-underline transition-colors duration-200 hover:text-[#002723]'
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>

            <p className='text-[12px] text-[#8A8A84]'>
                © {new Date().getFullYear()} TalentStreamAI. All rights
                reserved.
            </p>
        </footer>
    );
}
