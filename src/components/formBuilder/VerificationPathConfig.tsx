import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VERIFICATION_PATHS, VerificationPath, PathCondition } from '@/types/formBuilder';
import { 
  Smartphone, FileCheck, Database, CreditCard, ArrowRight, Settings2
} from 'lucide-react';

const PATH_ICONS: Record<string, React.ReactNode> = {
  docbio: <FileCheck className="w-5 h-5" />,
  databio: <Database className="w-5 h-5" />,
  dataonly: <Database className="w-5 h-5" />,
  mdl: <Smartphone className="w-5 h-5" />,
};

const CONDITION_LABELS: Record<PathCondition, string> = {
  always: 'Always available',
  mobile_detected: 'When mobile device detected',
  document_available: 'When document is uploaded',
  high_risk_score: 'When risk score is high',
  user_preference: 'User selects preference',
};

// Map path IDs to resource ID field names
const PATH_RESOURCE_ID_MAP: Record<string, 'resourceIdDocBio' | 'resourceIdDataBio' | 'resourceIdDataOnly'> = {
  docbio: 'resourceIdDocBio',
  databio: 'resourceIdDataBio',
  dataonly: 'resourceIdDataOnly',
};

interface ResourceIds {
  resourceIdDocBio: string;
  resourceIdDataBio: string;
  resourceIdDataOnly: string;
}

interface VerificationPathConfigProps {
  enabledPaths: string[];
  pathConditions: Record<string, PathCondition>;
  defaultPath: string;
  globalResourceId: string;
  resourceIds: ResourceIds;
  onTogglePath: (pathId: string) => void;
  onSetCondition: (pathId: string, condition: PathCondition) => void;
  onSetDefaultPath: (pathId: string) => void;
  onUpdateResourceId: (field: keyof ResourceIds, value: string) => void;
  onUpdateGlobalResourceId: (value: string) => void;
}

export function VerificationPathConfig({
  enabledPaths,
  pathConditions,
  defaultPath,
  globalResourceId,
  resourceIds,
  onTogglePath,
  onSetCondition,
  onSetDefaultPath,
  onUpdateResourceId,
  onUpdateGlobalResourceId,
}: VerificationPathConfigProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Verification Types
        </CardTitle>
        <CardDescription>
          Configure which verification methods are available and their Resource IDs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global Resource ID */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <Label className="font-medium">Global Resource ID</Label>
          <p className="text-sm text-muted-foreground">Default resource ID used by all paths unless overridden</p>
          <Input
            value={globalResourceId}
            onChange={(e) => onUpdateGlobalResourceId(e.target.value)}
            placeholder="Enter default Resource ID"
            className="font-mono"
          />
        </div>

        {/* Default Path Selection */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-medium">Default Path</Label>
            <p className="text-sm text-muted-foreground">Used when no conditions match</p>
          </div>
          <Select value={defaultPath} onValueChange={onSetDefaultPath}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERIFICATION_PATHS.filter(p => enabledPaths.includes(p.id)).map(path => (
                <SelectItem key={path.id} value={path.id}>
                  <div className="flex items-center gap-2">
                    {PATH_ICONS[path.id]}
                    {path.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Path Cards */}
        <div className="grid gap-3">
          {VERIFICATION_PATHS.map((path) => {
            const isEnabled = enabledPaths.includes(path.id);
            const condition = pathConditions[path.id] || path.condition;
            const isDefault = defaultPath === path.id;
            const resourceIdField = PATH_RESOURCE_ID_MAP[path.id];
            const resourceIdValue = resourceIdField ? resourceIds[resourceIdField] : '';
            
            return (
              <div
                key={path.id}
                className={`
                  p-4 rounded-lg border transition-all
                  ${isEnabled 
                    ? 'border-primary/30 bg-card' 
                    : 'border-border bg-muted/30 opacity-60'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-2 rounded-lg
                    ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                  `}>
                    {PATH_ICONS[path.id]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{path.name}</h4>
                      {isDefault && (
                        <Badge variant="default" className="text-xs">Default</Badge>
                      )}
                      <Badge variant="outline" className="text-xs uppercase">
                        {path.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {path.description}
                    </p>
                    
                    {isEnabled && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <Select 
                            value={condition} 
                            onValueChange={(v) => onSetCondition(path.id, v as PathCondition)}
                          >
                            <SelectTrigger className="h-8 text-sm w-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Resource ID input for this path */}
                        {resourceIdField && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Resource ID {!resourceIdValue && globalResourceId && (
                                <span className="text-muted-foreground/60">(using global default)</span>
                              )}
                            </Label>
                            <Input
                              value={resourceIdValue}
                              onChange={(e) => onUpdateResourceId(resourceIdField, e.target.value)}
                              placeholder={globalResourceId || "Enter Resource ID (or set global default)"}
                              className="h-8 text-sm font-mono"
                            />
                            {!resourceIdValue && globalResourceId && (
                              <p className="text-xs text-muted-foreground/60">
                                Will use: <span className="font-mono">{globalResourceId}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => onTogglePath(path.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Info Box */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">
            How Branching Works
          </h4>
          <p className="text-sm text-muted-foreground">
            Paths are evaluated in priority order. The first matching condition determines 
            which verification flow the user sees. If no conditions match, the default path is used.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
