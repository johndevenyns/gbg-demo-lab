import { useState } from 'react';
import { DecisionStepConfig, DecisionChoice, DecisionChoiceIcon, DidProvider } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileCheck, Smartphone, Database, Shield, User, Fingerprint, Camera, CreditCard,
  ChevronDown, ChevronUp, ArrowLeft, ChevronRight, Globe
} from 'lucide-react';

const getIconComponent = (iconId?: DecisionChoiceIcon, className: string = "w-6 h-6") => {
  const icons: Record<DecisionChoiceIcon, React.ReactNode> = {
    'document': <FileCheck className={className} />,
    'smartphone': <Smartphone className={className} />,
    'database': <Database className={className} />,
    'shield': <Shield className={className} />,
    'user': <User className={className} />,
    'fingerprint': <Fingerprint className={className} />,
    'camera': <Camera className={className} />,
    'id-card': <CreditCard className={className} />,
  };
  return icons[iconId || 'document'] || <FileCheck className={className} />;
};

interface DecisionStepRendererProps {
  config: DecisionStepConfig;
  formStyle: FormStyleConfig;
  buttonColor: string;
  isFirstStep: boolean;
  onSelectChoice: (choice: DecisionChoice, provider?: DidProvider) => void;
  onBack: () => void;
}

export function DecisionStepRenderer({
  config,
  formStyle,
  buttonColor,
  isFirstStep,
  onSelectChoice,
  onBack,
}: DecisionStepRendererProps) {
  const [expandedChoices, setExpandedChoices] = useState<Set<string>>(() => {
    // Initialize based on config defaults
    if (config.defaultExpanded) {
      return new Set(config.choices.filter(c => !c.collapsedByDefault).map(c => c.id));
    }
    return new Set(config.choices.filter(c => !c.collapsedByDefault).map(c => c.id));
  });

  // Track if we're showing DiD provider selection for a specific choice
  const [showingDidProvidersFor, setShowingDidProvidersFor] = useState<DecisionChoice | null>(null);

  const toggleExpanded = (choiceId: string) => {
    setExpandedChoices(prev => {
      const next = new Set(prev);
      if (next.has(choiceId)) {
        next.delete(choiceId);
      } else {
        next.add(choiceId);
      }
      return next;
    });
  };

  const handleChoiceClick = (choice: DecisionChoice) => {
    // If DiD and has providers, show provider selection
    if (choice.verificationType === 'did' && choice.mobileIdProviders && choice.mobileIdProviders.length > 0) {
      setShowingDidProvidersFor(choice);
    } else {
      // Direct selection
      onSelectChoice(choice);
    }
  };

  const handleProviderSelect = (provider: DidProvider) => {
    if (showingDidProvidersFor) {
      onSelectChoice(showingDidProvidersFor, provider);
    }
  };

  const showBackButton = config.showBackButton !== false && !isFirstStep;

  // If showing DiD providers, render that view
  if (showingDidProvidersFor) {
    const enabledProviders = showingDidProvidersFor.mobileIdProviders?.filter(p => p.enabled) || [];

    return (
      <div className="space-y-6" style={{ fontFamily: formStyle.fontFamily }}>
        {/* Title and Subtitle */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Select Your ID Provider
          </h2>
          <p className="text-muted-foreground">Choose which Digital ID to use for verification</p>
        </div>

        {/* Provider Cards */}
        <div className="space-y-2">
          {enabledProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderSelect(provider)}
              className="w-full flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-sm hover:scale-[1.005] active:scale-[0.995] bg-card"
              style={{
                borderColor: 'hsl(var(--border))',
              }}
            >
              {/* Provider logo */}
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shrink-0 border shadow-sm">
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
                <div className="font-semibold text-sm text-foreground">
                  {provider.name}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {provider.domain}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>

        {enabledProviders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No ID providers configured for this option.</p>
          </div>
        )}

        {/* Back Button */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => setShowingDidProvidersFor(null)} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Options
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: formStyle.fontFamily }}>
      {/* Title and Subtitle */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">
          {config.title || 'Choose Your Path'}
        </h2>
        {config.subtitle && (
          <p className="text-muted-foreground">{config.subtitle}</p>
        )}
      </div>

      {/* Choice Cards */}
      <div className="space-y-3">
        {config.choices.map((choice) => {
          const isExpanded = expandedChoices.has(choice.id);
          
          return (
            <Card 
              key={choice.id}
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => handleChoiceClick(choice)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${buttonColor}20` }}
                  >
                    <span style={{ color: buttonColor }}>
                      {getIconComponent(choice.icon, "w-6 h-6")}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">{choice.label}</h3>
                      {choice.description && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(choice.id);
                          }}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Description - collapsible */}
                    {choice.description && isExpanded && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {choice.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Back Button */}
      {showBackButton && (
        <div className="pt-4">
          <Button variant="outline" onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {config.backButtonLabel || 'Back'}
          </Button>
        </div>
      )}
    </div>
  );
}
