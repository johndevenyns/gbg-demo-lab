import { useState, useRef, useCallback, useEffect } from "react";
import { SlidersHorizontal, GripHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoEnvironment } from "@/types/demo";
import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";

interface ContentLayoutEditorProps {
  demo: DemoEnvironment;
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
  /** When true, the inline controls panel is visible */
  active: boolean;
  onClose: () => void;
}

/**
 * Floating controls panel that appears alongside the live preview.
 * Drag handles are rendered by the parent (SiteMirrorCard) directly on the preview.
 */
export function ContentLayoutEditor({
  demo,
  onApplyBranding,
  active,
  onClose,
}: ContentLayoutEditorProps) {
  const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
  const [minHeight, setMinHeight] = useState(formStyle.contentAreaMinHeight ?? 400);
  const [paddingY, setPaddingY] = useState(formStyle.contentAreaPaddingY ?? 40);
  const [justify, setJustify] = useState<'start' | 'center' | 'end'>(formStyle.contentAreaJustify || 'start');
  const [maxWidth, setMaxWidth] = useState(formStyle.contentAreaMaxWidth ?? 0);

  // Sync from props when activated
  useEffect(() => {
    if (active) {
      setMinHeight(formStyle.contentAreaMinHeight ?? 400);
      setPaddingY(formStyle.contentAreaPaddingY ?? 40);
      setJustify(formStyle.contentAreaJustify || 'start');
      setMaxWidth(formStyle.contentAreaMaxWidth ?? 0);
    }
  }, [active, formStyle.contentAreaMinHeight, formStyle.contentAreaPaddingY, formStyle.contentAreaJustify, formStyle.contentAreaMaxWidth]);

  const apply = useCallback((updates: Partial<FormStyleConfig>) => {
    const updatedStyle: FormStyleConfig = { ...formStyle, ...updates };
    onApplyBranding({ formStyle: updatedStyle }, true);
  }, [formStyle, onApplyBranding]);

  const handleMinHeightInput = (val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 100 && n <= 1500) {
      setMinHeight(n);
      apply({ contentAreaMinHeight: n });
    }
  };

  const handlePaddingInput = (val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0 && n <= 200) {
      setPaddingY(n);
      apply({ contentAreaPaddingY: n });
    }
  };

  const handleJustifyChange = (val: string) => {
    const v = val as 'start' | 'center' | 'end';
    setJustify(v);
    apply({ contentAreaJustify: v });
  };

  const handleMaxWidthInput = (val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0 && n <= 1600) {
      setMaxWidth(n);
      apply({ contentAreaMaxWidth: n });
    }
  };

  if (!active) return null;

  return (
    <div className="absolute top-2 right-2 z-20 w-56 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Layout Controls
        </span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Min Height (px)</Label>
        <Input
          type="number"
          value={minHeight}
          min={100}
          max={1500}
          step={10}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!isNaN(n)) setMinHeight(n);
          }}
          onBlur={(e) => handleMinHeightInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleMinHeightInput((e.target as HTMLInputElement).value); }}
          className="h-7 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Padding (px)</Label>
        <Input
          type="number"
          value={paddingY}
          min={0}
          max={200}
          step={4}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!isNaN(n)) setPaddingY(n);
          }}
          onBlur={(e) => handlePaddingInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePaddingInput((e.target as HTMLInputElement).value); }}
          className="h-7 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Vertical Alignment</Label>
        <Select value={justify} onValueChange={handleJustifyChange}>
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
          value={maxWidth || ''}
          placeholder="576 (default)"
          min={200}
          max={1600}
          step={10}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!isNaN(n)) setMaxWidth(n);
            else setMaxWidth(0);
          }}
          onBlur={(e) => handleMaxWidthInput(e.target.value || '0')}
          onKeyDown={(e) => { if (e.key === 'Enter') handleMaxWidthInput((e.target as HTMLInputElement).value || '0'); }}
          className="h-7 text-xs font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium">Background Color</Label>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={formStyle.contentAreaBgColor || '#f5f5f5'}
            onChange={(e) => apply({ contentAreaBgColor: e.target.value })}
            className="w-7 h-7 rounded border cursor-pointer"
          />
          <Input
            value={formStyle.contentAreaBgColor || '#f5f5f5'}
            onChange={(e) => apply({ contentAreaBgColor: e.target.value })}
            className="h-7 text-[10px] font-mono flex-1"
          />
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground">Drag the handles on the preview to resize visually</p>
    </div>
  );
}

/** Hook that provides drag handlers for the preview's content area */
export function useContentLayoutDrag(
  demo: DemoEnvironment,
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void,
) {
  const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;

  const applyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const applyUpdate = useCallback((updates: Partial<FormStyleConfig>) => {
    const updatedStyle: FormStyleConfig = { ...formStyle, ...updates };
    onApplyBranding({ formStyle: updatedStyle }, true);
  }, [formStyle, onApplyBranding]);

  const debouncedApply = useCallback((updates: Partial<FormStyleConfig>) => {
    clearTimeout(applyTimeoutRef.current);
    applyTimeoutRef.current = setTimeout(() => applyUpdate(updates), 150);
  }, [applyUpdate]);

  const onTopPaddingMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = formStyle.contentAreaPaddingY ?? 40;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newVal = Math.max(0, Math.min(200, startVal + delta));
      debouncedApply({ contentAreaPaddingY: newVal });
    };
    const onUp = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newVal = Math.max(0, Math.min(200, startVal + delta));
      applyUpdate({ contentAreaPaddingY: newVal });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [formStyle.contentAreaPaddingY, debouncedApply, applyUpdate]);

  const onHeightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = formStyle.contentAreaMinHeight ?? 400;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newVal = Math.max(100, Math.min(1500, startVal + delta));
      debouncedApply({ contentAreaMinHeight: newVal });
    };
    const onUp = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const newVal = Math.max(100, Math.min(1500, startVal + delta));
      applyUpdate({ contentAreaMinHeight: newVal });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [formStyle.contentAreaMinHeight, debouncedApply, applyUpdate]);

  return { onTopPaddingMouseDown, onHeightMouseDown };
}
