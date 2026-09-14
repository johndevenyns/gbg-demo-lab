import { useState, useCallback, useEffect, useRef } from 'react';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { UnifiedVerificationConfig, UserSelectionChoice, SelectionIconType, DidProvider } from '@/types/verification';
import { VerificationType } from '@/types/demo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Smartphone, Database, Shield, User, Fingerprint, Camera, CreditCard, 
  ArrowLeft, Loader2, ChevronRight
} from 'lucide-react';

// Map icon types to Lucide icons
const ICON_MAP: Record<SelectionIconType, React.ElementType> = {
  'document': FileText,
  'smartphone': Smartphone,
  'database': Database,
  'shield': Shield,
  'user': User,
  'fingerprint': Fingerprint,
  'camera': Camera,
  'id-card': CreditCard,
};

// Map typeKey to VerificationType
const TYPE_KEY_MAP: Record<string, VerificationType> = {
  'docbio': 'docBio',
  'databio': 'dataBio',
  'dataonly': 'dataOnly',
  // DiD currently falls back to dataBio
  'did': 'dataBio',
};

interface UnifiedVerificationRendererProps {
  config: UnifiedVerificationConfig;
  formStyle?: FormStyleConfig;
  buttonColor: string;
  isFirstStep: boolean;
  isLoading?: boolean;
  didProviders?: DidProvider[];
  onSelectType: (verificationType: VerificationType, typeKey: string, providerId?: string) => void;
  onBack: () => void;
}

