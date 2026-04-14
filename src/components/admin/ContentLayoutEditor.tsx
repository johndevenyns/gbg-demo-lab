import { useState, useRef, useCallback } from "react";
import { SlidersHorizontal, X, Save, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoEnvironment } from "@/types/demo";
import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";

/** Local draft state for layout values */
export interface LayoutDraft {
  minHeight: number;
  paddingY: number;
  justify: 'start' | 'center' | 'end';
  maxWidth: number;
  bgColor: string;
}

function draftFromStyle(fs: FormStyleConfig): LayoutDraft {
  return {
    minHeight: fs.contentAreaMinHeight ?? 400,
    paddingY: fs.contentAreaPaddingY ?? 40,
    justify: fs.contentAreaJustify || 'start',
    maxWidth: fs.contentAreaMaxWidth ?? 0,
    bgColor: fs.contentAreaBgColor || '#f5f5f5',
  };
}

/* Compact numeric stepper: value display with up/down arrows */
function NumericStepper({ value, onChange, min, max, step, suffix = "px" }: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex items-center border rounded-md overflow-hidden h-7">
      <span className="flex-1 text-xs font-mono px-2 text-center select-none">
        {value}{suffix}
      </span>
      <div className="flex flex-col border-l">
        <button
          type="button"
          className="px-1.5 h-3.5 flex items-center justify-center hover:bg-muted transition-colors"
          onClick={() => onChange(clamp(value + step))}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          className="px-1.5 h-3.5 flex items-center justify-center hover:bg-muted transition-colors border-t"
          onClick={() => onChange(clamp(value - step))}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface ContentLayoutEditorProps {
  demo: DemoEnvironment;
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
  active: boolean;
  onClose: () => void;
  draft: LayoutDraft;
  onDraftChange: (d: LayoutDraft) => void;
}

export function ContentLayoutEditor({
  demo,
  onApplyBranding,
  active,
  onClose,
  draft,
  onDraftChange,
}: ContentLayoutEditorProps) {
  const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;

  const save = useCallback(() => {
    const updatedStyle: FormStyleConfig = {
      ...formStyle,
      contentAreaMinHeight: draft.minHeight,
      contentAreaPaddingY: draft.paddingY,
      contentAreaJustify: draft.justify,
      contentAreaMaxWidth: draft.maxWidth,
      contentAreaBgColor: draft.bgColor,
    };
    onApplyBranding({ formStyle: updatedStyle }, true);
    onClose();
  }, [formStyle, draft, onApplyBranding, onClose]);

  const cancel = useCallback(() => {
    onDraftChange(draftFromStyle(formStyle));
    onClose();
  }, [formStyle, onDraftChange, onClose]);

  if (!active) return null;

  return (
    <div className="absolute top-2 right-2 z-20 w-56 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Layout Controls
        </span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Min Height</Label>
        <NumericStepper value={draft.minHeight} min={100} max={1500} step={10}
          onChange={(v) => onDraftChange({ ...draft, minHeight: v })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Padding</Label>
        <NumericStepper value={draft.paddingY} min={0} max={200} step={4}
          onChange={(v) => onDraftChange({ ...draft, paddingY: v })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Alignment</Label>
        <Select value={draft.justify} onValueChange={(v) => onDraftChange({ ...draft, justify: v as 'start' | 'center' | 'end' })}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="start">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="end">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Form Width</Label>
        <NumericStepper value={draft.maxWidth || 576} min={200} max={1600} step={10}
          onChange={(v) => onDraftChange({ ...draft, maxWidth: v })} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Background Color</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={draft.bgColor}
            onChange={(e) => onDraftChange({ ...draft, bgColor: e.target.value })}
            className="w-7 h-7 rounded border cursor-pointer"
          />
          <span className="text-[10px] font-mono text-muted-foreground">{draft.bgColor}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={cancel}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={save}>
          <Save className="w-3 h-3" />
          Save
        </Button>
      </div>
    </div>
  );
}

/** Hook: manages draft state + drag handlers that only update local draft (no auto-save) */
export function useContentLayoutDraft(demo: DemoEnvironment) {
  const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
  const [draft, setDraft] = useState<LayoutDraft>(draftFromStyle(formStyle));

  // Reset draft when entering edit mode (called externally)
  const resetDraft = useCallback(() => {
    setDraft(draftFromStyle(demo.formStyle || DEFAULT_FORM_STYLE));
  }, [demo.formStyle]);

  const onTopPaddingMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = draft.paddingY;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newVal = Math.max(0, Math.min(200, startVal + delta));
      setDraft(prev => ({ ...prev, paddingY: newVal }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [draft.paddingY]);

  const onHeightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = draft.minHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newVal = Math.max(100, Math.min(1500, startVal + delta));
      setDraft(prev => ({ ...prev, minHeight: newVal }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [draft.minHeight]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const onWidthMouseDown = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = draft.maxWidth || 576;

    const onMove = (ev: MouseEvent) => {
      // Dragging either side changes width symmetrically (double the delta)
      const rawDelta = side === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const newVal = Math.max(200, Math.min(1600, startVal + rawDelta * 2));
      setDraft(prev => ({ ...prev, maxWidth: Math.round(newVal) }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [draft.maxWidth]);

  return { draft, setDraft, resetDraft, onTopPaddingMouseDown, onHeightMouseDown, onWidthMouseDown, containerRef };
}

export { draftFromStyle };
