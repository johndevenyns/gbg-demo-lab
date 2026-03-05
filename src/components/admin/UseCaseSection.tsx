import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase, Plus, Trash2, ChevronDown, ChevronRight, GripVertical,
  Pill, Video, Car, Crown, Landmark, CreditCard, LogIn, ShoppingBag,
  ShieldCheck, Package, Sparkles, Star,
} from 'lucide-react';
import { DemoUseCase, UseCaseEntryMethod, UseCasePageContent, ALL_USE_CASE_TEMPLATES, UseCaseTemplate } from '@/types/useCase';
import { useUseCases, useCreateUseCase, useUpdateUseCase, useDeleteUseCase } from '@/hooks/useUseCases';
import { IndustryTemplate } from '@/types/demo';
import { UseCaseProductsEditor } from './UseCaseProductsEditor';

// Icon map for use case cards
const ICON_MAP: Record<string, React.ElementType> = {
  Pill, Video, Car, Crown, Landmark, CreditCard, LogIn, ShoppingBag,
  ShieldCheck, Package, Briefcase, Sparkles,
};

const ENTRY_METHOD_LABELS: Record<UseCaseEntryMethod, string> = {
  direct_selection: 'Direct Selection',
  access_code: 'Access Code',
  mock_login: 'Mock Login',
  qr_code: 'QR Code',
};

interface UseCaseSectionProps {
  demoId: string;
  industryTemplate: IndustryTemplate;
}

