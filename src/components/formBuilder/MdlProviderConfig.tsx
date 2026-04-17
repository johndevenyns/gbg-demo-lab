import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { MdlProvider, AVAILABLE_MDL_PROVIDERS } from '@/types/demo';
import { ChevronDown, ChevronUp, Smartphone, Globe } from 'lucide-react';

interface MdlProviderConfigProps {
  enabledProviders: MdlProvider[];
  onChange: (providers: MdlProvider[]) => void;
}

export function MdlProviderConfig({ enabledProviders, onChange }: MdlProviderConfigProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Check if a provider is currently enabled
  const isProviderEnabled = (providerId: string) => {
    return enabledProviders.some(p => p.id === providerId);
  };

  // Toggle a provider's enabled state
  const toggleProvider = (provider: MdlProvider) => {
    if (isProviderEnabled(provider.id)) {
      // Remove from enabled list
      onChange(enabledProviders.filter(p => p.id !== provider.id));
    } else {
      // Add to enabled list
      onChange([...enabledProviders, { ...provider, enabled: true }]);
    }
  };

  // Toggle all providers
  const toggleAll = (enable: boolean) => {
    if (enable) {
      onChange(AVAILABLE_MDL_PROVIDERS.map(p => ({ ...p, enabled: true })));
    } else {
      onChange([]);
    }
  };

  const enabledCount = enabledProviders.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between px-3 py-2 h-auto">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Available ID Providers</span>
            <Badge variant="outline" className="text-xs">
              {enabledCount} / {AVAILABLE_MDL_PROVIDERS.length}
            </Badge>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-3 pb-3 pt-2 space-y-3">
        {/* Quick actions */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Select providers users can choose from:</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleAll(true)}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleAll(false)}
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Provider list */}
        <div className="space-y-2">
          {AVAILABLE_MDL_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                isProviderEnabled(provider.id)
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-border bg-muted/30 opacity-60'
              }`}
              onClick={() => toggleProvider(provider)}
            >
              {/* Provider logo */}
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shrink-0 border">
                <img
                  src={provider.logoUrl}
                  alt={provider.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Provider info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{provider.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  {provider.domain}
                </div>
              </div>

              {/* Checkbox */}
              <Checkbox
                checked={isProviderEnabled(provider.id)}
                onCheckedChange={() => toggleProvider(provider)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>

        {enabledCount === 0 && (
          <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
            ⚠️ No providers selected. Users won't be able to complete Digital ID verification.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
