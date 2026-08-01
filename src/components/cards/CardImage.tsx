/* eslint-disable @next/next/no-img-element */
"use client";

type CardImageProps = {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

const DEFAULT_IMAGE_CLASS = "w-full rounded-lg border border-foreground/10 shadow-[0_14px_30px_rgba(0,0,0,0.22)]";
const DEFAULT_FALLBACK_CLASS = "flex min-h-64 items-center justify-center rounded-lg border border-foreground/10 px-4 py-6 text-sm text-ash-grey/80";

export default function CardImage({ src, alt, className, fallbackClassName }: CardImageProps) {
  if (!src) {
    return <div className={fallbackClassName ?? DEFAULT_FALLBACK_CLASS}>No image available.</div>;
  }

  return <img src={src} alt={alt} className={className ?? DEFAULT_IMAGE_CLASS} />;
}
