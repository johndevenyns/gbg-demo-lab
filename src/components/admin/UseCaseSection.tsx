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
  GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react';
import { DemoUseCaseLink, UseCasePageContent } from '@/types/useCase';
import { DemoEnvironment, FormStep } from '@/types/demo';
import {
  useGlobalUseCases, useDemoUseCaseLinks,
  useAddDemoUseCaseLink, useUpdateDemoUseCaseLink, useRemoveDemoUseCaseLink,
} from '@/hooks/useUseCases';
import { useIndustries } from '@/hooks/useIndustries';
import { FormBuilderSection } from '@/components/formBuilder';
import { PortalPreviewDialog } from './PortalPreviewDialog';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formBuilderLinkId, setFormBuilderLinkId] = useState<string | null>(null);
  const [showPortalPreview, setShowPortalPreview] = useState(false);
  const { data: allIndustries = [] } = useIndustries();

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

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Use Cases
              </CardTitle>
              <CardDescription>
                Select which use cases are available in this demo. Each use case has its own form steps and verification settings.
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
                const showFormBuilder = formBuilderLinkId === link.id;

                return (
                  <Collapsible key={link.id} open={isExpanded} onOpenChange={(open) => {
                    setExpandedId(open ? link.id : null);
                    if (!open && formBuilderLinkId === link.id) setFormBuilderLinkId(null);
                  }}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                          <IconComp className="w-5 h-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{link.titleOverride || uc.title}</span>
                              {link.titleOverride && (
                                <Badge variant="outline" className="text-[10px]">Renamed</Badge>
                              )}
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
                        <div className="border-t p-4 space-y-4">
                          {/* Use Case Name Override */}
                          <div className="space-y-2">
                            <Label className="text-sm">Use Case Name</Label>
                            <Input
                              placeholder={uc.title}
                              defaultValue={link.titleOverride ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim() || null;
                                handleUpdate(link.id, { titleOverride: val });
                              }}
                            />
                            <p className="text-xs text-muted-foreground">Leave blank to use the global name "{uc.title}"</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={link.showOnLandingPage}
                              onCheckedChange={(v) => {
                                handleUpdate(link.id, { showOnLandingPage: v });
                              }}
                            />
                            <div>
                              <Label className="text-sm">Show on Landing Page</Label>
                              <p className="text-xs text-muted-foreground">When off, this use case won't appear in the landing page tabs (e.g. step-up verification flows)</p>
                            </div>
                          </div>

                          {/* Landing Page Toggle */}
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={link.pageContentOverride?.showLandingPage ?? uc.defaultPageContent?.showLandingPage ?? false}
                              onCheckedChange={(v) => {
                                const existing = link.pageContentOverride || {};
                                handleUpdate(link.id, {
                                  pageContentOverride: { ...existing, showLandingPage: v },
                                });
                              }}
                            />
                            <div>
                              <Label className="text-sm">Show Landing Page</Label>
                              <p className="text-xs text-muted-foreground">When off, users go directly to the first form step</p>
                            </div>
                          </div>

                          {/* Page Content Override */}
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



                          {/* Form Builder Toggle */}
                          <div className="border-t pt-4">
                            <Button
                              variant={showFormBuilder ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFormBuilderLinkId(showFormBuilder ? null : link.id)}
                              className="gap-2"
                            >
                              <Layout className="w-4 h-4" />
                              {showFormBuilder ? 'Hide Form Builder' : 'Edit Form Steps'}
                              {link.formStepsOverride && (
                                <Badge variant="outline" className="text-[10px] ml-1">Overridden</Badge>
                              )}
                            </Button>
                            {!link.formStepsOverride && !showFormBuilder && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Currently using {(uc.defaultFormSteps?.length ?? 0)} default step(s) from global definition. Click to customize.
                              </p>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-end border-t pt-4">
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

      {/* Form Builder rendered outside the card for the active use case */}
      {formBuilderLinkId && (() => {
        const activeLink = links.find(l => l.id === formBuilderLinkId);
        if (!activeLink) return null;
        const useCaseDemo = createUseCaseDemo(activeLink);
        const ucTitle = activeLink.globalUseCase?.title ?? 'Use Case';
        return (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Form Builder — {ucTitle}
              </CardTitle>
              <CardDescription>
                Configure form steps for this use case. Changes are saved as overrides for this demo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <FormBuilderSection
                demo={useCaseDemo}
                onUpdate={createUseCaseUpdateHandler(formBuilderLinkId)}
              />
            </CardContent>
          </Card>
        );
      })()}

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
