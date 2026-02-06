import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FormStep, PageElement, StepApiResponse, MdlProvider, VerificationType, StoredTestData, FormField, VerificationFlowConfig as VerificationFlowConfigType, DecisionChoice } from '@/types/demo';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { UnifiedVerificationConfig } from '@/types/verification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, AlertCircle, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ResultPage, ResultPageConfig, DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from './ResultPage';
import { VerificationMethodSelector } from './VerificationMethodSelector';
import { AddressValidationDialog } from './AddressValidationDialog';
import { DecisionStepRenderer } from './DecisionStepRenderer';
import { UnifiedVerificationRenderer } from './UnifiedVerificationRenderer';

// Helper to determine if a color is light or dark and return contrasting text color
const getContrastTextColor = (hexColor: string): string => {
  if (!hexColor || hexColor === 'transparent') return '#ffffff';
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return '#ffffff';
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return dark text for light backgrounds, white text for dark backgrounds
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
};
export interface SubmissionLogData {
  type: 'request' | 'response';
  endpoint: string;
  method: string;
  status?: number;
  data: Record<string, unknown>;
  duration?: number;
}

interface DemoFlowRendererProps {
  steps: FormStep[];
  buttonColor: string;
  formStyle?: FormStyleConfig;
  successPageConfig?: ResultPageConfig;
  failurePageConfig?: ResultPageConfig;
  approvedUrl?: string;
  rejectedUrl?: string;
  customerName?: string;
  returnUrl?: string;
  includeQr?: boolean;
  referenceIdPrefix?: string;
  storedTestData?: StoredTestData;
  showTestButtons?: boolean;
  // Branding props for verification session
  logoUrl?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  // Resource IDs for different verification types
  resourceId?: string;
  resourceIdDocBio?: string;
  resourceIdDataBio?: string;
  resourceIdDataOnly?: string;
  onSubmissionLog?: (data: SubmissionLogData) => void;
  onComplete?: (success: boolean, referenceId?: string) => void;
}

