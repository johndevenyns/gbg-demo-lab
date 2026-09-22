import gbgLogoAsset from "@/assets/gbg-logo-primary.png.asset.json";
import { cn } from "@/lib/utils";

interface GbgManagerLogoProps {
  className?: string;
  compact?: boolean;
}

export function GbgManagerLogo({ className, compact = false }: GbgManagerLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {compact ? (
        <img
          src="/favicon.png"
          alt="GBG"
          className="h-10 w-10 shrink-0 object-contain"
        />
      ) : (
        <img
          src={gbgLogoAsset.url}
          alt="GBG"
          className="h-auto w-full object-contain"
        />
      )}
    </div>
  );
}