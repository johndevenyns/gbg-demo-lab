import { useState, useRef, useCallback } from 'react';
import { MousePointerClick, Plus, Trash2, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { DemoUseCaseLink } from '@/types/useCase';
import type { ExtraCustomPage } from '@/types/demo';
import type { PageHotspot, PageHotspotSlot } from '@/components/preview/ResultPage';

interface PageHotspotEditorProps {
  slot: PageHotspotSlot;
  imageUrl?: string;
  hotspots: PageHotspot[];
  onChange: (next: PageHotspot[]) => void;
  useCaseLinks: DemoUseCaseLink[];
  pages: ExtraCustomPage[];
  /** Slug of the current page if it's an extra page (so we can exclude self) */
  currentExtraPageSlug?: string;
}

const SLOT_LABEL: Record<PageHotspotSlot, string> = {
  main: 'Main',
  header: 'Header',
  footer: 'Footer',
};

function makeId() {
  return `h_${Math.random().toString(36).slice(2, 10)}`;
}

export function PageHotspotEditor({
  slot,
  imageUrl,
  hotspots,
  onChange,
  useCaseLinks,
  pages,
  currentExtraPageSlug,
}: PageHotspotEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pickingMode, setPickingMode] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const slotHotspots = hotspots.filter(h => h.slot === slot);
  const enabledUseCases = useCaseLinks.filter(l => l.isEnabled && l.globalUseCase);
  const otherPages = pages.filter(p => p.slug !== currentExtraPageSlug);

  const getCoords = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleDown = (e: React.MouseEvent) => {
    if (!pickingMode) return;
    e.preventDefault();
    const c = getCoords(e);
    setDrawStart(c); setDrawCurrent(c); setDrawing(true);
  };
  const handleMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    setDrawCurrent(getCoords(e));
  };
  const handleUp = () => {
    if (!drawing || !drawStart || !drawCurrent) return;
    setDrawing(false);
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    setDrawStart(null); setDrawCurrent(null);
    if (w < 2 && h < 2) return;
    const id = makeId();
    const next: PageHotspot = {
      id, slot, rect: { x, y, w, h },
      linkKind: enabledUseCases[0] ? 'use_case' : otherPages[0] ? 'page' : 'url',
      useCaseId: enabledUseCases[0]?.useCaseId,
      pageSlug: otherPages[0]?.slug,
    };
    onChange([...hotspots, next]);
    setPickingMode(false);
    setEditingId(id);
  };

  const updateHotspot = (id: string, patch: Partial<PageHotspot>) => {
    onChange(hotspots.map(h => h.id === id ? { ...h, ...patch } : h));
  };
  const deleteHotspot = (id: string) => {
    onChange(hotspots.filter(h => h.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const drawingRect = drawing && drawStart && drawCurrent ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  if (!imageUrl) {
    return (
      <div className="border border-dashed rounded-md p-3 text-xs text-muted-foreground text-center">
        Upload a {SLOT_LABEL[slot].toLowerCase()} image to add clickable links.
      </div>
    );
  }

  return (
    <div className="space-y-2 border rounded-md p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5" />
          {SLOT_LABEL[slot]} links
        </Label>
        <div className="flex items-center gap-2">
          {slotHotspots.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{slotHotspots.length}</Badge>
          )}
          {!pickingMode ? (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPickingMode(true)}>
              <Plus className="w-3 h-3" /> Draw link
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="sm" className="h-7 text-xs" onClick={() => setPickingMode(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative select-none border rounded overflow-hidden bg-muted"
        style={{ cursor: pickingMode ? 'crosshair' : 'default' }}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={() => { if (drawing) handleUp(); }}
      >
        <img src={imageUrl} alt={SLOT_LABEL[slot]} className="block w-full h-auto" draggable={false} />
        {slotHotspots.map(h => (
          <div
            key={h.id}
            onClick={(e) => { if (!pickingMode) { e.stopPropagation(); setEditingId(h.id); } }}
            className={`absolute border-2 rounded-sm ${editingId === h.id ? 'border-primary bg-primary/20' : 'border-green-500 bg-green-500/15'} ${pickingMode ? 'pointer-events-none' : 'cursor-pointer'}`}
            style={{
              left: `${h.rect.x}%`,
              top: `${h.rect.y}%`,
              width: `${h.rect.w}%`,
              height: `${h.rect.h}%`,
            }}
          />
        ))}
        {drawingRect && (
          <div className="absolute border-2 border-primary bg-primary/20 rounded-sm pointer-events-none"
            style={{ left: `${drawingRect.x}%`, top: `${drawingRect.y}%`, width: `${drawingRect.w}%`, height: `${drawingRect.h}%` }}
          />
        )}
        {pickingMode && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary text-primary-foreground text-[10px] animate-pulse">Click and drag to draw</Badge>
          </div>
        )}
      </div>

      {slotHotspots.length > 0 && (
        <div className="space-y-2">
          {slotHotspots.map(h => (
            <div key={h.id} className={`border rounded-md p-2 space-y-2 ${editingId === h.id ? 'bg-muted/50 border-primary/50' : 'bg-muted/20'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] text-muted-foreground">
                  {h.rect.x.toFixed(0)}%, {h.rect.y.toFixed(0)}% · {h.rect.w.toFixed(0)}×{h.rect.h.toFixed(0)}%
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingId(editingId === h.id ? null : h.id)}>
                    {editingId === h.id ? 'Done' : 'Edit'}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteHotspot(h.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {editingId === h.id && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Link to</Label>
                      <Select value={h.linkKind} onValueChange={(v) => updateHotspot(h.id, { linkKind: v as PageHotspot['linkKind'] })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="use_case">Use case</SelectItem>
                          <SelectItem value="page">Custom page</SelectItem>
                          <SelectItem value="url">External URL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      {h.linkKind === 'use_case' && (
                        <>
                          <Label className="text-[10px]">Use case</Label>
                          {enabledUseCases.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground">No use cases linked to this demo.</p>
                          ) : (
                            <Select value={h.useCaseId || ''} onValueChange={(v) => updateHotspot(h.id, { useCaseId: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {enabledUseCases.map(l => (
                                  <SelectItem key={l.useCaseId} value={l.useCaseId}>{l.globalUseCase?.title || 'Unknown'}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </>
                      )}
                      {h.linkKind === 'page' && (
                        <>
                          <Label className="text-[10px]">Custom page</Label>
                          {otherPages.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground">No other custom pages defined.</p>
                          ) : (
                            <Select value={h.pageSlug || ''} onValueChange={(v) => updateHotspot(h.id, { pageSlug: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {otherPages.map(p => (
                                  <SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </>
                      )}
                      {h.linkKind === 'url' && (
                        <>
                          <Label className="text-[10px]">URL</Label>
                          <Input
                            type="url"
                            className="h-7 text-xs"
                            value={h.url || ''}
                            onChange={(e) => updateHotspot(h.id, { url: e.target.value })}
                            placeholder="https://example.com"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  {h.linkKind === 'url' && (
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px]">Open in new tab</Label>
                      <Switch checked={!!h.openInNewTab} onCheckedChange={(v) => updateHotspot(h.id, { openInNewTab: v })} />
                    </div>
                  )}
                  <div>
                    <Label className="text-[10px]">Label (optional)</Label>
                    <Input
                      className="h-7 text-xs"
                      value={h.label || ''}
                      onChange={(e) => updateHotspot(h.id, { label: e.target.value })}
                      placeholder="Accessibility / internal label"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}