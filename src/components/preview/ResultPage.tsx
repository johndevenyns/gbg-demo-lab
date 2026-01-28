import { CheckCircle2, XCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';

export interface ResultPageConfig {
  type: 'success' | 'failure';
  title: string;
  subtitle?: string;
  message?: string;
  showIcon?: boolean;
  buttonText?: string;
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
  
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else if (config.buttonUrl) {
      window.location.href = config.buttonUrl;
    }
  };

  return (
    <div className="text-center py-8 space-y-6">
      {/* Icon */}
      {config.showIcon !== false && (
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: style.fontFamily }}
        >
          {config.title}
        </h2>
        {config.subtitle && (
          <p 
            className="text-lg text-muted-foreground"
            style={{ fontFamily: style.fontFamily }}
          >
            {config.subtitle}
          </p>
        )}
      </div>

      {/* Message */}
      {config.message && (
        <p 
          className="text-muted-foreground max-w-md mx-auto"
          style={{ fontFamily: style.fontFamily }}
        >
          {config.message}
        </p>
      )}

      {/* Reference ID */}
      {config.showReferenceId && config.referenceId && (
        <div className="bg-muted/50 rounded-lg px-4 py-3 inline-block">
          <p className="text-xs text-muted-foreground mb-1">Reference ID</p>
          <p className="font-mono font-medium">{config.referenceId}</p>
        </div>
      )}

      {/* Custom content (HTML) */}
      {config.customContent && (
        <div 
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: config.customContent }}
        />
      )}

      {/* Button */}
      {config.buttonText && (
        <Button
          onClick={handleButtonClick}
          className="min-w-[200px]"
          style={{ backgroundColor: buttonColor }}
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
  );
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
