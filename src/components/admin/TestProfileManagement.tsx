import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Upload, Download, Trash2, Pencil, CheckCircle2, XCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useTestProfiles,
  useCreateTestProfile,
  useCreateTestProfilesBulk,
  useUpdateTestProfile,
  useDeleteTestProfile,
  TestUserProfile,
} from '@/hooks/useTestProfiles';

// Profile fields matching expected CSV headers
const PROFILE_FIELDS = [
  { name: 'idNote', label: 'ID Note' },
  { name: 'apiResultCode', label: 'API Result Code' },
  { name: 'firstName', label: 'First Name' },
  { name: 'lastName', label: 'Last Name' },
  { name: 'addressStreet', label: 'Address' },
  { name: 'addressCity', label: 'City' },
  { name: 'addressState', label: 'State' },
  { name: 'addressZip', label: 'ZIP' },
  { name: 'dateOfBirth', label: 'DOB' },
  { name: 'ssn', label: 'SSN4' },
];

// CSV header to field_data key mapping
const CSV_HEADER_MAP: Record<string, string> = {
  'id note': 'idNote',
  'api result code': 'apiResultCode',
  'first name': 'firstName',
  'last name': 'lastName',
  'address': 'addressStreet',
  'city': 'addressCity',
  'state': 'addressState',
  'zip': 'addressZip',
  'dob': 'dateOfBirth',
  'ssn4': 'ssn',
  // Also accept the field_data keys directly
  'idnote': 'idNote',
  'apiresultcode': 'apiResultCode',
  'firstname': 'firstName',
  'lastname': 'lastName',
  'addressstreet': 'addressStreet',
  'addresscity': 'addressCity',
  'addressstate': 'addressState',
  'addresszip': 'addressZip',
  'dateofbirth': 'dateOfBirth',
};

