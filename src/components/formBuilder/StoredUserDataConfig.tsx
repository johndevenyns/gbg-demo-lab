import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StoredTestData, FormStep, AVAILABLE_FORM_FIELDS } from '@/types/demo';
import { CheckCircle2, XCircle, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTestProfiles } from '@/hooks/useTestProfiles';

interface StoredUserDataConfigProps {
  storedTestData?: StoredTestData;
  formSteps: FormStep[];
  onUpdate: (data: StoredTestData) => void;
}

export function StoredUserDataConfig({
  storedTestData,
  formSteps,
  onUpdate,
}: StoredUserDataConfigProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pass' | 'fail'>('pass');
  const { data: globalProfiles = [] } = useTestProfiles();

  const passProfiles = globalProfiles.filter((p) => p.profile_type === 'pass');
  const failProfiles = globalProfiles.filter((p) => p.profile_type === 'fail');

  // Default to the first global profile of each type, or empty
  const defaultPassData = passProfiles[0]?.field_data ?? {};
  const defaultFailData = failProfiles[0]?.field_data ?? {};

  const passData = storedTestData?.passData || defaultPassData;
  const failData = storedTestData?.failData || defaultFailData;

  // Get all unique field names from form steps
  const uniqueFields = formSteps
    .flatMap((step) => step.fields.map((f) => ({ name: f.name, label: f.label, type: f.type })))
    .filter((field, index, self) => index === self.findIndex((f) => f.name === field.name));

  const handleFieldChange = (type: 'pass' | 'fail', fieldName: string, value: string) => {
    const newData: StoredTestData = {
      ...storedTestData,
      passData: type === 'pass' ? { ...passData, [fieldName]: value } : passData,
      failData: type === 'fail' ? { ...failData, [fieldName]: value } : failData,
    };
    onUpdate(newData);
  };

  const handleSelectProfile = (type: 'pass' | 'fail', profileId: string) => {
    const profile = globalProfiles.find((p) => p.id === profileId);
    if (!profile) return;

    const newData: StoredTestData = {
      ...storedTestData,
      passData: type === 'pass' ? { ...profile.field_data } : passData,
      failData: type === 'fail' ? { ...profile.field_data } : failData,
    };
    onUpdate(newData);
    toast({
      title: 'Profile Applied',
      description: `Loaded "${profile.profile_name}" into ${type} data`,
    });
  };

  const handleClearData = (type: 'pass' | 'fail') => {
    const newData: StoredTestData = {
      ...storedTestData,
      passData: type === 'pass' ? {} : passData,
      failData: type === 'fail' ? {} : failData,
    };
    onUpdate(newData);
    toast({
      title: 'Data Cleared',
      description: `${type === 'pass' ? 'Pass' : 'Fail'} data has been cleared`,
    });
  };

  const renderDataEditor = (type: 'pass' | 'fail') => {
    const data = type === 'pass' ? passData : failData;
    const profilesForType = type === 'pass' ? passProfiles : failProfiles;
    const icon =
      type === 'pass' ? (
        <CheckCircle2 className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      );
    const badgeVariant = type === 'pass' ? 'default' : 'destructive';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{type === 'pass' ? 'Pass' : 'Fail'} Test Data</span>
            <Badge variant={badgeVariant} className="text-xs">
              {Object.keys(data).filter((k) => data[k]).length} fields
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select onValueChange={(val) => handleSelectProfile(type, val)}>
              <SelectTrigger className="w-[220px] h-9 bg-background">
                <SelectValue placeholder="Load from profile…" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {profilesForType.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No {type} profiles saved
                  </SelectItem>
                ) : (
                  profilesForType.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.profile_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => handleClearData(type)}>
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
          {uniqueFields.length > 0 ? (
            uniqueFields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label className="text-sm text-muted-foreground">{field.label}</Label>
                <Input
                  value={data[field.name] || ''}
                  onChange={(e) => handleFieldChange(type, field.name, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  className="h-9"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No form fields configured yet.</p>
              <p className="text-sm">Add fields to your form steps to configure test data.</p>
            </div>
          )}
        </div>

        {uniqueFields.length === 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Or configure common verification fields:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_FORM_FIELDS.slice(0, 8).map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{field.label}</Label>
                  <Input
                    value={data[field.name] || ''}
                    onChange={(e) => handleFieldChange(type, field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Stored Test Data
        </CardTitle>
        <CardDescription>
          Configure test user data for the "Fill Pass" and "Fill Fail" buttons.
          Defaults are loaded from your global test profiles. Use the dropdown to switch profiles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pass' | 'fail')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pass" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Pass Data
            </TabsTrigger>
            <TabsTrigger value="fail" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Fail Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pass" className="mt-0">
            {renderDataEditor('pass')}
          </TabsContent>

          <TabsContent value="fail" className="mt-0">
            {renderDataEditor('fail')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
