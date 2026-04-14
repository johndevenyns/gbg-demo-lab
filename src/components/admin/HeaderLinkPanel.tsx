import { useState, useRef, useCallback, useEffect } from "react";
import { MousePointerClick, X, Check, Trash2, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemoUseCaseLink } from "@/types/useCase";
import { useHeaderCtaLinks, useAddHeaderCtaLink, useDeleteHeaderCtaLink } from "@/hooks/useHeaderCtaLinks";
import { parseHotspotSelector, toHotspotSelector, HotspotRect } from "./HeaderHotspotPicker";

interface HeaderLinkPanelProps {
  active: boolean;
  onClose: () => void;
  demoId: string;
  useCaseLinks: DemoUseCaseLink[];
  /** For HTML mode: the selected element info */
  pendingSelector: string;
  pendingLabel: string;
  onClearPending: () => void;
  /** For screenshot mode: the drawn hotspot */
  pendingRect: HotspotRect | null;
  onClearPendingRect: () => void;
  isScreenshotMode: boolean;
}

export function HeaderLinkPanel({
  active,
  onClose,
  demoId,
  useCaseLinks,
  pendingSelector,
  pendingLabel,
  onClearPending,
  pendingRect,
  onClearPendingRect,
  isScreenshotMode,
}: HeaderLinkPanelProps) {
  const [pendingUseCaseId, setPendingUseCaseId] = useState("");

  const { data: ctaLinks = [] } = useHeaderCtaLinks(demoId);
  const addLink = useAddHeaderCtaLink();
  const deleteLink = useDeleteHeaderCtaLink();

  const enabledLinks = useCaseLinks.filter(l => l.isEnabled && l.globalUseCase);

  const handleSaveHtml = () => {
    if (!pendingSelector || !pendingUseCaseId) return;
    addLink.mutate({
      demoId,
      cssSelector: pendingSelector,
      useCaseId: pendingUseCaseId,
      elementLabel: pendingLabel || undefined,
      displayOrder: ctaLinks.length,
    });
    onClearPending();
    setPendingUseCaseId("");
  };

  const handleSaveHotspot = () => {
    if (!pendingRect || !pendingUseCaseId) return;
    addLink.mutate({
      demoId,
      cssSelector: toHotspotSelector(pendingRect),
      useCaseId: pendingUseCaseId,
      elementLabel: "Hotspot region",
      displayOrder: ctaLinks.length,
    });
    onClearPendingRect();
    setPendingUseCaseId("");
  };

  const handleDelete = (linkId: string) => {
    deleteLink.mutate({ id: linkId, demoId });
  };

  const hasPending = isScreenshotMode ? !!pendingRect : !!pendingSelector;

  if (!active) return null;

  return (
    <div className="absolute top-2 left-2 z-20 w-64 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3 space-y-3 max-h-[80%] overflow-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5" />
          Link Header
        </span>
        <div className="flex items-center gap-1">
          {ctaLinks.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {ctaLinks.length}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {isScreenshotMode
          ? "Draw a rectangle on the header to define a clickable region."
          : "Click a button or link in the header to select it."}
      </p>

      {ctaLinks.length > 0 && (
        <div className="space-y-1.5">
          {ctaLinks.map((link) => {
            const hotspot = parseHotspotSelector(link.cssSelector);
            const ucTitle = enabledLinks.find(l => l.useCaseId === link.useCaseId)?.globalUseCase?.title || "Unknown";
            return (
              <div key={link.id} className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50 border text-[10px]">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="font-medium truncate">
                    {hotspot
                      ? `Region (${hotspot.x.toFixed(0)}%, ${hotspot.y.toFixed(0)}%)`
                      : link.elementLabel || link.cssSelector}
                  </div>
                  <div className="text-muted-foreground">
                    → <span className="font-medium text-foreground">{ucTitle}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => handleDelete(link.id)}>
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {hasPending && (
        <div className="border rounded-md p-2 space-y-2 bg-muted/30">
          <div className="text-[10px] space-y-0.5">
            {isScreenshotMode && pendingRect ? (
              <div>
                <span className="font-medium">Region:</span>{" "}
                {pendingRect.x.toFixed(0)}%, {pendingRect.y.toFixed(0)}% — {pendingRect.w.toFixed(0)}×{pendingRect.h.toFixed(0)}%
              </div>
            ) : (
              <>
                {pendingLabel && <div className="font-medium truncate">"{pendingLabel}"</div>}
                <div className="truncate">
                  <code className="font-mono bg-muted px-1 rounded text-[9px]">{pendingSelector}</code>
                </div>
              </>
            )}
          </div>

          {enabledLinks.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No use cases linked to this demo yet.</p>
          ) : (
            <Select value={pendingUseCaseId} onValueChange={setPendingUseCaseId}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select use case..." />
              </SelectTrigger>
              <SelectContent>
                {enabledLinks.map((link) => (
                  <SelectItem key={link.useCaseId} value={link.useCaseId}>
                    {link.globalUseCase?.title || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-1.5">
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-6 text-[10px] gap-1"
              onClick={isScreenshotMode ? handleSaveHotspot : handleSaveHtml}
              disabled={!pendingUseCaseId}
            >
              <Check className="w-2.5 h-2.5" /> Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => {
                if (isScreenshotMode) onClearPendingRect();
                else onClearPending();
                setPendingUseCaseId("");
              }}
            >
              <RotateCcw className="w-2.5 h-2.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {!hasPending && (
        <div className="text-[10px] text-center text-muted-foreground py-2 border border-dashed rounded-md">
          {isScreenshotMode
            ? "Draw on the header above to create a hotspot"
            : "Click an element in the header above to select it"}
        </div>
      )}
    </div>
  );
}