export function UseCaseSection({ demoId, industryTemplate }: UseCaseSectionProps) {
  const { data: useCases = [], isLoading } = useUseCases(demoId);
  const createMutation = useCreateUseCase();
  const updateMutation = useUpdateUseCase();
  const deleteMutation = useDeleteUseCase();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddFromTemplate = useCallback((template: UseCaseTemplate) => {
    const isFirst = useCases.length === 0;
    createMutation.mutate({
      demoId,
      title: template.title,
      description: template.description,
      iconName: template.iconName,
      displayOrder: useCases.length,
      entryMethod: template.entryMethod,
      pageContent: template.pageContent,
      isEnabled: true,
      isDefault: isFirst,
      industryTemplate: template.industryTemplate,
    });
  }, [createMutation, demoId, useCases.length]);

  const handleAddBlank = useCallback(() => {
    const isFirst = useCases.length === 0;
    createMutation.mutate({
      demoId,
      title: 'New Use Case',
      description: '',
      iconName: 'Package',
      displayOrder: useCases.length,
      entryMethod: 'direct_selection',
      pageContent: {
        heroTitle: 'Welcome',
        heroSubtitle: 'Get started with your journey.',
        ctaLabel: 'Verify Identity to Continue',
      },
      isEnabled: true,
      isDefault: isFirst,
    });
  }, [createMutation, demoId, useCases.length]);

  const handleSetDefault = useCallback((id: string) => {
    // Clear existing default first, then set new one
    const currentDefault = useCases.find(uc => uc.isDefault);
    if (currentDefault && currentDefault.id !== id) {
      updateMutation.mutate({ id: currentDefault.id, demoId, updates: { isDefault: false } });
    }
    updateMutation.mutate({ id, demoId, updates: { isDefault: true } });
  }, [updateMutation, demoId, useCases]);

  const handleUpdate = useCallback((id: string, updates: Partial<DemoUseCase>) => {
    updateMutation.mutate({ id, demoId, updates });
  }, [updateMutation, demoId]);

  const handleUpdatePageContent = useCallback((id: string, currentContent: UseCasePageContent, contentUpdates: Partial<UseCasePageContent>) => {
    updateMutation.mutate({ id, demoId, updates: { pageContent: { ...currentContent, ...contentUpdates } } });
  }, [updateMutation, demoId]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Delete this use case?')) {
      deleteMutation.mutate({ id, demoId });
    }
  }, [deleteMutation, demoId]);

  // Get available templates for this industry
  const availableTemplates = ALL_USE_CASE_TEMPLATES[industryTemplate] ?? [];
  const addedTemplateTitles = new Set(useCases.map(uc => uc.title));

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
              Define the customer journey shown before the verification form
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {availableTemplates.length > 0 && (
              <Select onValueChange={(val) => {
                const tmpl = availableTemplates[parseInt(val)];
                if (tmpl) handleAddFromTemplate(tmpl);
              }}>
                <SelectTrigger className="w-[200px]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Add from Template</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((tmpl, idx) => {
                    const already = addedTemplateTitles.has(tmpl.title);
                    return (
                      <SelectItem key={idx} value={String(idx)} disabled={already}>
                        <span className={already ? 'text-muted-foreground' : ''}>
                          {tmpl.title} {already && '(added)'}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleAddBlank}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading use cases...</p>
        ) : useCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No use cases configured yet.</p>
            <p className="text-xs mt-1">Add a template or create a custom use case to define the pre-form experience.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {useCases.map((uc) => {
              const IconComp = ICON_MAP[uc.iconName] ?? Package;
              const isExpanded = expandedId === uc.id;

              return (
                <Collapsible key={uc.id} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? uc.id : null)}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left">
                        <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                        <IconComp className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{uc.title}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {ENTRY_METHOD_LABELS[uc.entryMethod]}
                            </Badge>
                            {uc.isDefault && (
                              <Badge className="text-[10px] shrink-0 bg-primary/15 text-primary border-primary/30">Default</Badge>
                            )}
                            {!uc.isEnabled && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">Disabled</Badge>
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
                        {/* Basic Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={uc.title} onChange={(e) => handleUpdate(uc.id, { title: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Entry Method</Label>
                            <Select value={uc.entryMethod} onValueChange={(v) => handleUpdate(uc.id, { entryMethod: v as UseCaseEntryMethod })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(ENTRY_METHOD_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label>Description</Label>
                            <Input value={uc.description ?? ''} onChange={(e) => handleUpdate(uc.id, { description: e.target.value })} placeholder="Brief description of this use case" />
                          </div>
                          {uc.entryMethod === 'access_code' && (
                            <div className="space-y-2">
                              <Label>Access Code</Label>
                              <Input value={uc.accessCode ?? ''} onChange={(e) => handleUpdate(uc.id, { accessCode: e.target.value })} placeholder="e.g. UPGRADE2024" className="font-mono" />
                            </div>
                          )}
                        </div>

                        {/* Page Content */}
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium mb-3">Page Content</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Hero Title</Label>
                              <Input value={uc.pageContent?.heroTitle ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { heroTitle: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Hero Subtitle</Label>
                              <Input value={uc.pageContent?.heroSubtitle ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { heroSubtitle: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>CTA Button Label</Label>
                              <Input value={uc.pageContent?.ctaLabel ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { ctaLabel: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>CTA Description</Label>
                              <Input value={uc.pageContent?.ctaDescription ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { ctaDescription: e.target.value })} />
                            </div>
                            {/* Products Editor */}
                            <div className="md:col-span-2 border-t pt-4 mt-2">
                              <UseCaseProductsEditor
                                products={uc.pageContent?.products ?? []}
                                onChange={(products) => handleUpdatePageContent(uc.id, uc.pageContent, { products })}
                              />
                            </div>

                            {/* Legacy single product fields (shown if no products array and industry matches) */}
                            {(!uc.pageContent?.products || uc.pageContent.products.length === 0) && (uc.pageContent?.productName !== undefined || uc.industryTemplate === 'retail' || uc.industryTemplate === 'healthcare' || uc.industryTemplate === 'rental_car') && (
                              <>
                                <div className="space-y-2">
                                  <Label>Product Name</Label>
                                  <Input value={uc.pageContent?.productName ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { productName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Product Price</Label>
                                  <Input value={uc.pageContent?.productPrice ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { productPrice: e.target.value })} placeholder="e.g. $49/day" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label>Product Description</Label>
                                  <Textarea value={uc.pageContent?.productDescription ?? ''} onChange={(e) => handleUpdatePageContent(uc.id, uc.pageContent, { productDescription: e.target.value })} rows={2} />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex items-center justify-between border-t pt-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch checked={uc.isEnabled} onCheckedChange={(v) => handleUpdate(uc.id, { isEnabled: v })} id={`uc-enabled-${uc.id}`} />
                              <label htmlFor={`uc-enabled-${uc.id}`} className="text-sm text-muted-foreground cursor-pointer">Enabled</label>
                            </div>
                            {!uc.isDefault && (
                              <Button variant="outline" size="sm" onClick={() => handleSetDefault(uc.id)}>
                                <Star className="w-3 h-3 mr-1" /> Set as Default
                              </Button>
                            )}
                            {uc.isDefault && (
                              <span className="text-xs text-primary flex items-center gap-1"><Star className="w-3 h-3 fill-primary" /> Default landing page</span>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(uc.id)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
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
