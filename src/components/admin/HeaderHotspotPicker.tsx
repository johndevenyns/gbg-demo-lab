import { useState, useRef, useCallback } from "react";
import { MousePointerClick, Plus, Trash2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoUseCaseLink } from "@/types/useCase";
import { useHeaderCtaLinks, useAddHeaderCtaLink, useDeleteHeaderCtaLink } from "@/hooks/useHeaderCtaLinks";

interface HeaderHotspotPickerProps {
  demoId: string;
  headerHtml: string;
  useCaseLinks: DemoUseCaseLink[];
}

export interface HotspotRect {
  x: number; // percentage 0-100
  y: number;
  w: number;
  h: number;
}

export function parseHotspotSelector(selector: string): HotspotRect | null {
  const match = selector.match(/^hotspot:([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/);
  if (!match) return null;
  return { x: +match[1], y: +match[2], w: +match[3], h: +match[4] };
}

export function toHotspotSelector(rect: HotspotRect): string {
  return `hotspot:${rect.x.toFixed(2)},${rect.y.toFixed(2)},${rect.w.toFixed(2)},${rect.h.toFixed(2)}`;
}

export function HeaderHotspotPicker({ demoId, headerHtml, useCaseLinks }: HeaderHotspotPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [pendingRect, setPendingRect] = useState<HotspotRect | null>(null);
  const [pendingUseCaseId, setPendingUseCaseId] = useState("");
  const [pickingMode, setPickingMode] = useState(false);

  const { data: ctaLinks = [] } = useHeaderCtaLinks(demoId);
  const addLink = useAddHeaderCtaLink();
  const deleteLink = useDeleteHeaderCtaLink();

  const enabledLinks = useCaseLinks.filter(l => l.isEnabled && l.globalUseCase);

  // Extract img src from the header HTML
  const imgSrc = headerHtml.match(/src="([^"]+)"/)?.[1] || "";

  const getRelativeCoords = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pickingMode) return;
    e.preventDefault();
    const coords = getRelativeCoords(e);
    setDrawStart(coords);
    setDrawCurrent(coords);
    setDrawing(true);
  }, [pickingMode, getRelativeCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return;
    setDrawCurrent(getRelativeCoords(e));
  }, [drawing, getRelativeCoords]);

  const handleMouseUp = useCallback(() => {
    if (!drawing || !drawStart || !drawCurrent) return;
    setDrawing(false);
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    // Ignore very small accidental clicks
    if (w < 2 && h < 2) {
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }
    setPendingRect({ x, y, w, h });
    setPendingUseCaseId("");
    setPickingMode(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [drawing, drawStart, drawCurrent]);

  const handleSave = () => {
    if (!pendingRect || !pendingUseCaseId) return;
    addLink.mutate({
      demoId,
      cssSelector: toHotspotSelector(pendingRect),
      useCaseId: pendingUseCaseId,
      elementLabel: "Hotspot region",
      displayOrder: ctaLinks.length,
    });
    setPendingRect(null);
    setPendingUseCaseId("");
  };

  const handleDelete = (linkId: string) => {
    deleteLink.mutate({ id: linkId, demoId });
  };

  // Current drawing rect for visual feedback
  const drawingRect = drawing && drawStart && drawCurrent ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <MousePointerClick className="w-4 h-4" />
          Link Header Regions to Use Cases
        </Label>
        {ctaLinks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {ctaLinks.length} link{ctaLinks.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Draw a rectangle on the header image to define a clickable region, then map it to a use case.
      </p>

      {/* Existing hotspot links */}
      {ctaLinks.length > 0 && (
        <div className="space-y-2">
          {ctaLinks.map((link) => {
            const hotspot = parseHotspotSelector(link.cssSelector);
            const ucTitle = enabledLinks.find(l => l.useCaseId === link.useCaseId)?.globalUseCase?.title || "Unknown";
            return (
              <div key={link.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border text-xs">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="font-medium truncate">
                    {hotspot
                      ? `Region (${hotspot.x.toFixed(0)}%, ${hotspot.y.toFixed(0)}%) ${hotspot.w.toFixed(0)}×${hotspot.h.toFixed(0)}%`
                      : link.elementLabel || link.cssSelector}
                  </div>
                  <div className="text-muted-foreground">
                    → <span className="font-medium text-foreground">{ucTitle}</span>
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

      {/* Image with hotspot overlay */}
      <div className="border rounded-lg overflow-hidden bg-background relative">
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ cursor: pickingMode ? "crosshair" : "default" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (drawing) handleMouseUp(); }}
        >
          <img src={imgSrc} alt="Header screenshot" className="block w-full h-auto" draggable={false} />

          {/* Existing hotspot overlays */}
          {ctaLinks.map((link) => {
            const hotspot = parseHotspotSelector(link.cssSelector);
            if (!hotspot) return null;
            return (
              <div
                key={link.id}
                className="absolute border-2 border-green-500 bg-green-500/15 rounded-sm pointer-events-none"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.w}%`,
                  height: `${hotspot.h}%`,
                }}
              />
            );
          })}

          {/* Pending rect */}
          {pendingRect && (
            <div
              className="absolute border-2 border-primary bg-primary/20 rounded-sm pointer-events-none animate-pulse"
              style={{
                left: `${pendingRect.x}%`,
                top: `${pendingRect.y}%`,
                width: `${pendingRect.w}%`,
                height: `${pendingRect.h}%`,
              }}
            />
          )}

          {/* Active drawing rect */}
          {drawingRect && (
            <div
              className="absolute border-2 border-primary bg-primary/20 rounded-sm pointer-events-none"
              style={{
                left: `${drawingRect.x}%`,
                top: `${drawingRect.y}%`,
                width: `${drawingRect.w}%`,
                height: `${drawingRect.h}%`,
              }}
            />
          )}

          {pickingMode && (
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
              <Badge className="bg-primary text-primary-foreground text-xs animate-pulse">
                Click and drag to draw a region
              </Badge>
              <Button variant="destructive" size="sm" onClick={() => setPickingMode(false)} className="h-6 text-xs">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!pickingMode && !pendingRect && (
          <Button variant="outline" size="sm" onClick={() => setPickingMode(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Draw Hotspot Region
          </Button>
        )}
      </div>

      {/* Pending form */}
      {pendingRect && !pickingMode && (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="text-xs">
            <span className="font-medium">Region:</span>{" "}
            {pendingRect.x.toFixed(0)}%, {pendingRect.y.toFixed(0)}% — {pendingRect.w.toFixed(0)}×{pendingRect.h.toFixed(0)}%
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
                      {link.globalUseCase?.title || "Unknown Use Case"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSave} disabled={!pendingUseCaseId} className="gap-1">
              <Check className="w-3 h-3" /> Add Hotspot
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setPendingRect(null); setPendingUseCaseId(""); }} className="gap-1">
              <RotateCcw className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