const SAMPLE_CSV = `ID Note,API Result Code,First Name,Last Name,Address,City,State,ZIP,DOB,SSN4
"Valid DL - Pass",pass,John,Smith,123 Main Street,Austin,TX,78701,1985-06-15,1234
"Expired DL - Fail",fail,Jane,Doe,456 Fake Street,Nowhere,XX,00000,1990-01-01,0000`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_test_profiles.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function ProfileFormDialog({
  open,
  onOpenChange,
  editingProfile,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProfile?: TestUserProfile | null;
  onSave: (data: { profile_name: string; profile_type: 'pass' | 'fail'; field_data: Record<string, string> }) => void;
}) {
  const [profileName, setProfileName] = useState(editingProfile?.profile_name || '');
  const [profileType, setProfileType] = useState<'pass' | 'fail'>(editingProfile?.profile_type || 'pass');
  const [fieldData, setFieldData] = useState<Record<string, string>>(editingProfile?.field_data || {});

  // Reset form when dialog opens with new data
  const prevOpen = useRef(open);
  if (open && !prevOpen.current) {
    // Dialog just opened
    setTimeout(() => {
      setProfileName(editingProfile?.profile_name || '');
      setProfileType(editingProfile?.profile_type || 'pass');
      setFieldData(editingProfile?.field_data || {});
    }, 0);
  }
  prevOpen.current = open;

  const handleSubmit = () => {
    if (!profileName.trim()) return;
    // Filter out empty values
    const cleanData = Object.fromEntries(
      Object.entries(fieldData).filter(([, v]) => v.trim())
    );
    onSave({ profile_name: profileName.trim(), profile_type: profileType, field_data: cleanData });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProfile ? 'Edit' : 'Create'} Test Profile</DialogTitle>
          <DialogDescription>
            {editingProfile ? 'Update' : 'Add'} a reusable test user profile for pass/fail testing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Profile Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g., John Pass, Jane Fail"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={profileType} onValueChange={(v) => setProfileType(v as 'pass' | 'fail')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Pass
                    </span>
                  </SelectItem>
                  <SelectItem value="fail">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Fail
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">User Data Fields</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROFILE_FIELDS.map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <Input
                    value={fieldData[field.name] || ''}
                    onChange={(e) => setFieldData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.label}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!profileName.trim()}>
            {editingProfile ? 'Update' : 'Create'} Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TestProfileManagement() {
  const { toast } = useToast();
  const { data: profiles = [], isLoading } = useTestProfiles();
  const createProfile = useCreateTestProfile();
  const createBulk = useCreateTestProfilesBulk();
  const updateProfile = useUpdateTestProfile();
  const deleteProfile = useDeleteTestProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TestUserProfile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passProfiles = profiles.filter((p) => p.profile_type === 'pass');
  const failProfiles = profiles.filter((p) => p.profile_type === 'fail');

  const handleCreate = () => {
    setEditingProfile(null);
    setDialogOpen(true);
  };

  const handleEdit = (profile: TestUserProfile) => {
    setEditingProfile(profile);
    setDialogOpen(true);
  };

  const handleSave = (data: { profile_name: string; profile_type: 'pass' | 'fail'; field_data: Record<string, string> }) => {
    if (editingProfile) {
      updateProfile.mutate(
        { id: editingProfile.id, updates: data },
        {
          onSuccess: () => toast({ title: 'Profile Updated' }),
          onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
        }
      );
    } else {
      createProfile.mutate(data, {
        onSuccess: () => toast({ title: 'Profile Created' }),
        onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteProfile.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: 'Profile Deleted' });
        setDeleteId(null);
      },
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          toast({ title: 'Invalid CSV', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        
        // Map CSV headers to field_data keys
        const mappedHeaders = headers.map((h) => {
          const normalized = h.toLowerCase().trim();
          return CSV_HEADER_MAP[normalized] || h;
        });

        // Determine profile_name and profile_type columns
        // profile_name maps from "ID Note", profile_type maps from "API Result Code"
        const nameIdx = mappedHeaders.findIndex((h) => h === 'idNote');
        const typeIdx = mappedHeaders.findIndex((h) => h === 'apiResultCode');

        // Also check for legacy column names
        const legacyNameIdx = nameIdx === -1 ? mappedHeaders.findIndex((h) => h.toLowerCase() === 'profile_name') : nameIdx;
        const legacyTypeIdx = typeIdx === -1 ? mappedHeaders.findIndex((h) => h.toLowerCase() === 'profile_type') : typeIdx;

        const finalNameIdx = nameIdx !== -1 ? nameIdx : legacyNameIdx;
        const finalTypeIdx = typeIdx !== -1 ? typeIdx : legacyTypeIdx;

        if (finalNameIdx === -1) {
          toast({
            title: 'Missing Required Column',
            description: 'CSV must include an "ID Note" (or "profile_name") column.',
            variant: 'destructive',
          });
          return;
        }

        const newProfiles = lines.slice(1).map((line) => {
          // Simple CSV parse (handles basic quoting)
          const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((v) => v.trim().replace(/^"|"$/g, '')) || line.split(',').map((v) => v.trim());
          
          const fieldData: Record<string, string> = {};
          mappedHeaders.forEach((key, idx) => {
            if (idx === finalNameIdx || idx === finalTypeIdx) return;
            const val = values[idx]?.trim();
            if (val) fieldData[key] = val;
          });

          // Determine profile type from API Result Code or profile_type column
          const rawType = finalTypeIdx !== -1 ? (values[finalTypeIdx] || 'pass').toLowerCase().trim() : 'pass';
          const profileType = rawType === 'fail' ? 'fail' : 'pass';

          return {
            profile_name: values[finalNameIdx] || 'Unnamed',
            profile_type: profileType as 'pass' | 'fail',
            field_data: fieldData,
          };
        });

        createBulk.mutate(newProfiles, {
          onSuccess: (data) => {
            toast({ title: 'CSV Imported', description: `${data.length} profiles created.` });
          },
          onError: (err) => {
            toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
          },
        });
      } catch {
        toast({ title: 'Parse Error', description: 'Failed to parse CSV file.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderProfileList = (list: TestUserProfile[], type: 'pass' | 'fail') => {
    if (list.length === 0) {
      return (
        <Card className="glass-card">
          <CardContent className="py-8 text-center">
            <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No {type} profiles yet.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {list.map((profile) => {
          const filledFields = Object.keys(profile.field_data).filter((k) => profile.field_data[k]);
          return (
            <Card key={profile.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type === 'pass' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {type === 'pass' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{profile.profile_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {filledFields.length} fields
                        </Badge>
                        {profile.field_data.firstName && profile.field_data.lastName && (
                          <span className="text-xs text-muted-foreground">
                            {profile.field_data.firstName} {profile.field_data.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(profile)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(profile.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Test User Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Manage reusable pass/fail user profiles for demo form testing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={downloadSampleCsv}>
            <Download className="w-4 h-4 mr-2" />
            Sample CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Profile
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="h-16" />
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="pass">
          <TabsList>
            <TabsTrigger value="pass" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Pass Profiles ({passProfiles.length})
            </TabsTrigger>
            <TabsTrigger value="fail" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Fail Profiles ({failProfiles.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pass" className="mt-4">
            {renderProfileList(passProfiles, 'pass')}
          </TabsContent>
          <TabsContent value="fail" className="mt-4">
            {renderProfileList(failProfiles, 'fail')}
          </TabsContent>
        </Tabs>
      )}

      <ProfileFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProfile={editingProfile}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this test user profile.
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
    </div>
  );
}
