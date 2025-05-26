import React, { memo } from 'react';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
  href?: string;
  responsive?: boolean;
}

const logoSizes = {
  xs: { size: 'h-5 w-5', width: 20, height: 20 },
  sm: { size: 'h-6 w-6', width: 24, height: 24 },
  md: { size: 'h-8 w-8', width: 32, height: 32 },
  lg: { size: 'h-12 w-12', width: 48, height: 48 },
  xl: { size: 'h-16 w-16', width: 64, height: 64 },
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export const AppLogo = memo(function AppLogo({ 
  size = 'md', 
  showText = true, 
  className, 
  textClassName, 
  href,
  responsive = true 
}: AppLogoProps) {
  const { size: sizeClass, width, height } = logoSizes[size];

  const logo = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(sizeClass, "relative")}>
        <Image 
          src="/rased-logo.svg" 
          alt="راصد" 
          width={width}
          height={height}
          priority
          className="object-contain"
        />
      </div>
      {showText && (
        <div className={cn(
          "font-semibold", 
          responsive && "hidden sm:block", 
          textSizes[size],
          textClassName
        )}>
          {responsive ? (
            <>
              <span className="hidden md:inline">نظام راصد التحفيزي</span>
              <span className="inline md:hidden">راصد</span>
            </>
          ) : (
            "نظام راصد التحفيزي"
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
        {logo}
      </Link>
    );
  }

  return logo;
}); 