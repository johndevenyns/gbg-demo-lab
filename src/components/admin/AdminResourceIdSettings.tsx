import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, Info } from "lucide-react";
import { useVerificationTypes } from "@/hooks/useVerificationAdmin";
import {
  useMyAdminResourceIds,
  useUpsertAdminResourceId,
  useDeleteAdminResourceId,
} from "@/hooks/useAdminResourceIds";

export function AdminResourceIdSettings() {
  const { data: verificationTypes = [], isLoading: typesLoading } = useVerificationTypes(true);
  const { data: myResourceIds = [], isLoading: idsLoading } = useMyAdminResourceIds();
  const upsert = useUpsertAdminResourceId();
  const deleteId = useDeleteAdminResourceId();

  // Local edit state: typeKey -> resourceId
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Initialize edit values from existing data
  const getValueForType = (typeKey: string): string => {
    if (editValues[typeKey] !== undefined) return editValues[typeKey];
    const existing = myResourceIds.find(r => r.typeKey === typeKey);
    return existing?.resourceId || '';
  };

  const handleSave = (typeKey: string) => {
    const value = getValueForType(typeKey);
    if (value.trim()) {
      upsert.mutate({ typeKey, resourceId: value.trim() });
    }
  };

  const handleDelete = (typeKey: string) => {
    const existing = myResourceIds.find(r => r.typeKey === typeKey);
    if (existing) {
      deleteId.mutate(existing.id);
      setEditValues(prev => {
        const next = { ...prev };
        delete next[typeKey];
        return next;
      });
    }
  };

  const isLoading = typesLoading || idsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">My Resource IDs</h2>
        <p className="text-sm text-muted-foreground">
          Set your default Resource IDs per verification type. These override global defaults
          but can be overridden at the customer/demo level.
        </p>
      </div>

      <Card className="glass-card border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground mb-1">Resource ID Hierarchy</p>
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>Customer Level</strong> — Set per demo in the Verification Path config (highest priority)</li>
                <li><strong>Admin Level</strong> — Your personal defaults (this page)</li>
                <li><strong>Global Level</strong> — Platform-wide defaults from Verification Types settings</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {verificationTypes.map(type => {
            const existing = myResourceIds.find(r => r.typeKey === type.typeKey);
            const currentValue = getValueForType(type.typeKey);
            const hasChanged = currentValue !== (existing?.resourceId || '');

            return (
              <Card key={type.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {type.displayName}
                        <Badge variant="outline" className="font-mono text-xs">
                          {type.typeKey}
                        </Badge>
                      </CardTitle>
                      {type.defaultResourceId && (
                        <CardDescription className="font-mono text-xs mt-1">
                          Global default: {type.defaultResourceId}
                        </CardDescription>
                      )}
                    </div>
                    {existing && (
                      <Badge variant="secondary" className="text-xs">Override active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Your Resource ID</Label>
                      <Input
                        value={currentValue}
                        onChange={(e) => setEditValues(prev => ({
                          ...prev,
                          [type.typeKey]: e.target.value,
                        }))}
                        placeholder={type.defaultResourceId || 'Enter your resource ID...'}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(type.typeKey)}
                      disabled={!currentValue.trim() || !hasChanged || upsert.isPending}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    {existing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(type.typeKey)}
                        disabled={deleteId.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
