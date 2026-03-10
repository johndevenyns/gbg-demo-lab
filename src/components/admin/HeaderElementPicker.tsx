import { useState, useRef, useCallback, useEffect } from "react";
import { MousePointerClick, X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoUseCaseLink } from "@/types/useCase";

interface HeaderElementPickerProps {
  headerHtml: string;
  cssContent?: string;
  currentSelector?: string;
  currentUseCaseId?: string;
  useCaseLinks: DemoUseCaseLink[];
  onSelectorChange: (selector: string | undefined, useCaseId: string | undefined) => void;
}

function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  if (el.classList.length > 0) {
    const classSelector = `${tag}.${Array.from(el.classList).join(".")}`;
    const parent = el.parentElement;
    if (parent && parent.querySelectorAll(classSelector).length === 1) {
      return classSelector;
    }
  }
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current.tagName.toLowerCase() !== "body" && current.tagName.toLowerCase() !== "html") {
    let segment = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    if (current.classList.length > 0) {
      segment += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        segment += `:nth-child(${idx})`;
      }
    }
    parts.unshift(segment);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

export function HeaderElementPicker({
  headerHtml,
  cssContent,
  currentSelector,
  currentUseCaseId,
  useCaseLinks,
  onSelectorChange,
}: HeaderElementPickerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pickingMode, setPickingMode] = useState(false);
  const [hoveredSelector, setHoveredSelector] = useState<string | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<string>(currentSelector || "");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string>(currentUseCaseId || "");

  useEffect(() => {
    setSelectedSelector(currentSelector || "");
  }, [currentSelector]);

  useEffect(() => {
    setSelectedUseCaseId(currentUseCaseId || "");
  }, [currentUseCaseId]);

  const getIframeDoc = useCallback(() => {
    try {
      return iframeRef.current?.contentDocument || null;
    } catch {
      return null;
    }
  }, []);

  const injectPickerStyles = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc) return;
    doc.getElementById("cta-picker-style")?.remove();
    const style = doc.createElement("style");
    style.id = "cta-picker-style";
    style.textContent = `
      [data-cta-hover] {
        outline: 3px solid hsl(262, 83%, 58%) !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
      }
      [data-cta-selected] {
        outline: 3px solid hsl(142, 71%, 45%) !important;
        outline-offset: 2px !important;
      }
      .cta-picker-active * {
        cursor: crosshair !important;
      }
    `;
    doc.head.appendChild(style);
  }, [getIframeDoc]);

  const clearHighlights = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc) return;
    doc.querySelectorAll("[data-cta-hover]").forEach((el) => el.removeAttribute("data-cta-hover"));
  }, [getIframeDoc]);

  const highlightSelected = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc || !selectedSelector) return;
    doc.querySelectorAll("[data-cta-selected]").forEach((el) => el.removeAttribute("data-cta-selected"));
    try {
      const el = doc.querySelector(selectedSelector);
      if (el) el.setAttribute("data-cta-selected", "true");
    } catch {}
  }, [getIframeDoc, selectedSelector]);

  const startPicking = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc) return;
    setPickingMode(true);
    injectPickerStyles();
    doc.body.classList.add("cta-picker-active");

    const handleMouseOver = (e: Event) => {
      const target = e.target as Element;
      if (!target || target === doc.body || target === doc.documentElement) return;
      const clickable = target.closest("a, button, [role='button'], [onclick]") || target;
      clearHighlights();
      clickable.setAttribute("data-cta-hover", "true");
      setHoveredSelector(generateSelector(clickable));
    };

    const handleClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as Element;
      const clickable = target.closest("a, button, [role='button'], [onclick]") || target;
      const sel = generateSelector(clickable);
      const label = clickable.textContent?.trim().substring(0, 50) || clickable.tagName.toLowerCase();
      setSelectedSelector(sel);
      setSelectedLabel(label);
      setPickingMode(false);
      clearHighlights();
      doc.body.classList.remove("cta-picker-active");
      doc.removeEventListener("mouseover", handleMouseOver);
      doc.removeEventListener("click", handleClick, true);
      clickable.setAttribute("data-cta-selected", "true");
    };

    doc.addEventListener("mouseover", handleMouseOver);
    doc.addEventListener("click", handleClick, true);
  }, [getIframeDoc, injectPickerStyles, clearHighlights]);

  const stopPicking = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc) return;
    setPickingMode(false);
    clearHighlights();
    doc.body.classList.remove("cta-picker-active");
  }, [getIframeDoc, clearHighlights]);

  const handleApply = () => {
    onSelectorChange(
      selectedSelector || undefined,
      selectedUseCaseId || undefined
    );
  };

  const handleClear = () => {
    setSelectedSelector("");
    setSelectedLabel("");
    setSelectedUseCaseId("");
    onSelectorChange(undefined, undefined);
    const doc = getIframeDoc();
    if (doc) {
      doc.querySelectorAll("[data-cta-selected]").forEach((el) => el.removeAttribute("data-cta-selected"));
    }
  };

  const handleIframeLoad = () => {
    injectPickerStyles();
    if (selectedSelector) highlightSelected();
  };

  const enabledLinks = useCaseLinks.filter(l => l.isEnabled && l.globalUseCase);

  const iframeSrcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{margin:0;padding:0;}*{box-sizing:border-box;}a{pointer-events:auto !important;}</style>
    ${cssContent ? `<style>${cssContent}</style>` : ""}
    </head><body>${headerHtml}</body></html>`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <MousePointerClick className="w-4 h-4" />
          Link Header Element to Use Case
        </Label>
        {currentSelector && (
          <Badge variant="secondary" className="text-xs">
            Linked
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Select a button or link in the header (e.g., "Get a demo") and choose which use case it should navigate to when clicked.
      </p>

      {/* Header preview for picking */}
      <div className="border rounded-lg overflow-hidden bg-background relative">
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcDoc}
          className="w-full border-0"
          style={{ height: "auto", minHeight: "60px", maxHeight: "200px" }}
          title="Header element picker"
          sandbox="allow-same-origin"
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            try {
              const height = iframe.contentDocument?.body?.scrollHeight || 80;
              iframe.style.height = `${Math.min(height, 200)}px`;
            } catch {
              iframe.style.height = "80px";
            }
            handleIframeLoad();
          }}
        />
        {pickingMode && (
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <Badge className="bg-primary text-primary-foreground text-xs animate-pulse">
              Click an element to select it
            </Badge>
            <Button variant="destructive" size="sm" onClick={stopPicking} className="h-6 text-xs">
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!pickingMode ? (
          <Button variant="outline" size="sm" onClick={startPicking} className="gap-2">
            <MousePointerClick className="w-4 h-4" />
            {selectedSelector ? "Re-pick Element" : "Pick Element"}
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground">
            {hoveredSelector ? (
              <span className="font-mono bg-muted px-2 py-1 rounded">{hoveredSelector}</span>
            ) : (
              "Hover over a button or link..."
            )}
          </div>
        )}

        {selectedSelector && !pickingMode && (
          <>
            <Button variant="default" size="sm" onClick={handleApply} className="gap-1" disabled={!selectedUseCaseId}>
              <Check className="w-3 h-3" /> Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1">
              <RotateCcw className="w-3 h-3" /> Clear
            </Button>
          </>
        )}
      </div>

      {/* Use case selector - shown when an element is picked */}
      {selectedSelector && !pickingMode && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Navigate to Use Case</Label>
          {enabledLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No use cases linked to this demo. Add use cases in the Use Cases tab first.
            </p>
          ) : (
            <Select value={selectedUseCaseId} onValueChange={setSelectedUseCaseId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a use case..." />
              </SelectTrigger>
              <SelectContent>
                {enabledLinks.map((link) => (
                  <SelectItem key={link.useCaseId} value={link.useCaseId}>
                    {link.globalUseCase?.title || 'Unknown Use Case'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Selected element info */}
      {selectedSelector && !pickingMode && (
        <div className="p-2 rounded-md bg-muted/50 border text-xs space-y-1">
          {selectedLabel && (
            <div>
              <span className="font-medium">Element:</span>{" "}
              <span className="text-foreground">"{selectedLabel}"</span>
            </div>
          )}
          <div>
            <span className="font-medium">Selector:</span>{" "}
            <code className="font-mono text-xs bg-muted px-1 rounded">{selectedSelector}</code>
          </div>
          {selectedUseCaseId && enabledLinks.length > 0 && (
            <div>
              <span className="font-medium">Links to:</span>{" "}
              <span className="text-foreground">
                {enabledLinks.find(l => l.useCaseId === selectedUseCaseId)?.globalUseCase?.title || 'Unknown'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Manual CSS selector override */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Or enter CSS selector manually</Label>
        <div className="flex gap-2">
          <Input
            value={selectedSelector}
            onChange={(e) => setSelectedSelector(e.target.value)}
            placeholder='e.g. a.cta-button, #get-demo'
            className="font-mono text-xs h-8"
          />
          <Button variant="outline" size="sm" onClick={handleApply} className="h-8 text-xs" disabled={!selectedSelector || !selectedUseCaseId}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
