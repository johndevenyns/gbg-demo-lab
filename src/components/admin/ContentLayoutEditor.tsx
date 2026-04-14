import { useState, useRef, useCallback, useEffect } from "react";
import { SlidersHorizontal, GripHorizontal, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    // Reset draft to saved values
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
        <Label className="text-[10px] font-medium">Min Height (px)</Label>
        <Input
          type="number"
          value={draft.minHeight}
          min={100} max={1500} step={10}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!isNaN(n)) onDraftChange({ ...draft, minHeight: Math.max(100, Math.min(1500, n)) });
          }}
          className="h-7 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Padding (px)</Label>
        <Input
          type="number"
          value={draft.paddingY}
          min={0} max={200} step={4}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!isNaN(n)) onDraftChange({ ...draft, paddingY: Math.max(0, Math.min(200, n)) });
          }}
          className="h-7 text-xs font-mono"
        />
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
        <Label className="text-[10px] font-medium">Form Width (px)</Label>
        <Input
          type="number"
          value={draft.maxWidth || ''}
          placeholder="576 (default)"
          min={200} max={1600} step={10}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            onDraftChange({ ...draft, maxWidth: !isNaN(n) ? Math.max(0, Math.min(1600, n)) : 0 });
          }}
          className="h-7 text-xs font-mono"
        />
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
          <Input
            value={draft.bgColor}
            onChange={(e) => onDraftChange({ ...draft, bgColor: e.target.value })}
            className="h-7 text-[10px] font-mono flex-1"
          />
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground">Drag handles on the preview to resize visually</p>

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
