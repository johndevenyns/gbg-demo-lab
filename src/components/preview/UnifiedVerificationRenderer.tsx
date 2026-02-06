import { useState, useCallback, useEffect, useRef } from 'react';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { UnifiedVerificationConfig, UserSelectionChoice, SelectionIconType } from '@/types/verification';
import { VerificationType } from '@/types/demo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, Smartphone, Database, Shield, User, Fingerprint, Camera, CreditCard, 
  ChevronDown, ChevronUp, ArrowLeft, Loader2
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  // mDL currently falls back to dataBio
  'mdl': 'dataBio',
};

interface UnifiedVerificationRendererProps {
  config: UnifiedVerificationConfig;
  formStyle?: FormStyleConfig;
  buttonColor: string;
  isFirstStep: boolean;
  isLoading?: boolean;
  onSelectType: (verificationType: VerificationType, typeKey: string) => void;
  onBack: () => void;
}

export function UnifiedVerificationRenderer({
  config,
  formStyle,
  buttonColor,
  isFirstStep,
  isLoading = false,
  onSelectType,
  onBack,
}: UnifiedVerificationRendererProps) {
  const style = formStyle || DEFAULT_FORM_STYLE;
  const [expandedChoices, setExpandedChoices] = useState<Set<string>>(new Set());
  
  // Track if we've already triggered auto-select to prevent multiple calls
  const hasTriggeredRef = useRef(false);

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

  const toggleChoice = useCallback((choiceId: string) => {
    setExpandedChoices(prev => {
      const next = new Set(prev);
      if (next.has(choiceId)) {
        next.delete(choiceId);
      } else {
        next.add(choiceId);
      }
      return next;
    });
  }, []);

  const handleChoiceSelect = useCallback((choice: UserSelectionChoice) => {
    const verificationType = TYPE_KEY_MAP[choice.typeKey] || 'docBio';
    onSelectType(verificationType, choice.typeKey);
  }, [onSelectType]);

  // Auto-trigger for admin_preselect or auto_detect modes
  const isAutoMode = config.methodSelection === 'admin_preselect' || config.methodSelection === 'auto_detect';
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
          const isExpanded = !choice.collapsedByDefault || expandedChoices.has(choice.typeKey);

          return (
            <Card 
              key={choice.typeKey}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => !choice.collapsedByDefault ? handleChoiceSelect(choice) : toggleChoice(choice.typeKey)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg" 
                      style={{ backgroundColor: `${buttonColor}20` }}
                    >
                      <IconComponent 
                        className="w-5 h-5" 
                        style={{ color: buttonColor }}
                      />
                    </div>
                    <CardTitle className="text-base">{choice.label}</CardTitle>
                  </div>
                  {choice.collapsedByDefault && (
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChoice(choice.typeKey);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </CardHeader>

              <Collapsible open={isExpanded}>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {selectionScreen?.showDescriptions && choice.description && (
                      <CardDescription>{choice.description}</CardDescription>
                    )}
                    <Button
                      className="w-full"
                      style={{ 
                        backgroundColor: buttonColor,
                        color: buttonTextColor,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChoiceSelect(choice);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
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
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {config.backButtonLabel || 'Back'}
          </Button>
        </div>
      )}
    </div>
  );
}