export function UnifiedVerificationRenderer({
  config,
  formStyle,
  buttonColor,
  isFirstStep,
  isLoading = false,
  didProviders = [],
  onSelectType,
  onBack,
}: UnifiedVerificationRendererProps) {
  const style = formStyle || DEFAULT_FORM_STYLE;
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  
  // Track if we've already triggered to prevent multiple calls
  const hasTriggeredRef = useRef(false);
  const isSelectingRef = useRef(false);

  // Get contrast text color for button
  const getContrastTextColor = (hexColor: string): string => {
    if (!hexColor || hexColor === 'transparent') return '#ffffff';
    const hex = hexColor.replace('#', '');
    if (hex.length < 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
  };

  const buttonTextColor = getContrastTextColor(buttonColor);

  // Get enabled DiD providers for a specific choice
  const getEnabledDidProviders = useCallback((typeKey: string): DidProvider[] => {
    if (typeKey !== 'did') return [];
    
    const typeConfig = config.typeConfigs?.[typeKey];
    const enabledKeys = typeConfig?.enabledProviderKeys;
    
    if (!enabledKeys || enabledKeys.length === 0) {
      // All providers enabled by default
      return didProviders.filter(p => p.isEnabled);
    }
    
    return didProviders.filter(p => p.isEnabled && enabledKeys.includes(p.providerKey));
  }, [config.typeConfigs, didProviders]);

  const handleChoiceSelect = useCallback((choice: UserSelectionChoice, providerId?: string) => {
    // Prevent double-triggering
    if (isSelectingRef.current || isLoading) return;
    isSelectingRef.current = true;
    
    setSelectedChoice(choice.typeKey);
    const verificationType = TYPE_KEY_MAP[choice.typeKey] || 'docBio';
    onSelectType(verificationType, choice.typeKey, providerId);
    
    // Reset after a delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 1000);
  }, [onSelectType, isLoading]);

  const handleDidProviderSelect = useCallback((choice: UserSelectionChoice, provider: DidProvider) => {
    // Ditto expects the provider's upstream scope (e.g. "sweden-bankid"), which is
    // stored on the provider record. Fall back to the key for legacy rows.
    const dittoScope = provider.scope?.[0] || provider.providerKey;
    handleChoiceSelect(choice, dittoScope);
  }, [handleChoiceSelect]);

  // Auto-trigger for admin_preselect or auto_detect modes, or when methodSelection is not set
  const effectiveMethodSelection = config.methodSelection || 
    (config.enabledTypes.length <= 1 ? 'admin_preselect' : 'user_choice');
  const isAutoMode = effectiveMethodSelection === 'admin_preselect' || effectiveMethodSelection === 'auto_detect';
  const firstEnabledType = config.enabledTypes[0] || 'docbio';
  const verificationType = TYPE_KEY_MAP[firstEnabledType] || 'docBio';

  useEffect(() => {
    if (isAutoMode && !hasTriggeredRef.current && !isLoading) {
      hasTriggeredRef.current = true;
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        console.log('Auto-triggering verification:', verificationType, firstEnabledType);
        onSelectType(verificationType, firstEnabledType);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAutoMode, isLoading, verificationType, firstEnabledType, onSelectType]);

  // For auto modes, show a loading state
  if (isAutoMode) {
    return (
      <div className="text-center py-8 space-y-4">
        <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
        <p className="text-lg font-medium" style={{ fontFamily: style.fontFamily }}>
          Preparing Verification...
        </p>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: style.fontFamily }}>
          Please wait while we set up your verification session.
        </p>
      </div>
    );
  }

  // For user_choice, show the selection screen
  const selectionScreen = config.userSelectionScreen;
  const choices = selectionScreen?.choices || [];

  return (
    <div className="space-y-6" style={{ fontFamily: style.fontFamily }}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold" style={{ color: style.labelColor }}>
          {selectionScreen?.title || 'Choose Verification Method'}
        </h2>
        {selectionScreen?.subtitle && (
          <p className="text-muted-foreground">
            {selectionScreen.subtitle}
          </p>
        )}
      </div>

      {/* Choice Cards */}
      <div className="space-y-3">
        {choices.map((choice) => {
          const IconComponent = ICON_MAP[choice.icon] || Shield;
          const isSelected = selectedChoice === choice.typeKey;
          const isDid = choice.typeKey === 'did';
          const enabledProviders = getEnabledDidProviders(choice.typeKey);
          const showProviderList = isDid && enabledProviders.length > 0;

          return (
            <Card 
              key={choice.typeKey}
              className={`
                transition-all duration-200
                ${!showProviderList ? 'cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]' : ''}
                ${isSelected ? 'ring-2 ring-offset-2' : ''}
              `}
              style={{
                borderColor: isSelected ? buttonColor : undefined,
                ...(isSelected ? { '--tw-ring-color': buttonColor } as React.CSSProperties : {}),
              }}
              onClick={() => {
                // Only trigger directly if not an DiD choice with providers
                if (!showProviderList) {
                  handleChoiceSelect(choice);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-lg" 
                      style={{ backgroundColor: `${buttonColor}15` }}
                    >
                      <IconComponent 
                        className="w-5 h-5" 
                        style={{ color: buttonColor }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{choice.label}</CardTitle>
                      {selectionScreen?.showDescriptions && choice.description && (
                        <CardDescription className="mt-0.5">{choice.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  
                  {/* Arrow indicator for non-DiD choices */}
                  {!showProviderList && (
                    <div 
                      className="p-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: `${buttonColor}10` }}
                    >
                      {isSelected && isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: buttonColor }} />
                      ) : (
                        <ChevronRight className="w-5 h-5" style={{ color: buttonColor }} />
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* DiD Provider List */}
              {showProviderList && (
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-2 mt-2">
                    {enabledProviders.map((provider) => (
                      <button
                        key={provider.providerKey}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDidProviderSelect(choice, provider);
                        }}
                        disabled={isLoading}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl transition-all
                          hover:scale-[1.01] active:scale-[0.99]
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                        style={{
                          backgroundColor: '#E8E8EC',
                        }}
                      >
                        {/* Provider logo */}
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shrink-0 shadow-sm">
                          {provider.logoUrl ? (
                            <img
                              src={provider.logoUrl}
                              alt={provider.displayName}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Provider info */}
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-sm" style={{ color: '#333' }}>
                            {provider.displayName}
                          </div>
                          {provider.domain && (
                            <div className="text-xs" style={{ color: '#666' }}>
                              {provider.domain}
                            </div>
                          )}
                        </div>

                        {/* Arrow or loading */}
                        {isSelected && isLoading ? (
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Back Button */}
      {config.showBackButton && !isFirstStep && (
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {config.backButtonLabel || 'Back'}
          </Button>
        </div>
      )}
    </div>
  );
}
