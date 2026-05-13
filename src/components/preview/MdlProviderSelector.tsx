import { DidProvider } from '@/types/demo';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { ChevronRight } from 'lucide-react';

interface DidProviderSelectorProps {
  providers: DidProvider[];
  formStyle?: FormStyleConfig;
  onSelectProvider: (provider: DidProvider) => void;
  title?: string;
}

export function DidProviderSelector({
  providers,
  formStyle = DEFAULT_FORM_STYLE,
  onSelectProvider,
  title = 'Choose your ID provider',
}: DidProviderSelectorProps) {
  // Filter to only enabled providers
  const enabledProviders = providers.filter(p => p.enabled);

  if (enabledProviders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No ID providers available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4 max-w-md mx-auto">
      {/* Title */}
      <h2 
        className="text-lg font-bold text-center"
        style={{ 
          fontFamily: formStyle.fontFamily,
          color: formStyle.labelColor || '#333',
        }}
      >
        {title}
      </h2>

      {/* Provider list */}
      <ul className="w-full space-y-4">
        {enabledProviders.map((provider) => (
          <li key={provider.id}>
            <button
              onClick={() => onSelectProvider(provider)}
              className="w-full flex items-center gap-4 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: '#E3E3E8',
                fontFamily: formStyle.fontFamily,
              }}
            >
              {/* Provider logo */}
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center p-2 shrink-0">
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
              <div className="flex-1 text-left">
                <div className="font-bold text-sm" style={{ color: '#333' }}>
                  {provider.name}
                </div>
                <div className="text-sm" style={{ color: '#666' }}>
                  {provider.domain}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-6 h-6 text-gray-600 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
