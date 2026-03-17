import { CheckCircle2, XCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { 
  getFormBorderRadius, 
  getFormShadow, 
  getTitleFontSize, 
  getTitleFontWeight,
  getBodyFontSize,
  getBorderRadius
} from '@/lib/formStyleUtils';

export type ResultButtonAction = 'url' | 'portal';

export interface ResultPageConfig {
  type: 'success' | 'failure';
  title: string;
  subtitle?: string;
  message?: string;
  showIcon?: boolean;
  buttonText?: string;
  buttonAction?: ResultButtonAction;
  buttonUrl?: string;
  showReferenceId?: boolean;
  referenceId?: string;
  customContent?: string;
}

interface ResultPageProps {
  config: ResultPageConfig;
  formStyle?: FormStyleConfig;
  buttonColor?: string;
  onButtonClick?: () => void;
}

export function ResultPage({ config, formStyle, buttonColor, onButtonClick }: ResultPageProps) {
  const style = formStyle || DEFAULT_FORM_STYLE;
  const isSuccess = config.type === 'success';
  
  // Get the computed button color - prefer explicit buttonColor, then style's focus color as brand
  const computedButtonColor = buttonColor || style.inputFocusBorderColor || '#3b82f6';
  
  // Use standard success/failure colors for icons
  const successColor = '#22c55e'; // green-500
  const failureColor = '#ef4444'; // red-500
  
  // Get computed values using shared utilities
  const borderRadius = getFormBorderRadius(style.formBorderRadius);
  const boxShadow = getFormShadow(style.formShadow);
  const borderWidth = style.formBorderWidth ? `${style.formBorderWidth}px` : '1px';
  const inputBorderRadius = getBorderRadius(style.borderRadius);
  
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else if (config.buttonUrl) {
      window.location.href = config.buttonUrl;
    }
  };

  // Container styles matching form styling
  const containerStyle: React.CSSProperties = {
    fontFamily: style.fontFamily || 'inherit',
    backgroundColor: style.formBgColor || '#ffffff',
    borderRadius: borderRadius,
    border: style.formBorderWidth && style.formBorderWidth !== '0' 
      ? `${borderWidth} solid ${style.formBorderColor || '#e5e7eb'}`
      : 'none',
    boxShadow: boxShadow,
    padding: '2rem',
    maxWidth: '500px',
    margin: '0 auto',
  };

  // Text color based on form background for contrast
  const textColor = style.titleColor || (style.formBgColor && isLightColor(style.formBgColor) ? '#1f2937' : '#f9fafb');
  const mutedTextColor = style.bodyColor || (style.formBgColor && isLightColor(style.formBgColor) ? '#6b7280' : '#9ca3af');

  return (
    <div 
      className="min-h-full flex items-center justify-center p-4"
      style={{ backgroundColor: style.contentAreaBgColor || 'transparent' }}
    >
      <div style={containerStyle} className="text-center space-y-6">
        {/* Icon */}
        {config.showIcon !== false && (
          <div className="flex justify-center">
            {isSuccess ? (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${successColor}15`,
                }}
              >
                <CheckCircle2 
                  className="w-12 h-12" 
                  style={{ color: successColor }}
                />
              </div>
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${failureColor}15`,
                }}
              >
                <XCircle 
                  className="w-12 h-12" 
                  style={{ color: failureColor }}
                />
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <h2 
            className="mb-2"
            style={{ 
              fontFamily: style.fontFamily,
              color: textColor,
              fontSize: getTitleFontSize(style.titleFontSize),
              fontWeight: getTitleFontWeight(style.titleFontWeight),
              textAlign: style.titleAlignment || 'center',
            }}
          >
            {config.title}
          </h2>
          {config.subtitle && (
            <p 
              className="text-lg"
              style={{ 
                fontFamily: style.fontFamily,
                color: mutedTextColor,
              }}
            >
              {config.subtitle}
            </p>
          )}
        </div>

        {/* Message */}
        {config.message && (
          <p 
            className="max-w-md mx-auto"
            style={{ 
              fontFamily: style.fontFamily,
              color: mutedTextColor,
              fontSize: getBodyFontSize(style.bodyFontSize),
            }}
          >
            {config.message}
          </p>
        )}

        {/* Custom content (HTML) */}
        {config.customContent && (
          <div 
            className="prose prose-sm max-w-none"
            style={{ color: textColor }}
            dangerouslySetInnerHTML={{ __html: config.customContent }}
          />
        )}

        {/* Reference ID - small, just above the button */}
        {config.showReferenceId && config.referenceId && (
          <p className="font-mono text-xs" style={{ color: mutedTextColor }}>
            Ref: {config.referenceId}
          </p>
        )}

        {/* Button */}
        {config.buttonText && (
          <Button
            onClick={handleButtonClick}
            className="min-w-[200px]"
            style={{ 
              backgroundColor: computedButtonColor,
              color: '#ffffff',
              borderRadius: inputBorderRadius,
              fontFamily: style.fontFamily,
            }}
          >
            {config.buttonText}
            {config.buttonUrl ? (
              <ExternalLink className="w-4 h-4 ml-2" />
            ) : (
              <ArrowRight className="w-4 h-4 ml-2" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper to determine if a color is light (for text contrast)
function isLightColor(color: string): boolean {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
  // Default to light if we can't parse
  return true;
}

// Default configurations
export const DEFAULT_SUCCESS_CONFIG: ResultPageConfig = {
  type: 'success',
  title: 'Verification Complete',
  subtitle: 'Your identity has been verified successfully',
  message: 'Thank you for completing the verification process. You may now continue with your application.',
  showIcon: true,
  buttonText: 'Continue',
  showReferenceId: true,
};

export const DEFAULT_FAILURE_CONFIG: ResultPageConfig = {
  type: 'failure',
  title: 'Verification Unsuccessful',
  subtitle: 'We were unable to verify your identity',
  message: 'Please review your information and try again, or contact support for assistance.',
  showIcon: true,
  buttonText: 'Try Again',
  showReferenceId: true,
};
