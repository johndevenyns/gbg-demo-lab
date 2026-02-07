import { Check, Camera, Globe, LayoutTemplate, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormStyleSource } from '@/types/formStyle';
import { Badge } from '@/components/ui/badge';

export type FormStyleMethod = 'ai-screenshot' | 'captured' | 'template' | 'custom';

// Map FormStyleSource to FormStyleMethod
export function sourceToMethod(source: FormStyleSource): FormStyleMethod {
  switch (source) {
    case 'captured':
      return 'captured';
    case 'template':
      return 'template';
    case 'custom':
      return 'custom';
    case 'mirrored':
      return 'ai-screenshot'; // Mirrored via screenshot analysis is categorized as ai-screenshot
    default:
      return 'template'; // Default to template
  }
}

interface MethodOption {
  id: FormStyleMethod;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const methods: MethodOption[] = [
  {
    id: 'ai-screenshot',
    label: 'AI Screenshot',
    description: 'Upload a form image for AI analysis',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    id: 'captured',
    label: 'Exact Capture',
    description: 'Fetch form HTML by ID',
    icon: Globe,
  },
  {
    id: 'template',
    label: 'Templates',
    description: 'Choose a preset style',
    icon: LayoutTemplate,
  },
  {
    id: 'custom',
    label: 'Customize',
    description: 'Manual color & font settings',
    icon: Palette,
  },
];

interface FormStyleMethodSelectorProps {
  activeMethod: FormStyleMethod;
  onMethodChange: (method: FormStyleMethod) => void;
  configuredMethods: {
    'ai-screenshot': boolean;
    captured: boolean;
    template: boolean;
    custom: boolean;
  };
}

export function FormStyleMethodSelector({
  activeMethod,
  onMethodChange,
  configuredMethods,
}: FormStyleMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Active Styling Method</h4>
          <p className="text-xs text-muted-foreground">
            Choose which styling method to use for your form
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {methods.map((method) => {
          const Icon = method.icon;
          const isActive = activeMethod === method.id;
          const isConfigured = configuredMethods[method.id];
          
          return (
            <button
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center',
                isActive
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {/* Configured indicator */}
              {isConfigured && !isActive && (
                <div className="absolute top-1.5 right-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Configured" />
                </div>
              )}
              
              {/* Active check */}
              {isActive && (
                <div className="absolute top-1.5 right-1.5">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className="flex items-center gap-1.5">
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                {method.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {method.badge}
                  </Badge>
                )}
              </div>
              
              <span className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                {method.label}
              </span>
              
              <span className="text-[10px] text-muted-foreground leading-tight">
                {method.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
