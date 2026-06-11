import { useState, useCallback, useMemo } from 'react';
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
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, UserPlus, FastForward, Package, Layout, Eye,
  ArrowUp, ArrowDown, X,
} from 'lucide-react';
import { DemoUseCaseLink, UseCasePageContent } from '@/types/useCase';
import { DemoEnvironment, FormStep } from '@/types/demo';
import {
  useGlobalUseCases, useDemoUseCaseLinks,
  useAddDemoUseCaseLink, useUpdateDemoUseCaseLink, useRemoveDemoUseCaseLink,
} from '@/hooks/useUseCases';
import { useIndustries } from '@/hooks/useIndustries';
import { FormBuilderSection } from '@/components/formBuilder';
import { FormPreviewPanel } from '@/components/formBuilder/FormPreviewPanel';
import { PortalPreviewDialog } from './PortalPreviewDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistedState } from '@/hooks/usePersistedState';

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, FastForward, Package, Briefcase,
};

interface UseCaseSectionProps {
  demoId: string;
  demo: DemoEnvironment;
  onUpdateDemo: (updates: Partial<DemoEnvironment>, autoSave?: boolean) => void;
}

export function UseCaseSection({ demoId, demo, onUpdateDemo }: UseCaseSectionProps) {
  const { data: globalUseCases = [] } = useGlobalUseCases();
  const { data: links = [], isLoading } = useDemoUseCaseLinks(demoId);
  const addLink = useAddDemoUseCaseLink();
  const updateLink = useUpdateDemoUseCaseLink();
  const removeLink = useRemoveDemoUseCaseLink();
  const [expandedId, setExpandedId] = usePersistedState<string | null>(
    `useCaseSection.expandedId.${demoId}`,
    null,
  );
  const [formBuilderLinkId, setFormBuilderLinkId] = usePersistedState<string | null>(
    `useCaseSection.formBuilderLinkId.${demoId}`,
    null,
  );
  const [showPortalPreview, setShowPortalPreview] = useState(false);
  const { data: allIndustries = [] } = useIndustries();
  // Track which tab is active in the form builder area: 'builder' or 'preview'
  const [builderTab, setBuilderTab] = usePersistedState<'builder' | 'preview'>(
    `useCaseSection.builderTab.${demoId}`,
    'builder',
  );

  const demoIndustry = useMemo(() => {
    if (!demo.industryId) return null;
    return allIndustries.find(i => i.id === demo.industryId) ?? null;
  }, [demo.industryId, allIndustries]);

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

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    const current = links[index];
    const above = links[index - 1];
    updateLink.mutate({ id: current.id, demoId, updates: { displayOrder: above.displayOrder } });
    updateLink.mutate({ id: above.id, demoId, updates: { displayOrder: current.displayOrder } });
  }, [links, updateLink, demoId]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= links.length - 1) return;
    const current = links[index];
    const below = links[index + 1];
    updateLink.mutate({ id: current.id, demoId, updates: { displayOrder: below.displayOrder } });
    updateLink.mutate({ id: below.id, demoId, updates: { displayOrder: current.displayOrder } });
  }, [links, updateLink, demoId]);

  // Create a virtual DemoEnvironment scoped to a specific use case link
  const createUseCaseDemo = useCallback((link: DemoUseCaseLink): DemoEnvironment => {
    const globalSteps = link.globalUseCase?.defaultFormSteps ?? [];
    const steps = link.formStepsOverride ?? globalSteps;
    return {
      ...demo,
      formSteps: steps as unknown as FormStep[],
    };
  }, [demo]);

  // Handle form step updates scoped to a use case link
  const createUseCaseUpdateHandler = useCallback((linkId: string) => {
    return (updates: Partial<DemoEnvironment>, autoSave?: boolean) => {
      if (updates.formSteps !== undefined) {
        handleUpdate(linkId, {
          formStepsOverride: updates.formSteps as unknown as Record<string, unknown>[],
        });
      }
      // Pass through non-formSteps updates to the demo itself
      const { formSteps, ...rest } = updates;
      if (Object.keys(rest).length > 0) {
        onUpdateDemo(rest, autoSave);
      }
    };
  }, [handleUpdate, onUpdateDemo]);

  // The active form builder link data
  const activeBuilderLink = formBuilderLinkId ? links.find(l => l.id === formBuilderLinkId) : null;
  const activeBuilderDemo = activeBuilderLink ? createUseCaseDemo(activeBuilderLink) : null;
  const activeBuilderTitle = activeBuilderLink?.globalUseCase?.title ?? 'Use Case';

  return (
    <div className="space-y-6">
      {/* Use Case List */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Use Cases
              </CardTitle>
              <CardDescription>
                Manage verification journeys for this demo
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {demoIndustry && demoIndustry.portalType !== 'none' && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowPortalPreview(true)}>
                  <Eye className="w-4 h-4" /> Preview Portal
                </Button>
              )}
              {availableToAdd.length > 0 && (
                <Select onValueChange={handleAdd}>
                  <SelectTrigger className="w-[200px]">
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
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : links.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No use cases added yet.</p>
              <p className="text-xs mt-1">Use the dropdown above to add one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map((link, index) => {
                const uc = link.globalUseCase;
                if (!uc) return null;
                const IconComp = ICON_MAP[uc.iconName] ?? Package;
                const isExpanded = expandedId === link.id;
                const hasOverride = !!link.formStepsOverride || !!link.pageContentOverride || !!link.verificationTypeOverride;
                const isBuilderActive = formBuilderLinkId === link.id;

                return (
                  <Collapsible key={link.id} open={isExpanded} onOpenChange={(open) => {
                    setExpandedId(open ? link.id : null);
                    if (!open && isBuilderActive) setFormBuilderLinkId(null);
                  }}>
                    <div className="border rounded-lg overflow-hidden">
                      {/* Row header */}
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                          <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === 0} onClick={() => handleMoveUp(index)}>
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === links.length - 1} onClick={() => handleMoveDown(index)}>
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                          <IconComp className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{link.titleOverride || uc.title}</span>
                              {hasOverride && <Badge variant="outline" className="text-[10px]">Customized</Badge>}
                              {!link.isEnabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                              {!link.showOnLandingPage && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                            </div>
                          </div>
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={link.isEnabled}
                              onCheckedChange={(v) => handleUpdate(link.id, { isEnabled: v })}
                            />
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
                          {/* Settings grid - compact two-column layout */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Use Case Name</Label>
                              <Input
                                placeholder={uc.title}
                                defaultValue={link.titleOverride ?? ''}
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  const val = e.target.value.trim() || null;
                                  handleUpdate(link.id, { titleOverride: val });
                                }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Tab Label</Label>
                              <Input
                                placeholder={link.titleOverride || uc.title}
                                defaultValue={link.pageContentOverride?.tabLabel ?? ''}
                                className="h-8 text-sm"
                                onBlur={(e) => {
                                  const val = e.target.value.trim() || undefined;
                                  const existing = link.pageContentOverride || {};
                                  handleUpdate(link.id, {
                                    pageContentOverride: { ...existing, tabLabel: val },
                                  });
                                }}
                              />
                            </div>
                          </div>

                          {/* Toggles row */}
                          <div className="flex flex-wrap items-center gap-6 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={link.showOnLandingPage}
                                onCheckedChange={(v) => handleUpdate(link.id, { showOnLandingPage: v })}
                                className="scale-90"
                              />
                              <span className="text-xs">Show on Landing Page</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={link.pageContentOverride?.showLandingPage ?? uc.defaultPageContent?.showLandingPage ?? false}
                                onCheckedChange={(v) => {
                                  const existing = link.pageContentOverride || {};
                                  handleUpdate(link.id, {
                                    pageContentOverride: { ...existing, showLandingPage: v },
                                  });
                                }}
                                className="scale-90"
                              />
                              <span className="text-xs">Show Landing Page</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={link.showFillPass ?? uc.showFillPass}
                                onCheckedChange={(v) => handleUpdate(link.id, { showFillPass: v })}
                                className="scale-90"
                              />
                              <span className="text-xs">Fill Pass</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={link.showFillFail ?? uc.showFillFail}
                                onCheckedChange={(v) => handleUpdate(link.id, { showFillFail: v })}
                                className="scale-90"
                              />
                              <span className="text-xs">Fill Fail</span>
                            </label>
                          </div>

                          {/* Page content overrides - collapsible for less clutter */}
                          <Collapsible>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7 px-2">
                                <ChevronRight className="w-3 h-3 transition-transform [[data-state=open]>&]:rotate-90" />
                                Page Content Overrides
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pl-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Hero Title</Label>
                                  <Input
                                    placeholder={uc.defaultPageContent?.heroTitle || 'Inherited from global'}
                                    defaultValue={link.pageContentOverride?.heroTitle ?? ''}
                                    className="h-8 text-sm"
                                    onBlur={(e) => {
                                      const val = e.target.value || undefined;
                                      const existing = link.pageContentOverride || {};
                                      handleUpdate(link.id, {
                                        pageContentOverride: val ? { ...existing, heroTitle: val } : existing,
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Hero Subtitle</Label>
                                  <Input
                                    placeholder={uc.defaultPageContent?.heroSubtitle || 'Inherited from global'}
                                    defaultValue={link.pageContentOverride?.heroSubtitle ?? ''}
                                    className="h-8 text-sm"
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
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Action buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <Button
                              variant={isBuilderActive ? "default" : "outline"}
                              size="sm"
                              className="gap-2 h-8 text-xs"
                              onClick={() => {
                                setFormBuilderLinkId(isBuilderActive ? null : link.id);
                                setBuilderTab('builder');
                              }}
                            >
                              <Layout className="w-3.5 h-3.5" />
                              {isBuilderActive ? 'Close Workflow Builder' : 'Edit Form Steps'}
                              {link.formStepsOverride && (
                                <Badge variant="outline" className="text-[9px] ml-1">Overridden</Badge>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive h-8 text-xs"
                              onClick={() => handleRemove(link.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
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

      {/* Form Builder + Preview for the active use case */}
      {activeBuilderLink && activeBuilderDemo && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  {activeBuilderTitle}
                </CardTitle>
                <CardDescription className="text-xs">
                  Build form steps and preview the flow for this use case
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={builderTab} onValueChange={(v) => setBuilderTab(v as 'builder' | 'preview')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="builder" className="text-xs h-7 px-3 gap-1.5">
                      <Layout className="w-3.5 h-3.5" />
                      Builder
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs h-7 px-3 gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFormBuilderLinkId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {builderTab === 'builder' ? (
              <FormBuilderSection
                demo={activeBuilderDemo}
                onUpdate={createUseCaseUpdateHandler(formBuilderLinkId!)}
              />
            ) : (
              <div className="p-6">
                <FormPreviewPanel demo={activeBuilderDemo} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Portal Preview */}
      {showPortalPreview && demoIndustry && (
        <PortalPreviewDialog
          open={true}
          onOpenChange={() => setShowPortalPreview(false)}
          portalType={demoIndustry.portalType}
          portalConfig={demoIndustry.portalConfig}
          brandingOverrides={{
            bankName: demo.customerName,
            accentColor: demo.buttonColor || undefined,
            logoUrl: demo.useUploadedLogo ? demo.uploadedLogoUrl || undefined : demo.logoUrl || undefined,
          }}
        />
      )}
    </div>
  );
}
