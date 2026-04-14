import { useState, useRef, useCallback, useEffect } from "react";
import { SlidersHorizontal, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DemoEnvironment } from "@/types/demo";
import { DEFAULT_FORM_STYLE, FormStyleConfig } from "@/types/formStyle";
import { generatePreviewDocument } from "@/lib/formStyleUtils";
import { enhanceHeaderPreviewIframe } from "@/lib/iframeContrast";

interface ContentLayoutEditorProps {
  demo: DemoEnvironment;
  headerHtml: string;
  footerHtml: string;
  cssContent: string;
  onApplyBranding: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

export function ContentLayoutEditor({
  demo,
  headerHtml,
  footerHtml,
  cssContent,
  onApplyBranding,
}: ContentLayoutEditorProps) {
  const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
  const [minHeight, setMinHeight] = useState(formStyle.contentAreaMinHeight ?? 400);
  const [paddingY, setPaddingY] = useState(formStyle.contentAreaPaddingY ?? 40);
  const [justify, setJustify] = useState<'start' | 'center' | 'end'>(formStyle.contentAreaJustify || 'start');
  const [maxWidth, setMaxWidth] = useState(formStyle.contentAreaMaxWidth ?? 0);
  const [open, setOpen] = useState(false);

  // Sync from props when dialog opens
  useEffect(() => {
    if (open) {
      setMinHeight(formStyle.contentAreaMinHeight ?? 400);
      setPaddingY(formStyle.contentAreaPaddingY ?? 40);
      setJustify(formStyle.contentAreaJustify || 'start');
      setMaxWidth(formStyle.contentAreaMaxWidth ?? 0);
    }
  }, [open, formStyle.contentAreaMinHeight, formStyle.contentAreaPaddingY, formStyle.contentAreaJustify, formStyle.contentAreaMaxWidth]);

  const apply = useCallback((updates: Partial<FormStyleConfig>) => {
    const updatedStyle: FormStyleConfig = { ...formStyle, ...updates };
    onApplyBranding({ formStyle: updatedStyle }, true);
  }, [formStyle, onApplyBranding]);

  // Debounced apply for drag operations
  const applyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const debouncedApply = useCallback((updates: Partial<FormStyleConfig>) => {
    clearTimeout(applyTimeoutRef.current);
    applyTimeoutRef.current = setTimeout(() => apply(updates), 150);
  }, [apply]);

  // --- Drag handlers for top padding ---
  const topDragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const onTopPaddingMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    topDragRef.current = { startY: e.clientY, startVal: paddingY };

    const onMove = (ev: MouseEvent) => {
      if (!topDragRef.current) return;
      const delta = ev.clientY - topDragRef.current.startY;
      const newVal = Math.max(0, Math.min(200, topDragRef.current.startVal + delta));
      setPaddingY(newVal);
      debouncedApply({ contentAreaPaddingY: newVal });
    };
    const onUp = () => {
      topDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Final apply
      apply({ contentAreaPaddingY: paddingY });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [paddingY, debouncedApply, apply]);

  // --- Drag handler for content height (bottom edge) ---
  const heightDragRef = useRef<{ startY: number; startVal: number } | null>(null);

  const onHeightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    heightDragRef.current = { startY: e.clientY, startVal: minHeight };

    const onMove = (ev: MouseEvent) => {
      if (!heightDragRef.current) return;
      const delta = ev.clientY - heightDragRef.current.startY;
      const newVal = Math.max(100, Math.min(1500, heightDragRef.current.startVal + delta));
      setMinHeight(newVal);
      debouncedApply({ contentAreaMinHeight: newVal });
    };
    const onUp = () => {
      heightDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      apply({ contentAreaMinHeight: minHeight });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [minHeight, debouncedApply, apply]);

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

  const justifyMap: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end' };
  const maxWidthPx = maxWidth || 576; // default ~36rem

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Customize Layout
          </span>
          <span className="text-xs text-muted-foreground">Height, spacing &amp; alignment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Content Area Layout
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_240px] gap-6">
          {/* Live preview with drag handles */}
          <div className="border rounded-lg overflow-hidden bg-muted/30 relative">
            <div className="overflow-auto max-h-[70vh]">
              {/* Header */}
              {headerHtml && (
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8">
                    <style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}*{box-sizing:border-box;}a{pointer-events:none;}</style>
                    ${cssContent ? `<style>${cssContent}</style>` : ''}
                  </head><body>${headerHtml}</body></html>`}
                  className="block w-full border-0"
                  style={{ height: '120px' }}
                  title="Header preview"
                  sandbox="allow-same-origin"
                  onLoad={(e) => enhanceHeaderPreviewIframe(e.currentTarget, 80)}
                />
              )}

              {/* Content area with drag handles */}
              <div className="relative" style={{ backgroundColor: formStyle.contentAreaBgColor || '#f5f5f5' }}>
                {/* Top padding drag handle */}
                <div
                  className="absolute top-0 left-0 right-0 flex items-center justify-center cursor-ns-resize z-10 group"
                  style={{ height: `${Math.max(paddingY, 12)}px` }}
                  onMouseDown={onTopPaddingMouseDown}
                >
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/80 text-primary-foreground text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <GripHorizontal className="w-3 h-3" />
                    Padding: {paddingY}px
                  </div>
                  <div className="absolute bottom-0 left-[10%] right-[10%] h-px border-b border-dashed border-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content */}
                <div
                  style={{
                    minHeight: `${minHeight}px`,
                    paddingTop: `${paddingY}px`,
                    paddingBottom: `${paddingY}px`,
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: justifyMap[justify] || 'flex-start',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ maxWidth: `${maxWidthPx}px`, width: '100%' }}>
                  <iframe
                    srcDoc={generatePreviewDocument({
                      formStyle: formStyle,
                      buttonColor: demo.buttonColor || '#3b82f6',
                      headerHtml: '',
                      footerHtml: '',
                      contentBgColor: 'transparent',
                    })}
                    className="block w-full border-0"
                    style={{ height: '400px' }}
                    title="Form preview"
                    sandbox="allow-same-origin"
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      try {
                        const body = iframe.contentDocument?.body;
                        const h = body?.scrollHeight || 400;
                        iframe.style.height = `${Math.max(h, 300)}px`;
                      } catch {
                        iframe.style.height = '400px';
                      }
                    }}
                  />
                  </div>
                </div>

                {/* Bottom height drag handle */}
                <div
                  className="absolute bottom-0 left-0 right-0 flex items-center justify-center cursor-ns-resize z-10 group h-4"
                  onMouseDown={onHeightMouseDown}
                >
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/80 text-primary-foreground text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <GripHorizontal className="w-3 h-3" />
                    Height: {minHeight}px
                  </div>
                  <div className="absolute top-0 left-[10%] right-[10%] h-px border-t border-dashed border-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Footer */}
              {footerHtml && (
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8">
                    <style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;}*{box-sizing:border-box;}a{pointer-events:none;}</style>
                    ${cssContent ? `<style>${cssContent}</style>` : ''}
                  </head><body>${footerHtml}</body></html>`}
                  className="block w-full border-0"
                  style={{ height: '160px' }}
                  title="Footer preview"
                  sandbox="allow-same-origin"
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    try {
                      const body = iframe.contentDocument?.body;
                      const h = body?.firstElementChild?.scrollHeight || body?.scrollHeight || 160;
                      iframe.style.height = `${Math.max(h as number, 80)}px`;
                    } catch {
                      iframe.style.height = '160px';
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Value controls panel */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Min Height (px)</Label>
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
                className="h-8 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Drag bottom edge of content area or type a value</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Vertical Padding (px)</Label>
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
                className="h-8 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Drag top edge of content area or type a value</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Vertical Alignment</Label>
              <Select value={justify} onValueChange={handleJustifyChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Form Container Width (px)</Label>
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
                className="h-8 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">0 or empty = default (576px). Set to control form container width.</p>
            </div>

              <Label className="text-xs font-medium">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formStyle.contentAreaBgColor || '#f5f5f5'}
                  onChange={(e) => apply({ contentAreaBgColor: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={formStyle.contentAreaBgColor || '#f5f5f5'}
                  onChange={(e) => apply({ contentAreaBgColor: e.target.value })}
                  className="h-8 text-xs font-mono flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
