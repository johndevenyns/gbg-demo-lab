import { Check, Globe, LayoutTemplate, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormStyleSource } from '@/types/formStyle';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  icon: React.ElementType;
  badge?: string;
}

const methods: MethodOption[] = [
  {
    id: 'ai-screenshot',
    label: 'AI Screenshot',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    id: 'captured',
    label: 'Exact Capture',
    icon: Globe,
  },
  {
    id: 'template',
    label: 'Templates',
    icon: LayoutTemplate,
  },
  {
    id: 'custom',
    label: 'Customize',
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
    <Tabs value={activeMethod} onValueChange={(value) => onMethodChange(value as FormStyleMethod)} className="w-full">
      <TabsList className="w-full grid grid-cols-4 h-auto p-1">
        {methods.map((method) => {
          const Icon = method.icon;
          const isConfigured = configuredMethods[method.id];
          const isActive = activeMethod === method.id;
          
          return (
            <TabsTrigger
              key={method.id}
              value={method.id}
              className={cn(
                'relative flex items-center gap-1.5 py-2.5 px-3 text-xs font-medium',
                'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
              )}
            >
              {/* Configured indicator */}
              {isConfigured && !isActive && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Configured" />
                </div>
              )}
              
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{method.label}</span>
              {method.badge && (
                <Badge 
                  variant={isActive ? "outline" : "secondary"} 
                  className={cn(
                    "text-[9px] px-1 py-0 hidden md:inline-flex",
                    isActive && "border-primary-foreground/30 text-primary-foreground"
                  )}
                >
                  {method.badge}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
