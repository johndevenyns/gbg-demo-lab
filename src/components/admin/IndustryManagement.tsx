import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Building2, Plus, Trash2, ChevronDown, ChevronRight,
  Landmark, Car, ShoppingBag, Shield, Heart, Eye, Package,
} from 'lucide-react';
import { PORTAL_TYPE_OPTIONS } from '@/types/industry';
import { useIndustries, useCreateIndustry, useUpdateIndustry, useDeleteIndustry } from '@/hooks/useIndustries';
import { PortalPreviewDialog } from './PortalPreviewDialog';
import { CreateIndustryWizard } from './CreateIndustryWizard';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Landmark, Car, ShoppingBag, Shield, Heart, Package,
};

export function IndustryManagement({ readOnly = false }: { readOnly?: boolean }) {
  const { data: industries = [], isLoading } = useIndustries();
  const createIndustry = useCreateIndustry();
  const updateIndustry = useUpdateIndustry();
  const deleteIndustryMut = useDeleteIndustry();

  const [expandedIndustryId, setExpandedIndustryId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewIndustryId, setPreviewIndustryId] = useState<string | null>(null);

  const handleCreateIndustry = (data: {
    title: string;
    description: string;
    iconName: string;
    portalType: string;
    useCases: Array<{ title: string; description: string; defaultFormSteps: Record<string, unknown>[]; defaultVerificationType: string; pageContent: any; showFillPass: boolean; showFillFail: boolean; isEnabled: boolean }>;
  }) => {
    createIndustry.mutate({
      title: data.title,
      description: data.description || undefined,
      iconName: data.iconName,
      portalType: data.portalType,
      displayOrder: industries.length,
      isEnabled: true,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
      },
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteIndustryMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Industries
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage industries and their portal types
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Industry
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : industries.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No industries defined yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {industries.map((ind) => {
            const IconComp = ICON_MAP[ind.iconName] ?? Building2;
            const isExpanded = expandedIndustryId === ind.id;
            const portalLabel = PORTAL_TYPE_OPTIONS.find(p => p.value === ind.portalType)?.label || 'No Portal';

            return (
              <Collapsible key={ind.id} open={isExpanded} onOpenChange={(open) => setExpandedIndustryId(open ? ind.id : null)}>
                <Card className="glass-card">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left">
                      <IconComp className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ind.title}</span>
                          {!ind.isEnabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                          <Badge variant="outline" className="text-[10px] bg-primary/10">{portalLabel}</Badge>
                        </div>
                        {ind.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{ind.description}</p>
                        )}
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4">
                      {/* Industry Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            defaultValue={ind.title}
                            onBlur={(e) => {
                              if (e.target.value !== ind.title) updateIndustry.mutate({ id: ind.id, updates: { title: e.target.value } });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Portal Type</Label>
                          <Select
                            value={ind.portalType}
                            onValueChange={(val) => updateIndustry.mutate({ id: ind.id, updates: { portalType: val } })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PORTAL_TYPE_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            The mock portal shown after login for this industry
                          </p>
                          {ind.portalType !== 'none' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setPreviewIndustryId(ind.id)}
                              >
                                <Eye className="w-3 h-3" /> Preview Portal
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            defaultValue={ind.description ?? ''}
                            onBlur={(e) => updateIndustry.mutate({ id: ind.id, updates: { description: e.target.value } })}
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Industry Footer */}
                      <div className="flex items-center justify-between border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ind.isEnabled}
                            onCheckedChange={(v) => updateIndustry.mutate({ id: ind.id, updates: { isEnabled: v } })}
                          />
                          <span className="text-sm text-muted-foreground">Enabled</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(ind.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Create Industry Wizard */}
      <CreateIndustryWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        onComplete={handleCreateIndustry}
        existingIndustryCount={industries.length}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Industry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this industry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Portal Preview Dialog */}
      {previewIndustryId && (() => {
        const ind = industries.find(i => i.id === previewIndustryId);
        if (!ind) return null;
        return (
          <PortalPreviewDialog
            open={true}
            onOpenChange={() => setPreviewIndustryId(null)}
            portalType={ind.portalType}
            portalConfig={ind.portalConfig}
            brandingOverrides={{ bankName: ind.title }}
          />
        );
      })()}
    </div>
  );
}
