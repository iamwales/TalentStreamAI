"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/react";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui/logo-mark";
import { Button } from "@/components/ui/button";
import { LandingCtaButton } from "./LandingCtaButton";

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
      <nav className='fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[5%] h-[68px] bg-[rgba(250,250,248,0.88)] backdrop-blur-[16px] border-b border-[rgba(0,39,35,0.08)]'>
          {/* Logo */}
          <Link href='/' className='flex items-center gap-[10px] no-underline'>
              <LogoMark size={32} />
              <span className='text-[17px] font-semibold text-[#002723] tracking-[-0.3px]'>
                  TalentStreamAI
              </span>
          </Link>

          {/* Nav Links */}
          <ul className='hidden md:flex items-center gap-2 list-none'>
              {navLinks.map((link) => (
                  <li key={link.href}>
                      <Link
                          href={link.href}
                          className='text-[14px] font-medium text-[#4A4A45] no-underline px-[14px] py-[6px] rounded-[6px] transition-all duration-200 hover:text-[#002723] hover:bg-[rgba(0,39,35,0.05)]'
                      >
                          {link.label}
                      </Link>
                  </li>
              ))}
          </ul>

          {/* Auth Actions */}
          <div className='flex min-h-9 items-center justify-end gap-[10px]'>
              {!isLoaded ? null : isSignedIn ? (
                  <>
                      <Link href='/dashboard'>
                          <Button variant='ghost' size='md'>
                              Dashboard
                          </Button>
                      </Link>
                      <UserButton />
                  </>
              ) : (
                  <>
                      <SignInButton mode='modal'>
                          <Button variant='ghost' size='md'>
                              Sign in
                          </Button>
                      </SignInButton>
                      <LandingCtaButton variant='primary' size='md'>
                          Get started free
                          <ArrowRight size={12} />
                      </LandingCtaButton>
                  </>
              )}
          </div>
      </nav>
  );
}
