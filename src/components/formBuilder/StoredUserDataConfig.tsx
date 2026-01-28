import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoredTestData, FormStep, AVAILABLE_FORM_FIELDS } from '@/types/demo';
import { 
  CheckCircle2, XCircle, User, Plus, Trash2, Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StoredUserDataConfigProps {
  storedTestData?: StoredTestData;
  formSteps: FormStep[];
  onUpdate: (data: StoredTestData) => void;
}

const DEFAULT_PASS_DATA: Record<string, string> = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '(555) 123-4567',
  dateOfBirth: '1985-06-15',
  ssn: '1234',
  addressStreet: '123 Main Street',
  addressCity: 'Austin',
  addressState: 'TX',
  addressZip: '78701',
  addressCountry: 'United States',
};

const DEFAULT_FAIL_DATA: Record<string, string> = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '(555) 987-6543',
  dateOfBirth: '1990-01-01',
  ssn: '0000',
  addressStreet: '456 Fake Street',
  addressCity: 'Nowhere',
  addressState: 'XX',
  addressZip: '00000',
  addressCountry: 'Unknown',
};

export function StoredUserDataConfig({ 
  storedTestData, 
  formSteps,
  onUpdate 
}: StoredUserDataConfigProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pass' | 'fail'>('pass');
  
  // Initialize with defaults or existing data
  const passData = storedTestData?.passData || DEFAULT_PASS_DATA;
  const failData = storedTestData?.failData || DEFAULT_FAIL_DATA;

  // Get all unique field names from form steps
  const allFieldNames = formSteps.flatMap(step => 
    step.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type
    }))
  );

  // Remove duplicates based on field name
  const uniqueFields = allFieldNames.filter((field, index, self) => 
    index === self.findIndex(f => f.name === field.name)
  );

  const handleFieldChange = (type: 'pass' | 'fail', fieldName: string, value: string) => {
    const newData: StoredTestData = {
      ...storedTestData, // Preserve existing flags (showFillPassButton, showFillFailButton)
      passData: type === 'pass' ? { ...passData, [fieldName]: value } : passData,
      failData: type === 'fail' ? { ...failData, [fieldName]: value } : failData,
    };
    onUpdate(newData);
  };

  const handlePopulateDefaults = (type: 'pass' | 'fail') => {
    const newData: StoredTestData = {
      ...storedTestData, // Preserve existing flags
      passData: type === 'pass' ? { ...DEFAULT_PASS_DATA } : passData,
      failData: type === 'fail' ? { ...DEFAULT_FAIL_DATA } : failData,
    };
    onUpdate(newData);
    toast({
      title: 'Defaults Applied',
      description: `${type === 'pass' ? 'Pass' : 'Fail'} data populated with sample values`,
    });
  };

  const handleClearData = (type: 'pass' | 'fail') => {
    const newData: StoredTestData = {
      ...storedTestData, // Preserve existing flags
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
    const icon = type === 'pass' 
      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
      : <XCircle className="w-5 h-5 text-red-500" />;
    const badgeVariant = type === 'pass' ? 'default' : 'destructive';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{type === 'pass' ? 'Pass' : 'Fail'} Test Data</span>
            <Badge variant={badgeVariant} className="text-xs">
              {Object.keys(data).filter(k => data[k]).length} fields
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePopulateDefaults(type)}
            >
              <User className="w-4 h-4 mr-1" />
              Populate Defaults
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleClearData(type)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
          {uniqueFields.length > 0 ? (
            uniqueFields.map(field => (
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

        {/* Show common fields if no form fields exist */}
        {uniqueFields.length === 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Or configure common verification fields:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_FORM_FIELDS.slice(0, 8).map(field => (
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
          Configure test user data for the "Fill Pass" and "Fill Fail" buttons in the form preview.
          This data will be used to quickly populate form fields during testing.
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
