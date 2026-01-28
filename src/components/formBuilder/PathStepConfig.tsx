import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormStep, PathStepConfig as PathStepConfigType } from '@/types/demo';
import { VERIFICATION_PATHS } from '@/types/formBuilder';
import { FileCheck, Database, Smartphone } from 'lucide-react';

const PATH_ICONS: Record<string, React.ReactNode> = {
  docbio: <FileCheck className="w-6 h-6" />,
  databio: <Database className="w-6 h-6" />,
  dataonly: <Database className="w-6 h-6" />,
  mdl: <Smartphone className="w-6 h-6" />,
};

const PATH_COLORS: Record<string, string> = {
  docbio: 'text-purple-600 bg-purple-500/20',
  databio: 'text-blue-600 bg-blue-500/20',
  dataonly: 'text-cyan-600 bg-cyan-500/20',
  mdl: 'text-green-600 bg-green-500/20',
};

interface PathStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function PathStepConfig({ step, onUpdateStep }: PathStepConfigProps) {
  const config = step.pathStepConfig || {
    pathType: 'docbio',
    autoAdvance: true,
  };

  const currentPath = VERIFICATION_PATHS.find(p => p.id === config.pathType) || VERIFICATION_PATHS[0];

  const handleConfigChange = (updates: Partial<PathStepConfigType>) => {
    onUpdateStep({
      pathStepConfig: { ...config, ...updates } as PathStepConfigType
    });
  };

  return (
    <div className="space-y-4">
      {/* Path Preview */}
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5">
        <div className="flex items-center justify-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${PATH_COLORS[config.pathType] || PATH_COLORS.docbio}`}>
            {PATH_ICONS[config.pathType] || PATH_ICONS.docbio}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{config.title || currentPath.name}</p>
            <p className="text-sm text-muted-foreground">
              {config.description || currentPath.description}
            </p>
            {config.resourceId && (
              <p className="text-xs text-muted-foreground mt-1">
                Resource ID: {config.resourceId}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Path Configuration */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Verification Path</Label>
            <Select
              value={config.pathType}
              onValueChange={(v) => handleConfigChange({ pathType: v as 'docbio' | 'databio' | 'dataonly' | 'mdl' })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {VERIFICATION_PATHS.map(path => (
                  <SelectItem key={path.id} value={path.id}>
                    <div className="flex items-center gap-2">
                      {PATH_ICONS[path.id]}
                      <span>{path.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {currentPath.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Resource ID</Label>
            <Input
              value={config.resourceId || ''}
              onChange={(e) => handleConfigChange({ resourceId: e.target.value })}
              placeholder="Enter resource ID for this path"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              The specific resource ID to use for this verification path.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => handleConfigChange({ title: e.target.value })}
                placeholder={currentPath.name}
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Description</Label>
              <Input
                value={config.description || ''}
                onChange={(e) => handleConfigChange({ description: e.target.value })}
                placeholder={currentPath.description}
                className="bg-background"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Auto-advance to Next Step</Label>
              <Switch
                checked={config.autoAdvance ?? true}
                onCheckedChange={(v) => handleConfigChange({ autoAdvance: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically proceed when path is selected/confirmed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
