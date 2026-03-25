import { useState, useRef, useCallback, useEffect } from "react";
import { MousePointerClick, X, Check, RotateCcw, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoUseCaseLink } from "@/types/useCase";
import { HeaderCtaLink, useHeaderCtaLinks, useAddHeaderCtaLink, useDeleteHeaderCtaLink } from "@/hooks/useHeaderCtaLinks";

interface HeaderElementPickerProps {
  demoId: string;
  headerHtml: string;
  cssContent?: string;
  useCaseLinks: DemoUseCaseLink[];
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
  demoId,
  headerHtml,
  cssContent,
  useCaseLinks,
}: HeaderElementPickerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pickingMode, setPickingMode] = useState(false);
  const [hoveredSelector, setHoveredSelector] = useState<string | null>(null);
  const [pendingSelector, setPendingSelector] = useState<string>("");
  const [pendingLabel, setPendingLabel] = useState<string>("");
  const [pendingUseCaseId, setPendingUseCaseId] = useState<string>("");

  const { data: ctaLinks = [] } = useHeaderCtaLinks(demoId);
  const addLink = useAddHeaderCtaLink();
  const deleteLink = useDeleteHeaderCtaLink();

  const enabledLinks = useCaseLinks.filter(l => l.isEnabled && l.globalUseCase);

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

  const highlightExisting = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc) return;
    doc.querySelectorAll("[data-cta-selected]").forEach((el) => el.removeAttribute("data-cta-selected"));
    ctaLinks.forEach((link) => {
      try {
        const el = doc.querySelector(link.cssSelector);
        if (el) el.setAttribute("data-cta-selected", "true");
      } catch {}
    });
  }, [getIframeDoc, ctaLinks]);

  const startPicking = useCallback(() => {
    const doc = getIframeDoc();
    if (!doc) return;
    setPickingMode(true);
    setPendingSelector("");
    setPendingLabel("");
    setPendingUseCaseId("");
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
      setPendingSelector(sel);
      setPendingLabel(label);
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

  const handleSaveNew = () => {
    if (!pendingSelector || !pendingUseCaseId) return;
    addLink.mutate({
      demoId,
      cssSelector: pendingSelector,
      useCaseId: pendingUseCaseId,
      elementLabel: pendingLabel || undefined,
      displayOrder: ctaLinks.length,
    });
    setPendingSelector("");
    setPendingLabel("");
    setPendingUseCaseId("");
  };

  const handleDelete = (linkId: string) => {
    deleteLink.mutate({ id: linkId, demoId });
  };

  const handleIframeLoad = () => {
    injectPickerStyles();
    highlightExisting();
  };

  const iframeSrcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{margin:0;padding:0;}*{box-sizing:border-box;}a{pointer-events:auto !important;}</style>
    ${cssContent ? `<style>${cssContent}</style>` : ""}
    </head><body>${headerHtml}</body></html>`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <MousePointerClick className="w-4 h-4" />
          Link Header Elements to Use Cases
        </Label>
        {ctaLinks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {ctaLinks.length} link{ctaLinks.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Pick buttons or links in the header and map each one to a different use case.
      </p>

      {/* Existing CTA links list */}
      {ctaLinks.length > 0 && (
        <div className="space-y-2">
          {ctaLinks.map((link) => {
            const ucTitle = enabledLinks.find(l => l.useCaseId === link.useCaseId)?.globalUseCase?.title || 'Unknown';
            return (
              <div key={link.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border text-xs">
                <div className="flex-1 min-w-0 space-y-0.5">
                  {link.elementLabel && (
                    <div className="font-medium truncate">"{link.elementLabel}"</div>
                  )}
                  <div className="text-muted-foreground">
                    <code className="font-mono bg-muted px-1 rounded text-[10px]">{link.cssSelector}</code>
                    {' → '}
                    <span className="font-medium text-foreground">{ucTitle}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(link.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Pick / Add controls */}
      <div className="flex items-center gap-2">
        {!pickingMode && !pendingSelector && (
          <Button variant="outline" size="sm" onClick={startPicking} className="gap-2">
            <Plus className="w-4 h-4" />
            Pick Element to Link
          </Button>
        )}
        {pickingMode && (
          <div className="text-xs text-muted-foreground">
            {hoveredSelector ? (
              <span className="font-mono bg-muted px-2 py-1 rounded">{hoveredSelector}</span>
            ) : (
              "Hover over a button or link..."
            )}
          </div>
        )}
      </div>

      {/* Pending new link form */}
      {pendingSelector && !pickingMode && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="text-xs space-y-1">
            {pendingLabel && (
              <div><span className="font-medium">Element:</span> "{pendingLabel}"</div>
            )}
            <div><span className="font-medium">Selector:</span> <code className="font-mono bg-muted px-1 rounded">{pendingSelector}</code></div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Navigate to Use Case</Label>
            {enabledLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No use cases linked to this demo yet.</p>
            ) : (
              <Select value={pendingUseCaseId} onValueChange={setPendingUseCaseId}>
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

          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSaveNew} disabled={!pendingUseCaseId} className="gap-1">
              <Check className="w-3 h-3" /> Add Link
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setPendingSelector(""); setPendingLabel(""); setPendingUseCaseId(""); }} className="gap-1">
              <RotateCcw className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Manual CSS selector */}
      {!pendingSelector && !pickingMode && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Or enter CSS selector manually</Label>
          <div className="flex gap-2">
            <Input
              value={pendingSelector}
              onChange={(e) => setPendingSelector(e.target.value)}
              placeholder='e.g. a.cta-button, #get-demo'
              className="font-mono text-xs h-8"
            />
          </div>
        </div>
      )}
    </div>
  );
}
