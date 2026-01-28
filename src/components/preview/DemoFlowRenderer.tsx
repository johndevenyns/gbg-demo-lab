import { useState, useEffect, useMemo, useCallback } from 'react';
import { FormStep, PageElement, StepApiResponse } from '@/types/demo';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, ArrowLeft, ArrowRight, Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface DemoFlowRendererProps {
  steps: FormStep[];
  buttonColor: string;
  formStyle?: FormStyleConfig;
  onComplete?: () => void;
}

// Simple QR Code component (placeholder - in production use a real QR library)
function QRCodeDisplay({ url, size = 200 }: { url: string; size?: number }) {
  return (
    <div 
      className="bg-white p-4 rounded-lg inline-block"
      style={{ width: size + 32, height: size + 32 }}
    >
      <div 
        className="bg-muted border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-center">
          <QrCode className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground break-all px-2">{url?.substring(0, 50)}...</p>
        </div>
      </div>
    </div>
  );
}

// Styled form fields component with custom styling applied
interface StyledFormFieldsProps {
  fields: FormStep['fields'];
  formData: Record<string, string>;
  onInputChange: (fieldName: string, value: string) => void;
  style: FormStyleConfig;
}

function StyledFormFields({ fields, formData, onInputChange, style }: StyledFormFieldsProps) {
  const borderRadiusMap = {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  };

  const paddingMap = {
    sm: '8px 12px',
    md: '10px 14px',
    lg: '14px 18px',
  };

  const fontSizeMap = {
    sm: '14px',
    base: '16px',
    lg: '18px',
  };

  const labelWeightMap = {
    normal: 400,
    medium: 500,
    semibold: 600,
  };

  const spacingMap = {
    compact: '12px',
    normal: '16px',
    relaxed: '24px',
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    backgroundColor: style.inputBgColor,
    color: style.inputTextColor,
    border: `${style.borderWidth}px solid ${style.inputBorderColor}`,
    borderRadius: borderRadiusMap[style.borderRadius],
    padding: paddingMap[style.inputPadding || 'md'],
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    color: style.labelColor,
    fontWeight: labelWeightMap[style.labelWeight || 'medium'],
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacingMap[style.fieldSpacing || 'normal'] }}>
      {fields.map((field) => (
        <div key={field.id}>
          <label style={labelStyle}>
            {field.label}
            {field.required && <span style={{ color: style.errorColor, marginLeft: '4px' }}>*</span>}
          </label>
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={(e) => onInputChange(field.name, e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = style.inputFocusBorderColor;
              e.target.style.boxShadow = `0 0 0 3px ${style.inputFocusBorderColor}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = style.inputBorderColor;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function DemoFlowRenderer({ steps, buttonColor, formStyle, onComplete }: DemoFlowRendererProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [apiResponses, setApiResponses] = useState<StepApiResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use provided form style or default
  const style = formStyle || DEFAULT_FORM_STYLE;

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Get all API response data merged
  const allApiData = useMemo(() => {
    return apiResponses.reduce((acc, response) => {
      return { ...acc, ...response.data };
    }, {} as Record<string, unknown>);
  }, [apiResponses]);

  // Replace {{fieldName}} templates with actual data
  const interpolateTemplate = useCallback((template: string): string => {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (_, fieldName) => {
      const value = allApiData[fieldName] ?? formData[fieldName];
      return value !== undefined ? String(value) : `{{${fieldName}}}`;
    });
  }, [allApiData, formData]);

  // Get value from API response by field name
  const getApiValue = useCallback((fieldName: string): string => {
    return String(allApiData[fieldName] ?? '');
  }, [allApiData]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const goToNextStep = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const goToPrevStep = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Simulate API call for API steps
  const executeApiStep = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call with mock response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock API response
      const mockResponse: StepApiResponse = {
        stepId: currentStep.id,
        timestamp: new Date().toISOString(),
        data: {
          referenceId: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
          status: 'pending',
          verificationUrl: `https://verify.example.com/${crypto.randomUUID()}`,
          qrCodeUrl: `https://verify.example.com/qr/${crypto.randomUUID()}`,
          mobileIdUrl: `https://verify.example.com/mdl/${crypto.randomUUID()}`,
          transactionId: crypto.randomUUID(),
        },
      };
      
      setApiResponses(prev => [...prev, mockResponse]);
      
      // Auto-advance if configured
      if (currentStep.apiStepConfig?.autoAdvanceOnSuccess) {
        const delay = (currentStep.apiStepConfig.autoAdvanceDelay || 2) * 1000;
        setTimeout(goToNextStep, delay);
      }
    } catch (err) {
      setError('API call failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle step-specific rendering and actions
  useEffect(() => {
    if (currentStep?.stepType === 'api' && !apiResponses.find(r => r.stepId === currentStep.id)) {
      executeApiStep();
    }
  }, [currentStep?.id, currentStep?.stepType]);

  // Get button config for current step
  const getButtonConfig = () => {
    const defaultButtons = {
      back: { enabled: !isFirstStep, label: 'Back' },
      next: { enabled: !isLastStep, label: 'Next' },
      submit: { enabled: isLastStep, label: 'Submit' },
    };

    if (currentStep?.buttons) {
      currentStep.buttons.forEach(btn => {
        if (btn.id === 'back') defaultButtons.back = { enabled: btn.enabled && !isFirstStep, label: btn.label };
        if (btn.id === 'next') defaultButtons.next = { enabled: btn.enabled && !isLastStep, label: btn.label };
        if (btn.id === 'submit') defaultButtons.submit = { enabled: btn.enabled, label: btn.label };
      });
    }

    return defaultButtons;
  };

  const buttonConfig = getButtonConfig();

  // Render page element
  const renderPageElement = (element: PageElement) => {
    const alignment = element.alignment || 'center';
    const alignmentClass = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';

    switch (element.type) {
      case 'heading':
        return (
          <div key={element.id} className={alignmentClass}>
            <h2 className={`font-bold ${element.size === 'xl' ? 'text-3xl' : element.size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
              {interpolateTemplate(element.content || '')}
            </h2>
          </div>
        );

      case 'text':
        return (
          <div key={element.id} className={alignmentClass}>
            <p className={`text-muted-foreground ${element.size === 'lg' ? 'text-lg' : element.size === 'sm' ? 'text-sm' : 'text-base'}`}>
              {interpolateTemplate(element.content || '')}
            </p>
          </div>
        );

      case 'qr_code':
        const qrUrl = getApiValue(element.qrUrlField || '');
        return (
          <div key={element.id} className={alignmentClass}>
            <QRCodeDisplay url={qrUrl} size={element.qrSize || 200} />
          </div>
        );

      case 'url_link':
        const linkUrl = getApiValue(element.urlField || '');
        return (
          <div key={element.id} className={alignmentClass}>
            <a
              href={linkUrl}
              target={element.openInNewTab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {element.linkText || linkUrl}
              {element.openInNewTab && <ExternalLink className="w-4 h-4" />}
            </a>
          </div>
        );

      case 'status_badge':
        return (
          <div key={element.id} className={alignmentClass}>
            <Badge 
              variant="outline" 
              className={`
                ${element.variant === 'success' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                ${element.variant === 'warning' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : ''}
                ${element.variant === 'error' ? 'bg-red-500/20 text-red-600 border-red-500/30' : ''}
              `}
            >
              {interpolateTemplate(element.content || '')}
            </Badge>
          </div>
        );

      case 'data_field':
        return (
          <div key={element.id} className={alignmentClass}>
            <span className="font-mono bg-muted px-3 py-1.5 rounded text-sm">
              {interpolateTemplate(element.content || '')}
            </span>
          </div>
        );

      case 'button':
        const handleButtonClick = () => {
          if (element.buttonAction === 'next') {
            goToNextStep();
          } else if (element.buttonAction === 'redirect') {
            const url = interpolateTemplate(element.buttonUrl || '');
            window.location.href = url;
          } else if (element.buttonAction === 'copy') {
            const valueToCopy = getApiValue(element.copyField || '');
            navigator.clipboard.writeText(valueToCopy);
            toast.success('Copied to clipboard!');
          }
        };

        return (
          <div key={element.id} className={alignmentClass}>
            <Button
              onClick={handleButtonClick}
              style={{ backgroundColor: element.variant === 'primary' ? buttonColor : undefined }}
              variant={element.variant === 'primary' ? 'default' : 'outline'}
            >
              {element.buttonAction === 'copy' && <Copy className="w-4 h-4 mr-2" />}
              {interpolateTemplate(element.content || '')}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Render based on step type
  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.stepType) {
      case 'api':
        return (
          <div className="text-center py-8">
            {isLoading ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Processing...</p>
                <p className="text-sm text-muted-foreground">Please wait while we verify your information</p>
              </>
            ) : error ? (
              <>
                <p className="text-lg font-medium text-destructive">{error}</p>
                <Button onClick={executeApiStep} className="mt-4">Retry</Button>
              </>
            ) : (
              <>
                <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">Submitted Successfully</p>
                {currentStep.apiStepConfig?.responseDisplayFields?.map(field => (
                  <p key={field} className="text-sm text-muted-foreground">
                    {field}: {getApiValue(field)}
                  </p>
                ))}
              </>
            )}
          </div>
        );

      case 'path':
        return (
          <div className="text-center py-8">
            <p className="text-lg font-medium mb-4">
              {currentStep.pathStepConfig?.title || 'Verification Path'}
            </p>
            <p className="text-muted-foreground">
              {currentStep.pathStepConfig?.description || 'Proceeding with verification...'}
            </p>
          </div>
        );

      case 'verification':
        return (
          <div className="text-center py-8 space-y-6">
            {currentStep.verificationConfig?.qrCodeEnabled && (
              <div>
                <p className="font-medium mb-2">{currentStep.verificationConfig.qrCodeTitle || 'Scan QR Code'}</p>
                <QRCodeDisplay 
                  url={getApiValue(currentStep.verificationConfig.qrCodeUrlField || '')} 
                  size={200} 
                />
                {currentStep.verificationConfig.qrCodeInstructions && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {currentStep.verificationConfig.qrCodeInstructions}
                  </p>
                )}
              </div>
            )}
            {currentStep.verificationConfig?.statusEnabled && (
              <div>
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600">
                  Status: {getApiValue(currentStep.verificationConfig.statusField || '') || 'Pending'}
                </Badge>
              </div>
            )}
          </div>
        );

      case 'page':
        return (
          <div className={`py-6 space-y-4 ${currentStep.pageStepConfig?.layout === 'centered' ? 'max-w-md mx-auto' : ''}`}>
            {currentStep.pageStepConfig?.elements
              .sort((a, b) => a.order - b.order)
              .map(renderPageElement)}
          </div>
        );

      default:
        // Form step - apply custom styling
        return (
          <StyledFormFields
            fields={currentStep.fields}
            formData={formData}
            onInputChange={handleInputChange}
            style={style}
          />
        );
    }
  };

  // Don't show nav buttons for certain step types
  const showNavButtons = !['api'].includes(currentStep?.stepType || '') || !isLoading;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentStepIndex
                ? 'bg-primary'
                : index < currentStepIndex
                ? 'bg-primary/50'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">{currentStep?.title}</h2>
        {currentStep?.description && (
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        )}
      </div>

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      {showNavButtons && (
        <div className="flex gap-3 pt-4">
          {buttonConfig.back.enabled && (
            <Button variant="outline" onClick={goToPrevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {buttonConfig.back.label}
            </Button>
          )}
          
          {buttonConfig.next.enabled && currentStep?.stepType !== 'page' && (
            <Button 
              onClick={goToNextStep} 
              className="flex-1"
              style={{ backgroundColor: buttonColor }}
            >
              {buttonConfig.next.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {buttonConfig.submit.enabled && currentStep?.stepType !== 'page' && (
            <Button 
              onClick={goToNextStep}
              className="flex-1"
              style={{ backgroundColor: buttonColor }}
            >
              {buttonConfig.submit.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
