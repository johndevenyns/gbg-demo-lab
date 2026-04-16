import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RegionSizeBadgeProps {
  label: "Header" | "Content" | "Footer";
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Optional extra controls (alignment, padding, bg color, max width) for the Content region */
  extraControls?: React.ReactNode;
  /** Position: header sits inside header, content/footer sit at top-right of their region */
  className?: string;
}

/**
 * Inline floating size badge displayed on each region (header / content / footer).
 * Click the value to edit. Use +/- buttons or arrow keys. Changes auto-save on commit.
 */
export function RegionSizeBadge({
  label,
  value,
  min,
  max,
  step = 10,
  onChange,
  extraControls,
  className,
}: RegionSizeBadgeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const commit = useCallback(() => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      const next = clamp(parsed);
      if (next !== value) onChange(next);
      setDraft(String(next));
    } else {
      setDraft(String(value));
    }
    setEditing(false);
  }, [draft, value, onChange, min, max]);

  const bump = (delta: number) => {
    const next = clamp(value + delta);
    if (next !== value) onChange(next);
  };

  return (
    <div
      className={cn(
        "absolute z-30 flex items-center gap-0.5 rounded-md border bg-background/95 backdrop-blur shadow-sm text-[10px] font-mono",
        "opacity-60 hover:opacity-100 transition-opacity",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="px-1.5 text-muted-foreground border-r select-none">{label}</span>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") { setDraft(String(value)); setEditing(false); }
            else if (e.key === "ArrowUp") { e.preventDefault(); bump(step); setDraft(String(clamp(value + step))); }
            else if (e.key === "ArrowDown") { e.preventDefault(); bump(-step); setDraft(String(clamp(value - step))); }
          }}
          className="w-12 px-1 py-0.5 bg-transparent border-0 outline-none text-[10px] font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <button
          type="button"
          className="px-1.5 py-0.5 hover:bg-muted/70 transition-colors min-w-[40px] text-center"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {value}px
        </button>
      )}

      <div className="flex flex-col border-l">
        <button
          type="button"
          className="px-1 h-3 flex items-center justify-center hover:bg-muted transition-colors"
          onClick={() => bump(step)}
          tabIndex={-1}
        >
          <ChevronUp className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          className="px-1 h-3 flex items-center justify-center hover:bg-muted transition-colors border-t"
          onClick={() => bump(-step)}
          tabIndex={-1}
        >
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </div>

      {extraControls && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="px-1 h-full border-l hover:bg-muted transition-colors flex items-center"
              title="More layout options"
            >
              <Settings2 className="w-2.5 h-2.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-3" align="end">
            {extraControls}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

interface ContentExtraControlsProps {
  paddingY: number;
  onPaddingYChange: (v: number) => void;
  justify: "start" | "center" | "end";
  onJustifyChange: (v: "start" | "center" | "end") => void;
  maxWidth: number;
  onMaxWidthChange: (v: number) => void;
  bgColor: string;
  onBgColorChange: (v: string) => void;
}

/** Extra controls for the Content region (padding, alignment, max width, bg color). */
export function ContentExtraControls({
  paddingY, onPaddingYChange,
  justify, onJustifyChange,
  maxWidth, onMaxWidthChange,
  bgColor, onBgColorChange,
}: ContentExtraControlsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Padding</Label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={paddingY}
            min={0}
            max={200}
            step={4}
            onChange={(e) => onPaddingYChange(Math.max(0, Math.min(200, parseInt(e.target.value, 10) || 0)))}
            className="w-full h-7 px-2 text-xs font-mono border rounded-md bg-background"
          />
          <span className="text-[10px] text-muted-foreground">px</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Alignment</Label>
        <Select value={justify} onValueChange={(v) => onJustifyChange(v as "start" | "center" | "end")}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="start">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="end">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Form Width</Label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={maxWidth || 576}
            min={200}
            max={1600}
            step={10}
            onChange={(e) => onMaxWidthChange(Math.max(200, Math.min(1600, parseInt(e.target.value, 10) || 576)))}
            className="w-full h-7 px-2 text-xs font-mono border rounded-md bg-background"
          />
          <span className="text-[10px] text-muted-foreground">px</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Background Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => onBgColorChange(e.target.value)}
            className="w-7 h-7 rounded border cursor-pointer"
          />
          <span className="text-[10px] font-mono text-muted-foreground">{bgColor}</span>
        </div>
      </div>
    </>
  );
}
