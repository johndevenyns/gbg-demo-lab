import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, UserPlus, FastForward, Package,
} from 'lucide-react';
import { DemoUseCaseLink, UseCasePageContent } from '@/types/useCase';
import {
  useGlobalUseCases, useDemoUseCaseLinks,
  useAddDemoUseCaseLink, useUpdateDemoUseCaseLink, useRemoveDemoUseCaseLink,
} from '@/hooks/useUseCases';

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, FastForward, Package, Briefcase,
};

interface UseCaseSectionProps {
  demoId: string;
}

export function UseCaseSection({ demoId }: UseCaseSectionProps) {
  const { data: globalUseCases = [] } = useGlobalUseCases();
  const { data: links = [], isLoading } = useDemoUseCaseLinks(demoId);
  const addLink = useAddDemoUseCaseLink();
  const updateLink = useUpdateDemoUseCaseLink();
  const removeLink = useRemoveDemoUseCaseLink();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Use cases already linked to this demo
  const linkedUseCaseIds = new Set(links.map(l => l.useCaseId));
  const availableToAdd = globalUseCases.filter(uc => !linkedUseCaseIds.has(uc.id) && uc.isEnabled);

  const handleAdd = (useCaseId: string) => {
    addLink.mutate({ demoId, useCaseId, displayOrder: links.length });
  };

  const handleUpdate = useCallback((linkId: string, updates: Partial<DemoUseCaseLink>) => {
    updateLink.mutate({ id: linkId, demoId, updates });
  }, [updateLink, demoId]);

  const handleRemove = useCallback((linkId: string) => {
    if (confirm('Remove this use case from this demo?')) {
      removeLink.mutate({ id: linkId, demoId });
    }
  }, [removeLink, demoId]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Use Cases
            </CardTitle>
            <CardDescription>
              Select which use cases are available in this demo. Each use case can have its own form steps and verification settings.
            </CardDescription>
          </div>
          {availableToAdd.length > 0 && (
            <Select onValueChange={handleAdd}>
              <SelectTrigger className="w-[220px]">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Use Case</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map(uc => (
                  <SelectItem key={uc.id} value={uc.id}>
                    {uc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : links.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No use cases added to this demo yet.</p>
            <p className="text-xs mt-1">Use the dropdown above to add a global use case.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const uc = link.globalUseCase;
              if (!uc) return null;
              const IconComp = ICON_MAP[uc.iconName] ?? Package;
              const isExpanded = expandedId === link.id;
              const hasOverride = !!link.formStepsOverride || !!link.pageContentOverride || !!link.verificationTypeOverride;

              return (
                <Collapsible key={link.id} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? link.id : null)}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                        <IconComp className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{uc.title}</span>
                            {hasOverride && (
                              <Badge variant="outline" className="text-[10px]">Customized</Badge>
                            )}
                            {!link.isEnabled && (
                              <Badge variant="secondary" className="text-[10px]">Disabled</Badge>
                            )}
                          </div>
                          {uc.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{uc.description}</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-4 space-y-4">
                        {/* Override page content */}
                        <div>
                          <h4 className="text-sm font-medium mb-3">Page Content Override</h4>
                          <p className="text-xs text-muted-foreground mb-3">Leave blank to inherit from global defaults</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Hero Title</Label>
                              <Input
                                placeholder={uc.defaultPageContent?.heroTitle || 'Inherited from global'}
                                defaultValue={link.pageContentOverride?.heroTitle ?? ''}
                                onBlur={(e) => {
                                  const val = e.target.value || undefined;
                                  const existing = link.pageContentOverride || {};
                                  handleUpdate(link.id, {
                                    pageContentOverride: val ? { ...existing, heroTitle: val } : existing,
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Hero Subtitle</Label>
                              <Input
                                placeholder={uc.defaultPageContent?.heroSubtitle || 'Inherited from global'}
                                defaultValue={link.pageContentOverride?.heroSubtitle ?? ''}
                                onBlur={(e) => {
                                  const val = e.target.value || undefined;
                                  const existing = link.pageContentOverride || {};
                                  handleUpdate(link.id, {
                                    pageContentOverride: val ? { ...existing, heroSubtitle: val } : existing,
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t pt-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={link.isEnabled}
                              onCheckedChange={(v) => handleUpdate(link.id, { isEnabled: v })}
                            />
                            <span className="text-sm text-muted-foreground">Enabled</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemove(link.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
