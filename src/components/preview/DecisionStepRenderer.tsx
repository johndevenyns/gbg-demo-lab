import { useState } from 'react';
import { DecisionStepConfig, DecisionChoice, DecisionChoiceIcon } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileCheck, Smartphone, Database, Shield, User, Fingerprint, Camera, CreditCard,
  ChevronDown, ChevronUp, ArrowLeft
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
  onSelectChoice: (choice: DecisionChoice) => void;
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

  const showBackButton = config.showBackButton !== false && !isFirstStep;

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
              onClick={() => onSelectChoice(choice)}
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
