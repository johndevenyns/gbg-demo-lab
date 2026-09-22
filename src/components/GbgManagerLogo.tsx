import { cn } from "@/lib/utils";

interface GbgManagerLogoProps {
  className?: string;
  compact?: boolean;
}

export function GbgManagerLogo({ className, compact = false }: GbgManagerLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="GBG">
      <img
        src={`${import.meta.env.BASE_URL}favicon.png`}
        alt=""
        className={cn("shrink-0 object-contain", compact ? "h-10 w-10" : "h-12 w-12")}
      />
      {!compact && (
        <span className="text-[2.7rem] font-bold leading-none text-foreground" aria-hidden="true">
          GBG
        </span>
      )}
    </div>
  );
}