// QR Code component:
// - Prefer a direct image URL (e.g. API-provided qrCodeUrl) when it loads
// - Otherwise generate an image QR from a value (e.g. shortUrl/verifyUrl)
function QRCodeDisplay({
  value,
  imageUrl,
  size = 200,
}: {
  value?: string;
  imageUrl?: string;
  size?: number;
}) {
  const [imageError, setImageError] = useState(false);

  const normalizedValue = (value || '').trim();
  const canGenerate = normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://');
  const generatedQrUrl = canGenerate
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(normalizedValue)}`
    : '';

  const normalizedImageUrl = (imageUrl || '').trim();
  const canUseImageUrl =
    normalizedImageUrl.startsWith('http://') || normalizedImageUrl.startsWith('https://');

  const finalImgSrc = !imageError && canUseImageUrl ? normalizedImageUrl : generatedQrUrl;

  if (finalImgSrc) {
    return (
      <div className="bg-white p-4 rounded-lg inline-block shadow-md">
        <img
          src={finalImgSrc}
          alt="Verification QR Code"
          style={{ width: size, height: size }}
          className="mx-auto"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg inline-block" style={{ width: size + 32, height: size + 32 }}>
      <div
        className="bg-muted border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="text-center">
          <QrCode className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground px-2">Waiting for session…</p>
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
  fieldErrors?: Record<string, string>;
}

function StyledFormFields({ fields, formData, onInputChange, style, fieldErrors = {} }: StyledFormFieldsProps) {
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

  const getInputStyle = (fieldName: string): React.CSSProperties => ({
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    backgroundColor: style.inputBgColor,
    color: style.inputTextColor,
    border: `${style.borderWidth}px solid ${fieldErrors[fieldName] ? style.errorColor : style.inputBorderColor}`,
    borderRadius: borderRadiusMap[style.borderRadius],
    padding: paddingMap[style.inputPadding || 'md'],
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const labelStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: fontSizeMap[style.fontSize],
    color: style.labelColor,
    fontWeight: labelWeightMap[style.labelWeight || 'medium'],
    marginBottom: '6px',
    display: 'block',
  };

  const errorStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: '12px',
    color: style.errorColor,
    marginTop: '4px',
  };

  // Content field types that don't need input handling
  const contentFieldTypes = ['heading', 'paragraph', 'divider', 'consent_checkbox'];

  const renderField = (field: FormField) => {
    // Handle content elements (non-input fields)
    if (field.type === 'heading') {
      return (
        <div key={field.id}>
          <h3 style={{ 
            fontFamily: style.fontFamily,
            fontSize: '18px',
            fontWeight: 600,
            color: style.titleColor || style.labelColor,
            marginBottom: '4px',
          }}>
            {field.content || field.label}
          </h3>
        </div>
      );
    }

    if (field.type === 'paragraph') {
      return (
        <div key={field.id}>
          <p style={{ 
            fontFamily: style.fontFamily,
            fontSize: fontSizeMap[style.fontSize],
            color: style.bodyColor || style.labelColor,
            lineHeight: 1.6,
          }}>
            {field.content || field.placeholder || 'Text content here...'}
          </p>
        </div>
      );
    }

    if (field.type === 'divider') {
      return (
        <div key={field.id} style={{ padding: '8px 0' }}>
          <hr style={{ 
            border: 'none',
            borderTop: `1px solid ${style.inputBorderColor}`,
          }} />
        </div>
      );
    }

    if (field.type === 'consent_checkbox') {
      const isChecked = formData[field.name] === 'true';
      return (
        <div key={field.id}>
          <label 
            style={{ 
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer',
              fontFamily: style.fontFamily,
              fontSize: fontSizeMap[style.fontSize],
              color: style.labelColor,
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => onInputChange(field.name, e.target.checked ? 'true' : 'false')}
              style={{
                width: '18px',
                height: '18px',
                marginTop: '2px',
                accentColor: style.inputFocusBorderColor,
                cursor: 'pointer',
              }}
            />
            <span style={{ flex: 1, lineHeight: 1.5 }}>
              {field.consentText || field.label}
              {(field.consentRequired || field.required) && (
                <span style={{ color: style.errorColor, marginLeft: '4px' }}>*</span>
              )}
            </span>
          </label>
          {fieldErrors[field.name] && (
            <p style={errorStyle}>{fieldErrors[field.name]}</p>
          )}
        </div>
      );
    }

    // Regular input fields
    return (
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
          style={getInputStyle(field.name)}
          onFocus={(e) => {
            if (!fieldErrors[field.name]) {
              e.target.style.borderColor = style.inputFocusBorderColor;
              e.target.style.boxShadow = `0 0 0 3px ${style.inputFocusBorderColor}20`;
            }
          }}
          onBlur={(e) => {
            if (!fieldErrors[field.name]) {
              e.target.style.borderColor = style.inputBorderColor;
              e.target.style.boxShadow = 'none';
            }
          }}
        />
        {fieldErrors[field.name] && (
          <p style={errorStyle}>{fieldErrors[field.name]}</p>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacingMap[style.fieldSpacing || 'normal'] }}>
      {fields.map(renderField)}
    </div>
  );
}

export function DemoFlowRenderer({ 
  steps, 
  buttonColor, 
  formStyle, 
  successPageConfig,
  failurePageConfig,
  approvedUrl,
  rejectedUrl,
  customerName,
  returnUrl,
  includeQr,
  referenceIdPrefix,
  storedTestData,
  showTestButtons = false,
  logoUrl,
  headerBgColor,
  headerTextColor,
  resourceId,
  resourceIdDocBio,
  resourceIdDataBio,
  resourceIdDataOnly,
  onSubmissionLog,
  onComplete 
}: DemoFlowRendererProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [apiResponses, setApiResponses] = useState<StepApiResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowComplete, setFlowComplete] = useState<'success' | 'failure' | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [selectedVerificationType, setSelectedVerificationType] = useState<VerificationType | null>(null);
  const [selectedDecisionChoice, setSelectedDecisionChoice] = useState<DecisionChoice | null>(null);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  // Use ref for verification session data to avoid race condition with state updates
  const verificationSessionDataRef = useRef<{
    qrCodeUrl?: string;
    shortUrl?: string;
    verifyUrl?: string;
  } | null>(null);
  // State to trigger re-render when session data is set
  const [, forceUpdate] = useState({});
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Address validation state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    originalAddress: string;
    suggestedAddress: string;
    confidence: number;
    aqi: string;
    isApiError: boolean;
  } | null>(null);
  const [pendingNextStep, setPendingNextStep] = useState(false);

  // Form validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    // Clear error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Validate required fields for current step
  const validateRequiredFields = useCallback((): boolean => {
    if (!currentStep?.fields) return true;
    
    const errors: Record<string, string> = {};
    
    currentStep.fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors[field.name] = `${field.label} is required`;
        }
      }
    });
    
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please fill in all required fields');
      return false;
    }
    
    return true;
  }, [currentStep?.fields, formData]);

  // Fill form with test data (pass or fail)
  const fillTestData = useCallback((type: 'pass' | 'fail') => {
    if (!storedTestData) {
      toast.error('No test data configured');
      return;
    }
    
    const data = type === 'pass' ? storedTestData.passData : storedTestData.failData;
    if (!data || Object.keys(data).length === 0) {
      toast.error(`No ${type} test data configured`);
      return;
    }
    
    setFormData(prev => ({ ...prev, ...data }));
    toast.success(`Form filled with ${type} test data`);
  }, [storedTestData]);

  // Validate address using Loqate API
  const validateAddress = useCallback(async (): Promise<{
    isValid: boolean;
    confidence: number;
    aqi: string;
    suggestedAddress: string;
    isApiError: boolean;
  }> => {
    // Build combined address from form data
    const street = formData.addressStreet || '';
    const city = formData.addressCity || '';
    const state = formData.addressState || '';
    const zip = formData.addressZip || '';
    const country = formData.addressCountry || 'USA';
    
    const combinedAddress = [street, city, state, zip].filter(Boolean).join(', ');
    
    if (!combinedAddress.trim()) {
      return { isValid: true, confidence: 100, aqi: 'A', suggestedAddress: '', isApiError: false };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('address-verification', {
        body: {
          action: 'verify',
          text: combinedAddress,
          address1: street,
          locality: city,
          administrativeArea: state,
          postalCode: zip,
          country: country,
        }
      });

      console.log('Address validation response:', data, error);

      if (error || !data?.success) {
        // API error - allow proceed with warning
        return {
          isValid: true,
          confidence: 0,
          aqi: '',
          suggestedAddress: '',
          isApiError: true,
        };
      }

      return {
        isValid: !data.isLowConfidence,
        confidence: data.confidence || 0,
        aqi: data.aqi || '',
        suggestedAddress: data.suggestedAddress || '',
        isApiError: false,
      };
    } catch (err) {
      console.error('Address validation error:', err);
      return {
        isValid: true,
        confidence: 0,
        aqi: '',
        suggestedAddress: '',
        isApiError: true,
      };
    }
  }, [formData]);

  // Complete the flow (success or failure)
  const completeFlow = useCallback((success: boolean, refId?: string) => {
    setFlowComplete(success ? 'success' : 'failure');
    if (refId) setReferenceId(refId);
    onComplete?.(success, refId);
  }, [onComplete]);

  // Handle address validation dialog proceed
  const handleAddressValidationProceed = useCallback((useOriginal: boolean) => {
    if (!useOriginal && addressValidation?.suggestedAddress) {
      // Parse the suggested address and update form fields
      // For now, we just store the combined address - could be enhanced to parse into fields
      toast.success('Using suggested address');
    }
    setShowAddressDialog(false);
    setAddressValidation(null);
    setPendingNextStep(true);
  }, [addressValidation]);

  // Effect to continue to next step after dialog closes
  useEffect(() => {
    if (pendingNextStep && !showAddressDialog) {
      setPendingNextStep(false);
      if (isLastStep) {
        const refId = referenceId || (allApiData.referenceId as string) || `REF-${Date.now().toString(36).toUpperCase()}`;
        completeFlow(true, refId);
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    }
  }, [pendingNextStep, showAddressDialog, isLastStep, referenceId, allApiData, completeFlow]);

  // Proceed to next step (internal - after validation)
  const proceedToNextStep = useCallback(() => {
    if (isLastStep) {
      const refId = referenceId || (allApiData.referenceId as string) || `REF-${Date.now().toString(36).toUpperCase()}`;
      completeFlow(true, refId);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLastStep, completeFlow, referenceId, allApiData]);

  // Check if current step has address fields
  const hasAddressFields = useCallback((step: FormStep | undefined): boolean => {
    if (!step?.fields) return false;
    const addressFieldTypes = ['address_street', 'address_city', 'address_state', 'address_zip', 'address_country'];
    return step.fields.some(f => addressFieldTypes.includes(f.type));
  }, []);

  const goToNextStep = useCallback(async () => {
    // First validate required fields for form steps
    if (currentStep?.stepType === 'form' && !validateRequiredFields()) {
      return;
    }

    // Check if address validation is enabled and step has address fields
    if (currentStep?.addressValidationEnabled && hasAddressFields(currentStep)) {
      setIsLoading(true);
      const validation = await validateAddress();
      setIsLoading(false);

      if (!validation.isValid || validation.isApiError) {
        // Build combined address for display
        const street = formData.addressStreet || '';
        const city = formData.addressCity || '';
        const state = formData.addressState || '';
        const zip = formData.addressZip || '';
        const combinedAddress = [street, city, state, zip].filter(Boolean).join(', ');
        
        setAddressValidation({
          originalAddress: combinedAddress,
          suggestedAddress: validation.suggestedAddress,
          confidence: validation.confidence,
          aqi: validation.aqi,
          isApiError: validation.isApiError,
        });
        setShowAddressDialog(true);
        return;
      }
    }
    
    // No validation needed or validation passed
    proceedToNextStep();
  }, [currentStep, hasAddressFields, validateAddress, formData, proceedToNextStep, validateRequiredFields]);

  const goToPrevStep = () => {
    if (!isFirstStep) {
      setFieldErrors({});
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Execute real API call for API steps
  const executeApiStep = async () => {
    setIsLoading(true);
    setError(null);
    
    const config = currentStep.apiStepConfig;
    const startTime = Date.now();
    
    // Check if endpoint URL is configured
    if (!config?.endpointUrl) {
      // Fall back to mock response if no endpoint configured
      console.log('No endpoint configured, using mock response');
      
      // Log mock request
      onSubmissionLog?.({
        type: 'request',
        endpoint: '(mock) No endpoint configured',
        method: 'POST',
        data: formData,
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      
      // Log mock response
      onSubmissionLog?.({
        type: 'response',
        endpoint: '(mock) No endpoint configured',
        method: 'POST',
        status: 200,
        data: mockResponse.data,
        duration: Date.now() - startTime,
      });
      
      setApiResponses(prev => [...prev, mockResponse]);
      setIsLoading(false);
      
      if (config?.autoAdvanceOnSuccess) {
        const delay = (config.autoAdvanceDelay || 2) * 1000;
        setTimeout(goToNextStep, delay);
      }
      return;
    }
    
    try {
      // Build request body with form data
      let requestBody: Record<string, unknown> = {};
      
      if (config.includeFields && config.includeFields.length > 0) {
        // Include only specified fields
        config.includeFields.forEach(fieldName => {
          if (formData[fieldName] !== undefined) {
            requestBody[fieldName] = formData[fieldName];
          }
        });
      } else {
        // Include all collected form data
        requestBody = { ...formData };
      }

      console.log('Calling API endpoint:', config.endpointUrl);
      console.log('Request body:', requestBody);
      
      // Log request
      onSubmissionLog?.({
        type: 'request',
        endpoint: config.endpointUrl,
        method: config.method || 'POST',
        data: requestBody,
      });

      // Call the API proxy edge function
      const { data, error: invokeError } = await supabase.functions.invoke('api-proxy', {
        body: {
          endpointUrl: config.endpointUrl,
          method: config.method || 'POST',
          body: requestBody,
        },
      });

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        
        // Log error response
        onSubmissionLog?.({
          type: 'response',
          endpoint: config.endpointUrl,
          method: config.method || 'POST',
          status: 500,
          data: { error: invokeError.message },
          duration: Date.now() - startTime,
        });
        
        throw new Error(invokeError.message || 'Failed to call API');
      }

      console.log('API response:', data);
      
      // Log response
      onSubmissionLog?.({
        type: 'response',
        endpoint: config.endpointUrl,
        method: config.method || 'POST',
        status: data.status || 200,
        data: typeof data.data === 'object' ? data.data : { response: data.data },
        duration: Date.now() - startTime,
      });

      if (!data.success) {
        throw new Error(data.error || `API returned status ${data.status}`);
      }

      // Create response object
      const apiResponse: StepApiResponse = {
        stepId: currentStep.id,
        timestamp: new Date().toISOString(),
        data: typeof data.data === 'object' ? data.data : { response: data.data },
      };
      
      setApiResponses(prev => [...prev, apiResponse]);
      toast.success('API call successful');
      
      // Auto-advance if configured
      if (config.autoAdvanceOnSuccess) {
        const delay = (config.autoAdvanceDelay || 2) * 1000;
        setTimeout(goToNextStep, delay);
      }
    } catch (err) {
      console.error('API call error:', err);
      const errorMessage = err instanceof Error ? err.message : 'API call failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create verification session with the API
  // skipAdvance: if true, don't call goToNextStep after creation (for unified_verification)
  const createVerificationSession = useCallback(async (verificationType: VerificationType, skipAdvance = false) => {
    // Guard against duplicate calls
    if (verificationSessionId) {
      console.log('Session already exists, skipping creation');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();
    
    // Determine the correct resource ID based on verification type
    const getResourceIdForType = (type: VerificationType): string | undefined => {
      switch (type) {
        case 'docBio':
          return resourceIdDocBio || resourceId;
        case 'dataBio':
          return resourceIdDataBio || resourceId;
        case 'dataOnly':
          return resourceIdDataOnly || resourceId;
        default:
          return resourceId;
      }
    };
    
    const requestBody = {
      formData,
      verificationType,
      customerName: customerName || 'Verification Demo',
      returnUrl: returnUrl || window.location.href,
      includeQr: includeQr ?? true,
      referenceIdPrefix: referenceIdPrefix,
      resourceId: getResourceIdForType(verificationType),
      logoUrl: logoUrl,
      branding: {
        buttonColor: buttonColor,
        headerTextColor: headerTextColor,
        headerBgColor: headerBgColor,
      },
    };
    
    // Log request
    onSubmissionLog?.({
      type: 'request',
      endpoint: 'create-verification-session',
      method: 'POST',
      data: requestBody,
    });
    
    try {
      console.log('Creating verification session:', { verificationType, customerName, formData, branding: requestBody.branding });
      
      const { data, error: invokeError } = await supabase.functions.invoke('create-verification-session', {
        body: requestBody,
      });

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        
        // Log error response
        onSubmissionLog?.({
          type: 'response',
          endpoint: 'create-verification-session',
          method: 'POST',
          status: 500,
          data: { error: invokeError.message },
          duration: Date.now() - startTime,
        });
        
        throw new Error(invokeError.message || 'Failed to create verification session');
      }

      console.log('Verification session created:', data);
      
      // Log response
      onSubmissionLog?.({
        type: 'response',
        endpoint: 'create-verification-session',
        method: 'POST',
        status: data.success ? 200 : 400,
        data: data,
        duration: Date.now() - startTime,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to create verification session');
      }

      // Store session data
      setVerificationSessionId(data.sessionId);
      if (data.referenceId) {
        setReferenceId(data.referenceId);
      }
      
      // Store verification URLs in ref for immediate access (refs update synchronously)
      verificationSessionDataRef.current = {
        qrCodeUrl: data.qrCodeUrl,
        shortUrl: data.shortUrl,
        verifyUrl: data.verifyUrl,
      };
      // Force re-render to pick up the ref data
      forceUpdate({});

      // Store response in apiResponses for template interpolation
      const apiResponse: StepApiResponse = {
        stepId: currentStep?.id || 'verification',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: data.sessionId,
          verifyUrl: data.verifyUrl,
          shortUrl: data.shortUrl,
          qrCodeUrl: data.qrCodeUrl,
          status: data.status,
          referenceId: data.referenceId,
        },
      };
      setApiResponses(prev => [...prev, apiResponse]);

      toast.success('Verification session created');
      
      // Only advance to next step if not skipping (unified_verification skips to show QR)
      if (!skipAdvance) {
        goToNextStep();
      }
      
    } catch (err) {
      console.error('Create verification session error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create verification session';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [formData, customerName, returnUrl, includeQr, referenceIdPrefix, resourceId, resourceIdDocBio, resourceIdDataBio, resourceIdDataOnly, logoUrl, buttonColor, headerTextColor, headerBgColor, currentStep?.id, goToNextStep, onSubmissionLog, verificationSessionId]);

  // Poll for verification status
  const pollVerificationStatus = useCallback(async () => {
    if (!verificationSessionId) return;

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-verification-status', {
        body: { sessionId: verificationSessionId },
      });

      if (invokeError) {
        console.error('Status poll error:', invokeError);
        return;
      }

      console.log('Verification status:', data);
      setPollingStatus(data.status);

      if (data.isComplete) {
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        if (data.isPassed) {
          completeFlow(true, referenceId || undefined);
        } else {
          completeFlow(false, referenceId || undefined);
        }
      }
    } catch (err) {
      console.error('Status poll error:', err);
    }
  }, [verificationSessionId, referenceId, completeFlow]);

  // Start polling when verification session is created
  useEffect(() => {
    const isVerificationStep = currentStep?.stepType === 'verification' || 
      currentStep?.stepType === 'verification_flow' || 
      currentStep?.stepType === 'unified_verification';
    if (verificationSessionId && isVerificationStep) {
      let pollingInterval = 5000; // default 5 seconds
      
      if (currentStep?.stepType === 'verification_flow') {
        pollingInterval = (currentStep.verificationFlowConfig?.statusPollingInterval || 5) * 1000;
      } else if (currentStep?.stepType === 'unified_verification') {
        // Get polling interval from type config if available
        const enabledTypes = currentStep.unifiedVerificationConfig?.enabledTypes || [];
        const firstType = enabledTypes[0];
        const typeConfig = firstType ? currentStep.unifiedVerificationConfig?.typeConfigs?.[firstType] : undefined;
        pollingInterval = (typeConfig?.statusPollingInterval || 5) * 1000;
      } else {
        pollingInterval = (currentStep?.verificationConfig?.statusPollingInterval || 5) * 1000;
      }
      
      pollingRef.current = setInterval(pollVerificationStatus, pollingInterval);
      
      // Initial poll
      pollVerificationStatus();

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }
  }, [verificationSessionId, currentStep?.stepType, currentStep?.verificationConfig?.statusPollingInterval, currentStep?.verificationFlowConfig?.statusPollingInterval, currentStep?.unifiedVerificationConfig, pollVerificationStatus]);

  // Handle method selection
  const handleDocumentScanSelected = useCallback(() => {
    const path = currentStep?.methodSelectionConfig?.documentScanPath || 'docbio';
    setSelectedVerificationType(path === 'databio' ? 'dataBio' : 'docBio');
    createVerificationSession(path === 'databio' ? 'dataBio' : 'docBio');
  }, [currentStep?.methodSelectionConfig?.documentScanPath, createVerificationSession]);

  const handleMdlProviderSelected = useCallback((provider: MdlProvider) => {
    console.log('mDL provider selected:', provider);
    // For mDL, we would typically redirect to the provider's flow
    // For now, we'll create a dataBio session as a fallback
    setSelectedVerificationType('dataBio');
    toast.info(`${provider.name} selected - starting verification...`);
    createVerificationSession('dataBio');
  }, [createVerificationSession]);

  // Handle decision step choice selection
  const handleDecisionChoice = useCallback((choice: DecisionChoice, provider?: MdlProvider) => {
    console.log('Decision choice selected:', choice, 'provider:', provider);
    setSelectedDecisionChoice(choice);
    
    if (choice.destinationType === 'verification') {
      // Map verification type string to VerificationType
      const verificationTypeMap: Record<string, VerificationType> = {
        'docbio': 'docBio',
        'databio': 'dataBio',
        'dataonly': 'dataOnly',
        'mdl': 'dataBio', // mDL falls back to dataBio for now
      };
      const vType = verificationTypeMap[choice.verificationType || 'docbio'] || 'docBio';
      setSelectedVerificationType(vType);
      
      // Log the selected provider for mDL if provided
      if (provider) {
        console.log('mDL provider selected:', provider.name, provider.providerKey);
        toast.info(`${provider.name} selected - starting verification...`);
      }
      
      createVerificationSession(vType);
    } else if (choice.destinationType === 'step') {
      // Jump to specific step
      const targetIndex = steps.findIndex(s => s.id === choice.targetStepId);
      if (targetIndex !== -1) {
        setCurrentStepIndex(targetIndex);
      } else {
        toast.error('Target step not found');
      }
    } else {
      // 'next' - continue to next step
      goToNextStep();
    }
  }, [createVerificationSession, steps, goToNextStep]);

  // Handle unified verification type selection
  const handleUnifiedVerificationSelect = useCallback((verificationType: VerificationType, typeKey: string) => {
    console.log('Unified verification selected:', verificationType, typeKey);
    setSelectedVerificationType(verificationType);
    
    // Get type-specific config if available
    const typeConfig = currentStep?.unifiedVerificationConfig?.typeConfigs?.[typeKey];
    
    // Create verification session - skip advance so we stay on step to show QR/polling
    createVerificationSession(verificationType, true);
  }, [createVerificationSession, currentStep?.unifiedVerificationConfig]);

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

    // Handle verification step button config
    if (currentStep?.stepType === 'verification' && currentStep.verificationConfig) {
      const vc = currentStep.verificationConfig;
      defaultButtons.back = { 
        enabled: (vc.showBackButton ?? true) && !isFirstStep, 
        label: vc.backButtonLabel || 'Back' 
      };
      defaultButtons.next = { 
        enabled: (vc.showNextButton ?? false) && !isLastStep, 
        label: vc.nextButtonLabel || 'Continue' 
      };
      defaultButtons.submit = { 
        enabled: (vc.showNextButton ?? false) && isLastStep, 
        label: vc.nextButtonLabel || 'Submit' 
      };
    }
    // Handle verification_flow step button config
    else if (currentStep?.stepType === 'verification_flow' && currentStep.verificationFlowConfig) {
      const vc = currentStep.verificationFlowConfig;
      defaultButtons.back = { 
        enabled: (vc.showBackButton ?? true) && !isFirstStep, 
        label: vc.backButtonLabel || 'Back' 
      };
      defaultButtons.next = { 
        enabled: (vc.showNextButton ?? false) && !isLastStep, 
        label: vc.nextButtonLabel || 'Continue' 
      };
      defaultButtons.submit = { 
        enabled: (vc.showNextButton ?? false) && isLastStep, 
        label: vc.nextButtonLabel || 'Submit' 
      };
    }
    // Handle unified_verification step button config
    else if (currentStep?.stepType === 'unified_verification' && currentStep.unifiedVerificationConfig) {
      const vc = currentStep.unifiedVerificationConfig;
      defaultButtons.back = { 
        enabled: (vc.showBackButton ?? true) && !isFirstStep, 
        label: vc.backButtonLabel || 'Back' 
      };
      // Unified verification handles its own navigation, so disable default buttons
      defaultButtons.next = { enabled: false, label: 'Continue' };
      defaultButtons.submit = { enabled: false, label: 'Submit' };
    }
    // Handle standard button config from step.buttons
    else if (currentStep?.buttons) {
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
        const qrValue = getApiValue(element.qrUrlField || '');
        return (
          <div key={element.id} className={alignmentClass}>
            <QRCodeDisplay value={qrValue} size={element.qrSize || 200} />
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
        const hasEndpoint = !!currentStep.apiStepConfig?.endpointUrl;
        return (
          <div className="text-center py-8">
            {isLoading ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Processing...</p>
                <p className="text-sm text-muted-foreground">
                  {hasEndpoint 
                    ? `Calling ${currentStep.apiStepConfig?.endpointUrl}...`
                    : 'Please wait while we verify your information'
                  }
                </p>
              </>
            ) : error ? (
              <div className="space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                <p className="text-lg font-medium text-destructive">Request Failed</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
                <Button onClick={executeApiStep} variant="outline" className="mt-4">
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">
                  {hasEndpoint ? 'Request Successful' : 'Submitted Successfully'}
                </p>
                {currentStep.apiStepConfig?.responseDisplayFields?.map(field => {
                  const value = getApiValue(field);
                  return value ? (
                    <p key={field} className="text-sm text-muted-foreground">
                      <span className="font-medium">{field}:</span> {value}
                    </p>
                  ) : null;
                })}
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

      case 'verification_flow':
        // New consolidated verification flow step
        const vfConfig = currentStep.verificationFlowConfig;
        const isDataOnly = vfConfig?.pathType === 'dataonly';
        
        // Get QR data from verification session
        const vfQrImageUrl =
          verificationSessionDataRef.current?.qrCodeUrl ||
          (allApiData.qrCodeUrl as string);
        const vfShortUrl = verificationSessionDataRef.current?.shortUrl || (allApiData.shortUrl as string) || '';
        const vfVerifyUrl = verificationSessionDataRef.current?.verifyUrl || (allApiData.verifyUrl as string) || '';
        const vfQrValue = vfShortUrl || vfVerifyUrl;
        const vfStatus = pollingStatus || (allApiData.status as string) || 'Pending';
        
        // For data-only paths, show processing status
        if (isDataOnly) {
          return (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center">
                {vfStatus === 'completed' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : vfStatus === 'failed' ? (
                  <XCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                )}
              </div>
              <p className="text-lg font-medium">{vfConfig?.title || 'Data Verification'}</p>
              <p className="text-muted-foreground">{vfConfig?.description || 'Verifying your information...'}</p>
              <Badge 
                variant="outline" 
                className={`
                  ${vfStatus === 'completed' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                  ${vfStatus === 'failed' || vfStatus === 'expired' ? 'bg-red-500/20 text-red-600 border-red-500/30' : ''}
                  ${vfStatus === 'pending' || vfStatus === 'in_progress' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : ''}
                `}
              >
                Status: {vfStatus}
              </Badge>
            </div>
          );
        }
        
        // For doc/bio paths, show QR code and status
        return (
          <div className="text-center py-8 space-y-6">
            {/* Path info */}
            <div>
              <p className="text-lg font-medium">{vfConfig?.title || 'Identity Verification'}</p>
              <p className="text-muted-foreground text-sm">{vfConfig?.description}</p>
            </div>
            
            {/* QR Code section */}
            {vfConfig?.qrCodeEnabled && (
              <div>
                <p className="font-medium mb-2">{vfConfig.qrCodeTitle || 'Scan QR Code'}</p>
                <QRCodeDisplay imageUrl={vfQrImageUrl} value={vfQrValue} size={200} />
                {vfConfig.qrCodeInstructions && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {vfConfig.qrCodeInstructions}
                  </p>
                )}
                {vfShortUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Or visit: <a href={vfShortUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{vfShortUrl}</a>
                  </p>
                )}
              </div>
            )}
            
            {/* Direct redirect option */}
            {vfVerifyUrl && !vfConfig?.qrCodeEnabled && (
              <div className="space-y-4">
                <Smartphone className="w-12 h-12 mx-auto text-primary" />
                <p className="font-medium">Continue on this device</p>
                <Button
                  onClick={() => window.location.href = vfVerifyUrl}
                  style={{ backgroundColor: buttonColor }}
                >
                  Start Verification
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            
            {/* Status display */}
            {vfConfig?.statusEnabled && (
              <div className="space-y-2">
                <Badge 
                  variant="outline" 
                  className={`
                    ${vfStatus === 'completed' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                    ${vfStatus === 'failed' || vfStatus === 'expired' ? 'bg-red-500/20 text-red-600 border-red-500/30' : ''}
                    ${vfStatus === 'pending' || vfStatus === 'in_progress' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : ''}
                  `}
                >
                  Status: {vfStatus}
                </Badge>
                {verificationSessionId && (
                  <p className="text-xs text-muted-foreground">
                    Session: {verificationSessionId.substring(0, 8)}...
                  </p>
                )}
                {(vfStatus === 'pending' || vfStatus === 'in_progress') && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for verification...
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'verification':
        // Debug: Log available API data to trace qrCodeUrl
        console.log('Verification step - allApiData:', allApiData);
        console.log('Verification step - verificationSessionDataRef:', verificationSessionDataRef.current);
        // Use ref data first (synchronous update), then fall back to allApiData
        const qrImageUrl =
          verificationSessionDataRef.current?.qrCodeUrl ||
          (allApiData.qrCodeUrl as string) ||
          getApiValue(currentStep.verificationConfig?.qrCodeUrlField || '');
        const shortUrl = verificationSessionDataRef.current?.shortUrl || (allApiData.shortUrl as string) || '';
        const verifyUrl = verificationSessionDataRef.current?.verifyUrl || (allApiData.verifyUrl as string) || '';
        const qrValue = shortUrl || verifyUrl;
        const currentStatus = pollingStatus || (allApiData.status as string) || getApiValue(currentStep.verificationConfig?.statusField || '') || 'Pending';
        console.log('Verification URLs:', { qrImageUrl, qrValue, shortUrl, verifyUrl, currentStatus });
        
        return (
          <div className="text-center py-8 space-y-6">
            {/* QR Code section */}
            {currentStep.verificationConfig?.qrCodeEnabled && (
              <div>
                <p className="font-medium mb-2">{currentStep.verificationConfig.qrCodeTitle || 'Scan QR Code'}</p>
                <QRCodeDisplay imageUrl={qrImageUrl} value={qrValue} size={200} />
                {currentStep.verificationConfig.qrCodeInstructions && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {currentStep.verificationConfig.qrCodeInstructions}
                  </p>
                )}
                {shortUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Or visit: <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{shortUrl}</a>
                  </p>
                )}
              </div>
            )}
            
            {/* Direct redirect option */}
            {verifyUrl && !currentStep.verificationConfig?.qrCodeEnabled && (
              <div className="space-y-4">
                <Smartphone className="w-12 h-12 mx-auto text-primary" />
                <p className="font-medium">Continue on this device</p>
                <Button
                  onClick={() => window.location.href = verifyUrl}
                  style={{ backgroundColor: buttonColor }}
                >
                  Start Verification
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            
            {/* Status display */}
            {currentStep.verificationConfig?.statusEnabled && (
              <div className="space-y-2">
                <Badge 
                  variant="outline" 
                  className={`
                    ${currentStatus === 'completed' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                    ${currentStatus === 'failed' || currentStatus === 'expired' ? 'bg-red-500/20 text-red-600 border-red-500/30' : ''}
                    ${currentStatus === 'pending' || currentStatus === 'in_progress' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : ''}
                  `}
                >
                  Status: {currentStatus}
                </Badge>
                {verificationSessionId && (
                  <p className="text-xs text-muted-foreground">
                    Session: {verificationSessionId.substring(0, 8)}...
                  </p>
                )}
                {(currentStatus === 'pending' || currentStatus === 'in_progress') && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for verification...
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'method_selection':
        return (
          <VerificationMethodSelector
            config={currentStep.methodSelectionConfig || {
              documentScanEnabled: true,
              mobileIdEnabled: true,
            }}
            formStyle={style}
            onSelectDocumentScan={handleDocumentScanSelected}
            onSelectProvider={handleMdlProviderSelected}
          />
        );

      case 'decision':
        return (
          <DecisionStepRenderer
            config={currentStep.decisionStepConfig || {
              title: 'Choose Your Path',
              subtitle: 'Select how you would like to proceed',
              choices: [],
              defaultExpanded: true,
              showBackButton: true,
              backButtonLabel: 'Back',
            }}
            formStyle={style}
            buttonColor={buttonColor}
            isFirstStep={isFirstStep}
            onSelectChoice={handleDecisionChoice}
            onBack={goToPrevStep}
          />
        );

      case 'page':
        return (
          <div className={`py-6 space-y-4 ${currentStep.pageStepConfig?.layout === 'centered' ? 'max-w-md mx-auto' : ''}`}>
            {currentStep.pageStepConfig?.elements
              .sort((a, b) => a.order - b.order)
              .map(renderPageElement)}
          </div>
        );

      case 'unified_verification':
        // New unified verification step
        const unifiedConfig = currentStep.unifiedVerificationConfig;
        if (!unifiedConfig) {
          return (
            <div className="text-center py-8 text-muted-foreground">
              <p>Verification step not configured</p>
            </div>
          );
        }
        
        // If session exists, show QR code and polling UI
        if (verificationSessionId) {
          const uvQrImageUrl = verificationSessionDataRef.current?.qrCodeUrl || (allApiData.qrCodeUrl as string);
          const uvShortUrl = verificationSessionDataRef.current?.shortUrl || (allApiData.shortUrl as string) || '';
          const uvVerifyUrl = verificationSessionDataRef.current?.verifyUrl || (allApiData.verifyUrl as string) || '';
          const uvQrValue = uvShortUrl || uvVerifyUrl;
          const uvStatus = pollingStatus || (allApiData.status as string) || 'pending';
          
          // Get type config for display settings
          const enabledTypes = unifiedConfig.enabledTypes || [];
          const activeTypeKey = enabledTypes[0] || 'docbio';
          const typeConfig = unifiedConfig.typeConfigs?.[activeTypeKey];
          const isDataOnly = activeTypeKey === 'dataonly';
          
          // For data-only, show processing status
          if (isDataOnly) {
            return (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                  {uvStatus === 'completed' ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : uvStatus === 'failed' ? (
                    <XCircle className="w-8 h-8 text-red-600" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  )}
                </div>
                <p className="text-lg font-medium">{typeConfig?.customTitle || 'Data Verification'}</p>
                <p className="text-muted-foreground">{typeConfig?.customDescription || 'Verifying your information...'}</p>
                <Badge variant="outline">Status: {uvStatus}</Badge>
              </div>
            );
          }
          
          // For doc/bio paths, show QR code and status
          return (
            <div className="text-center py-8 space-y-6">
              <div>
                <p className="text-lg font-medium">{typeConfig?.customTitle || 'Identity Verification'}</p>
                <p className="text-muted-foreground text-sm">{typeConfig?.customDescription || 'Scan the QR code to continue on your mobile device'}</p>
              </div>
              
              {/* QR Code section */}
              {(typeConfig?.qrCodeEnabled !== false) && (
                <div>
                  <p className="font-medium mb-2">{typeConfig?.qrCodeTitle || 'Scan QR Code'}</p>
                  <QRCodeDisplay imageUrl={uvQrImageUrl} value={uvQrValue} size={200} />
                  {typeConfig?.qrCodeInstructions && (
                    <p className="text-sm text-muted-foreground mt-2">{typeConfig.qrCodeInstructions}</p>
                  )}
                  {uvShortUrl && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Or visit: <a href={uvShortUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{uvShortUrl}</a>
                    </p>
                  )}
                </div>
              )}
              
              {/* Direct redirect option */}
              {uvVerifyUrl && typeConfig?.qrCodeEnabled === false && (
                <div className="space-y-4">
                  <Smartphone className="w-12 h-12 mx-auto text-primary" />
                  <p className="font-medium">Continue on this device</p>
                  <Button
                    onClick={() => window.location.href = uvVerifyUrl}
                    style={{ backgroundColor: buttonColor }}
                  >
                    Start Verification
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
              
              {/* Status display */}
              <div className="space-y-2">
                <Badge 
                  variant="outline" 
                  className={`
                    ${uvStatus === 'completed' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}
                    ${uvStatus === 'failed' || uvStatus === 'expired' ? 'bg-red-500/20 text-red-600 border-red-500/30' : ''}
                    ${uvStatus === 'pending' || uvStatus === 'in_progress' ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : ''}
                  `}
                >
                  Status: {uvStatus}
                </Badge>
                {verificationSessionId && (
                  <p className="text-xs text-muted-foreground">
                    Session: {verificationSessionId.substring(0, 8)}...
                  </p>
                )}
                {(uvStatus === 'pending' || uvStatus === 'in_progress') && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for verification...
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        // No session yet - show selection UI (or auto-trigger for admin_preselect)
        return (
          <UnifiedVerificationRenderer
            config={unifiedConfig}
            formStyle={style}
            buttonColor={buttonColor}
            isFirstStep={isFirstStep}
            isLoading={isLoading}
            onSelectType={handleUnifiedVerificationSelect}
            onBack={goToPrevStep}
          />
        );

      default:
        // Form step - apply custom styling
        return (
          <StyledFormFields
            fields={currentStep.fields}
            formData={formData}
            onInputChange={handleInputChange}
            style={style}
            fieldErrors={fieldErrors}
          />
        );
    }
  };

  // Don't show nav buttons for certain step types
  const showNavButtons = !['api', 'decision', 'unified_verification'].includes(currentStep?.stepType || '') || !isLoading;

  // Handle result page button clicks
  const handleResultButtonClick = (isSuccess: boolean) => {
    const url = isSuccess ? (approvedUrl || successPageConfig?.buttonUrl) : (rejectedUrl || failurePageConfig?.buttonUrl);
    if (url) {
      window.location.href = url;
    }
  };

  // If flow is complete, show result page
  if (flowComplete) {
    const isSuccess = flowComplete === 'success';
    
    // Check if we have custom result pages from a decision choice
    let customSuccessPage: ResultPageConfig | undefined;
    let customFailurePage: ResultPageConfig | undefined;
    
    if (selectedDecisionChoice?.useCustomResultPages) {
      if (selectedDecisionChoice.customSuccessPage?.title) {
        customSuccessPage = selectedDecisionChoice.customSuccessPage;
      }
      if (selectedDecisionChoice.customFailurePage?.title) {
        customFailurePage = selectedDecisionChoice.customFailurePage;
      }
    }
    
    const config: ResultPageConfig = isSuccess 
      ? { ...DEFAULT_SUCCESS_CONFIG, ...successPageConfig, ...customSuccessPage, referenceId: referenceId || undefined }
      : { ...DEFAULT_FAILURE_CONFIG, ...failurePageConfig, ...customFailurePage, referenceId: referenceId || undefined };
    
    return (
      <ResultPage
        config={config}
        formStyle={style}
        buttonColor={buttonColor}
        onButtonClick={() => handleResultButtonClick(isSuccess)}
      />
    );
  }

  // Determine which fill buttons to show based on config - show button if toggle is enabled
  const showPassButton = showTestButtons && storedTestData?.showFillPassButton === true;
  const showFailButton = showTestButtons && storedTestData?.showFillFailButton === true;
  const showAnyFillButton = (showPassButton || showFailButton) && (currentStep?.stepType === 'form' || !currentStep?.stepType);

  return (
    <>
      {/* Address Validation Dialog */}
      <AddressValidationDialog
        open={showAddressDialog}
        onOpenChange={(open) => {
          setShowAddressDialog(open);
          if (!open) setAddressValidation(null);
        }}
        onProceed={handleAddressValidationProceed}
        originalAddress={addressValidation?.originalAddress || ""}
        suggestedAddress={addressValidation?.suggestedAddress || ""}
        confidence={addressValidation?.confidence || 0}
        aqi={addressValidation?.aqi || ""}
        isApiError={addressValidation?.isApiError || false}
      />
      
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

      {/* Step title with Fill buttons aligned right */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground" style={{ fontFamily: style.fontFamily }}>
          {currentStep?.title}
        </h2>
        
        {/* Fill Pass / Fill Fail buttons - pill style aligned right */}
        {showAnyFillButton && (
          <div className="flex gap-2 justify-end">
            {showPassButton && (
              <button 
                onClick={() => fillTestData('pass')}
                className="px-4 py-1.5 text-sm font-medium rounded-full border-2 transition-colors"
                style={{
                  color: '#0d9488',
                  borderColor: '#0d9488',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(13, 148, 136, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Fill Pass
              </button>
            )}
            {showFailButton && (
              <button 
                onClick={() => fillTestData('fail')}
                className="px-4 py-1.5 text-sm font-medium rounded-full border-2 transition-colors"
                style={{
                  color: '#f87171',
                  borderColor: '#f87171',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Fill Fail
              </button>
            )}
          </div>
        )}
        
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
            <button 
              onClick={goToNextStep} 
              className="flex-1 h-10 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors hover:opacity-90"
              style={{ 
                backgroundColor: buttonColor || '#6366f1',
                color: getContrastTextColor(buttonColor || '#6366f1')
              }}
            >
              {buttonConfig.next.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          
          {buttonConfig.submit.enabled && currentStep?.stepType !== 'page' && (
            <button 
              onClick={goToNextStep}
              className="flex-1 h-10 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors hover:opacity-90"
              style={{ 
                backgroundColor: buttonColor || '#6366f1',
                color: getContrastTextColor(buttonColor || '#6366f1')
              }}
            >
              {buttonConfig.submit.label}
            </button>
          )}
        </div>
      )}
      </div>
    </>
  );
}
