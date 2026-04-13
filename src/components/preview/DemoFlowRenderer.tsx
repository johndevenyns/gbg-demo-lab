import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FormStep, PageElement, StepApiResponse, MdlProvider, VerificationType, StoredTestData, FormField, VerificationFlowConfig as VerificationFlowConfigType, DecisionChoice } from '@/types/demo';
import { logPortalActivity } from '@/lib/auditLog';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { getButtonPadding, getButtonBorderRadius, getButtonFontWeight, getButtonShadow, getReadableTextColor } from '@/lib/formStyleUtils';
import { UnifiedVerificationConfig, MdlProvider as MdlProviderVerification, transformMdlProviderRow } from '@/types/verification';
import { useMdlProviders } from '@/hooks/useVerificationAdmin';
import { useResolvedResourceIds } from '@/hooks/useAdminResourceIds';
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

const ensureReadableColor = (textColor: string, bgColor: string): string => getReadableTextColor(textColor, bgColor);
const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

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
  /** Pre-populated form data (e.g. user name from portal session) */
  initialFormData?: Record<string, string>;
  // Branding props for verification session
  logoUrl?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  // Resource IDs for different verification types
  resourceId?: string;
  resourceIdDocBio?: string;
  resourceIdDataBio?: string;
  resourceIdDataOnly?: string;
  // Demo ID for login authentication
  demoId?: string;
  onNavigateToLogin?: () => void;
  onNavigateToPortal?: (loginUserData?: { email: string; profileData?: Record<string, unknown>; isNewAccount?: boolean }) => void;
  onSubmissionLog?: (data: SubmissionLogData) => void;
  onComplete?: (success: boolean, referenceId?: string) => void;
  onLoginSuccess?: (userData: { email: string; profileData?: Record<string, unknown> }) => void;
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
  onNavigateToLogin?: () => void;
  columns?: 1 | 2;
}

function StyledFormFields({ fields, formData, onInputChange, style, fieldErrors = {}, onNavigateToLogin, columns = 1 }: StyledFormFieldsProps) {
  // Pre-compute readable colors to avoid white-on-white or dark-on-dark issues
  const formBg = style.formBgColor || '#ffffff';
  // Normalize inputBgColor: CSS keywords like "initial"/"inherit"/"transparent" can't be parsed
  // for contrast calculation, so fall back to the form background color
  const rawInputBg = style.inputBgColor;
  const inputBg = (!rawInputBg || rawInputBg === 'initial' || rawInputBg === 'inherit' || rawInputBg === 'transparent') ? formBg : rawInputBg;
  const readableInputText = ensureReadableColor(style.inputTextColor, inputBg);
  const readableLabelColor = ensureReadableColor(style.labelColor, formBg);
  const readableTitleColor = ensureReadableColor(style.titleColor || style.labelColor, formBg);
  const readableBodyColor = ensureReadableColor(style.bodyColor || style.labelColor, formBg);

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
    color: readableInputText,
    border: `${style.borderWidth}px solid ${fieldErrors[fieldName] ? style.errorColor : style.inputBorderColor}`,
    borderRadius: borderRadiusMap[style.borderRadius],
    padding: paddingMap[style.inputPadding || 'md'],
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  // Get the effective label style (from explicit setting or captured patterns)
  const effectiveLabelStyle = style.labelStyle || style.capturedPatterns?.labelStyle || 'above';

  // Label style varies based on labelStyle setting
  const getLabelStyles = (isFloating: boolean = false): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: fontSizeMap[style.fontSize],
      color: readableLabelColor,
      fontWeight: labelWeightMap[style.labelWeight || 'medium'],
    };

    switch (effectiveLabelStyle) {
      case 'floating':
        return {
          ...baseStyle,
          position: 'absolute',
          left: '12px',
          top: isFloating ? '4px' : '50%',
          transform: isFloating ? 'translateY(0) scale(0.75)' : 'translateY(-50%)',
          transformOrigin: 'left top',
          transition: 'all 0.2s ease',
          pointerEvents: 'none',
          backgroundColor: style.inputBgColor,
          padding: '0 4px',
          fontSize: isFloating ? '12px' : fontSizeMap[style.fontSize],
        };
      case 'inline':
        return {
          ...baseStyle,
          display: 'inline-block',
          marginRight: '12px',
          minWidth: '100px',
          flexShrink: 0,
        };
      case 'placeholder-only':
      case 'hidden':
        return {
          ...baseStyle,
          display: 'none',
        };
      case 'above':
      default:
        return {
          ...baseStyle,
          marginBottom: '6px',
          display: 'block',
        };
    }
  };

  const labelStyleAbove = getLabelStyles(false);

  const errorStyle: React.CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: '12px',
    color: style.errorColor,
    marginTop: '4px',
  };

  // Content field types that don't need input handling
  const contentFieldTypes = ['heading', 'paragraph', 'divider', 'consent_checkbox', 'yes_no', 'checkbox', 'account_login_link'];

  const renderField = (field: FormField) => {
    // Handle content elements (non-input fields)
    if (field.type === 'heading') {
      return (
        <div key={field.id}>
          <h3 style={{ 
            fontFamily: style.fontFamily,
            fontSize: '18px',
            fontWeight: 600,
            color: readableTitleColor,
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
            color: readableBodyColor,
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

    if (field.type === 'account_login_link') {
      return (
        <div key={field.id} style={{ textAlign: 'center', padding: '8px 0' }}>
          <button
            type="button"
            onClick={() => onNavigateToLogin?.()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: fontSizeMap[style.fontSize],
              fontFamily: style.fontFamily,
              color: style.inputFocusBorderColor || '#6366f1',
              padding: 0,
            }}
          >
            {field.content || field.placeholder || 'Already have an account? Sign in'}
          </button>
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
              color: readableLabelColor,
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

    if (field.type === 'yes_no') {
      const value = formData[field.name];
      // Use questionText if set, otherwise fall back to label
      const displayText = field.questionText || field.label;
      return (
        <div key={field.id}>
          {effectiveLabelStyle !== 'placeholder-only' && effectiveLabelStyle !== 'hidden' && (
            <label style={labelStyleAbove}>
              {displayText}
              {field.required && <span style={{ color: style.errorColor, marginLeft: '4px' }}>*</span>}
            </label>
          )}
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            marginTop: '4px',
          }}>
            <label 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontFamily: style.fontFamily,
                fontSize: fontSizeMap[style.fontSize],
                color: readableLabelColor,
              }}
            >
              <input
                type="radio"
                name={field.name}
                value="yes"
                checked={value === 'yes'}
                onChange={() => onInputChange(field.name, 'yes')}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: style.inputFocusBorderColor,
                  cursor: 'pointer',
                }}
              />
              Yes
            </label>
            <label 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontFamily: style.fontFamily,
                fontSize: fontSizeMap[style.fontSize],
                color: readableLabelColor,
              }}
            >
              <input
                type="radio"
                name={field.name}
                value="no"
                checked={value === 'no'}
                onChange={() => onInputChange(field.name, 'no')}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: style.inputFocusBorderColor,
                  cursor: 'pointer',
                }}
              />
              No
            </label>
          </div>
          {fieldErrors[field.name] && (
            <p style={errorStyle}>{fieldErrors[field.name]}</p>
          )}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      const isChecked = formData[field.name] === 'true';
      // Use checkboxText if set, otherwise fall back to label
      const displayText = field.checkboxText || field.label;
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
              color: readableLabelColor,
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
              {displayText}
              {field.required && (
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

    const hasValue = Boolean(formData[field.name]);
    const fieldPlaceholder = effectiveLabelStyle === 'placeholder-only' 
      ? `${field.label}${field.required ? ' *' : ''}`
      : field.placeholder;

    // Floating label needs special wrapper
    if (effectiveLabelStyle === 'floating') {
      return (
        <div key={field.id} style={{ position: 'relative' }}>
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'password' ? 'password' : 'text'}
            placeholder=""
            value={formData[field.name] || ''}
            onChange={(e) => onInputChange(field.name, e.target.value)}
            style={{
              ...getInputStyle(field.name),
              paddingTop: '20px',
              paddingBottom: '8px',
            }}
            onFocus={(e) => {
              const label = e.target.previousElementSibling as HTMLElement;
              if (label) {
                label.style.top = '4px';
                label.style.transform = 'translateY(0) scale(0.75)';
                label.style.fontSize = '12px';
              }
              if (!fieldErrors[field.name]) {
                e.target.style.borderColor = style.inputFocusBorderColor;
                e.target.style.boxShadow = `0 0 0 3px ${style.inputFocusBorderColor}20`;
              }
            }}
            onBlur={(e) => {
              const label = e.target.previousElementSibling as HTMLElement;
              if (label && !formData[field.name]) {
                label.style.top = '50%';
                label.style.transform = 'translateY(-50%)';
                label.style.fontSize = fontSizeMap[style.fontSize];
              }
              if (!fieldErrors[field.name]) {
                e.target.style.borderColor = style.inputBorderColor;
                e.target.style.boxShadow = 'none';
              }
            }}
          />
          <label style={getLabelStyles(hasValue)}>
            {field.label}
            {field.required && <span style={{ color: style.errorColor, marginLeft: '4px' }}>*</span>}
          </label>
          {fieldErrors[field.name] && (
            <p style={errorStyle}>{fieldErrors[field.name]}</p>
          )}
        </div>
      );
    }

    // Inline label layout
    if (effectiveLabelStyle === 'inline') {
      return (
        <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={getLabelStyles()}>
            {field.label}
            {field.required && <span style={{ color: style.errorColor, marginLeft: '4px' }}>*</span>}
          </label>
          <div style={{ flex: 1 }}>
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'password' ? 'password' : 'text'}
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
        </div>
      );
    }

    // Standard above label or placeholder-only
    return (
      <div key={field.id}>
        {effectiveLabelStyle !== 'placeholder-only' && effectiveLabelStyle !== 'hidden' && (
          <label style={labelStyleAbove}>
            {field.label}
            {field.required && <span style={{ color: style.errorColor, marginLeft: '4px' }}>*</span>}
          </label>
        )}
        <input
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'password' ? 'password' : 'text'}
          placeholder={fieldPlaceholder}
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

  // Content fields (headings, dividers, paragraphs) should span full width in 2-col layout
  const contentFieldTypes2 = ['heading', 'paragraph', 'divider', 'account_login_link'];
  const gap = spacingMap[style.fieldSpacing || 'normal'];

  if (columns === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>
        {fields.map((field) => {
          const isFullWidth = contentFieldTypes2.includes(field.type) || field.type === 'consent_checkbox' || field.type === 'yes_no' || field.type === 'textarea';
          return (
            <div key={field.id} style={isFullWidth ? { gridColumn: '1 / -1' } : undefined}>
              {renderField(field)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
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
  initialFormData,
  logoUrl,
  headerBgColor,
  headerTextColor,
  resourceId,
  resourceIdDocBio,
  resourceIdDataBio,
  resourceIdDataOnly,
  demoId,
  onNavigateToLogin,
  onNavigateToPortal,
  onSubmissionLog,
  onComplete,
  onLoginSuccess
}: DemoFlowRendererProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>(initialFormData || {});
  const [apiResponses, setApiResponses] = useState<StepApiResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
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
  const lastLoginUserData = useRef<Record<string, unknown> | undefined>(undefined);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch mDL providers for unified verification step
  const { data: mdlProvidersData } = useMdlProviders(true);
  const mdlProviders: MdlProviderVerification[] = useMemo(() => {
    return mdlProvidersData || [];
  }, [mdlProvidersData]);

  // Resolve resource IDs using 3-tier hierarchy: Customer → Admin → Global
  const resolvedIds = useResolvedResourceIds(
    { resourceId, resourceIdDocBio, resourceIdDataBio, resourceIdDataOnly },
    // TODO: pass adminUserId when demo tracks which admin created it
    undefined,
  );

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
  // Scroll to top whenever the step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIndex]);

  const style = formStyle || DEFAULT_FORM_STYLE;

  // Pre-compute readable colors for the main component as well
  const mainFormBg = style.formBgColor || '#ffffff';
  const rawMainInputBg = style.inputBgColor;
  const mainInputBg = (!rawMainInputBg || rawMainInputBg === 'initial' || rawMainInputBg === 'inherit' || rawMainInputBg === 'transparent') ? mainFormBg : rawMainInputBg;
  const mainReadableLabelColor = ensureReadableColor(style.labelColor, mainFormBg);
  const mainReadableInputText = ensureReadableColor(style.inputTextColor, mainInputBg);

  // Get effective button color (from style config or demo buttonColor prop)
  const effectiveButtonBgColor = style.buttonBgColor || buttonColor || '#6366f1';
  const effectiveButtonTextColor = style.buttonTextColor || getContrastTextColor(effectiveButtonBgColor);
  const effectiveButtonHoverBgColor = style.buttonHoverBgColor || effectiveButtonBgColor;
  
  // Helper to get button styles
  const getButtonStyles = (): React.CSSProperties => ({
    backgroundColor: effectiveButtonBgColor,
    color: effectiveButtonTextColor,
    padding: getButtonPadding(style.buttonPadding),
    borderRadius: getButtonBorderRadius(style.buttonBorderRadius),
    fontWeight: getButtonFontWeight(style.buttonFontWeight),
    boxShadow: getButtonShadow(style.buttonShadow),
    fontFamily: style.fontFamily,
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  // Helper to get reverse (back) button styles - theme-isolated
  const effectiveReverseBgColor = style.reverseButtonBgColor || 'transparent';
  const effectiveReverseTextColor = style.reverseButtonTextColor || '#6b7280';
  const effectiveReverseHoverBgColor = style.reverseButtonHoverBgColor || effectiveReverseBgColor;
  const effectiveReverseBorderColor = style.reverseButtonBorderColor || '#e5e7eb';

  const getReverseButtonStyles = (): React.CSSProperties => ({
    backgroundColor: effectiveReverseBgColor,
    color: effectiveReverseTextColor,
    padding: getButtonPadding(style.reverseButtonPadding || style.buttonPadding),
    borderRadius: getButtonBorderRadius(style.reverseButtonBorderRadius || style.buttonBorderRadius),
    fontWeight: getButtonFontWeight(style.reverseButtonFontWeight || 'medium'),
    boxShadow: getButtonShadow(style.reverseButtonShadow || 'none'),
    fontFamily: style.fontFamily,
    fontSize: '14px',
    border: `${style.reverseButtonBorderWidth || '1'}px solid ${effectiveReverseBorderColor}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });
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

    // Support both canonical and legacy/alternate field names used by older demos
    const aliasGroups: string[][] = [
      ['streetAddress', 'addressStreet', 'street_address'],
      ['city', 'addressCity', 'address_city'],
      ['state', 'addressState', 'address_state'],
      ['zipCode', 'addressZip', 'zip', 'zipcode', 'zip_code', 'address_zip'],
      ['country', 'addressCountry', 'address_country'],
    ];

    const expandedData: Record<string, string> = { ...data };

    aliasGroups.forEach((group) => {
      const sourceKey = group.find((key) => typeof data[key] === 'string' && data[key].trim() !== '');
      if (!sourceKey) return;

      const value = data[sourceKey];
      group.forEach((key) => {
        if (!expandedData[key]) {
          expandedData[key] = value;
        }
      });
    });
    
    setFormData(prev => ({ ...prev, ...expandedData }));
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
    // Build combined address from form data (support both canonical and alternate field names)
    const street = formData.streetAddress || formData.addressStreet || '';
    const city = formData.city || formData.addressCity || '';
    const state = formData.state || formData.addressState || '';
    const zip = formData.zipCode || formData.addressZip || '';
    const country = 'USA';
    
    const combinedAddress = [street, city, state, zip].filter(Boolean).join(', ');
    
    if (!combinedAddress.trim()) {
      return { isValid: true, confidence: 100, aqi: 'A', suggestedAddress: '', isApiError: false };
    }
    
    const requestBody = {
      action: 'verify',
      text: combinedAddress,
      address1: street,
      locality: city,
      administrativeArea: state,
      postalCode: zip,
      country: country,
    };

    // Log request
    onSubmissionLog?.({
      type: 'request',
      endpoint: `${SUPABASE_FUNCTIONS_URL}/address-verification`,
      method: 'POST',
      data: requestBody as Record<string, unknown>,
    });

    const requestStart = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('address-verification', {
        body: requestBody,
      });

      const duration = Date.now() - requestStart;
      console.log('Address validation response:', data, error);

      if (error || !data?.success) {
        // Log error response
        onSubmissionLog?.({
          type: 'response',
          endpoint: `${SUPABASE_FUNCTIONS_URL}/address-verification`,
          method: 'POST',
          status: error ? 500 : 200,
          data: (data || { error: error?.message || 'Unknown error' }) as Record<string, unknown>,
          duration,
        });

        return {
          isValid: true,
          confidence: 0,
          aqi: '',
          suggestedAddress: '',
          isApiError: true,
        };
      }

      // Log success response
      onSubmissionLog?.({
        type: 'response',
        endpoint: `${SUPABASE_FUNCTIONS_URL}/address-verification`,
        method: 'POST',
        status: 200,
        data: data as Record<string, unknown>,
        duration,
      });

      return {
        isValid: !data.isLowConfidence,
        confidence: data.confidence || 0,
        aqi: data.aqi || '',
        suggestedAddress: data.suggestedAddress || '',
        isApiError: false,
      };
    } catch (err) {
      const duration = Date.now() - requestStart;
      console.error('Address validation error:', err);

      // Log error
      onSubmissionLog?.({
        type: 'response',
        endpoint: `${SUPABASE_FUNCTIONS_URL}/address-verification`,
        method: 'POST',
        status: 500,
        data: { error: err instanceof Error ? err.message : 'Network error' },
        duration,
      });

      return {
        isValid: true,
        confidence: 0,
        aqi: '',
        suggestedAddress: '',
        isApiError: true,
      };
    }
  }, [formData, onSubmissionLog]);

  // Execute create_account completion action — upsert portal user with form data + verification status
  const executeCreateAccount = useCallback(async (success: boolean) => {
    if (!demoId) return;
    const email = (formData.email || '').trim().toLowerCase();
    if (!email) return;

    const profileData: Record<string, string> = {};
    const profileFieldMap: Record<string, string> = {
      first_name: 'firstName', last_name: 'lastName', phone: 'phone',
      date_of_birth: 'dateOfBirth', ssn: 'ssn4',
      address_street: 'streetAddress', address_city: 'city',
      address_state: 'state', address_zip: 'zipCode',
    };
    // Collect all form data into profile
    for (const [key, val] of Object.entries(formData)) {
      if (val && key !== 'email' && key !== 'password') {
        const mapped = profileFieldMap[key] || key;
        profileData[mapped] = val;
      }
    }

    const displayName = [formData.firstName || formData.first_name, formData.lastName || formData.last_name].filter(Boolean).join(' ') || null;
    const verificationStatus = success ? 'verified' : 'failed';

    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('portal_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        // Update existing user
        await supabase.from('portal_users').update({
          profile_data: profileData,
          display_name: displayName,
          verification_status: verificationStatus,
        }).eq('id', existing.id);

        // Ensure assignment exists
        await supabase.from('portal_user_demo_assignments').upsert(
          { portal_user_id: existing.id, demo_id: demoId },
          { onConflict: 'portal_user_id,demo_id' }
        );
      } else {
        // Create new user
        const password = formData.password || Math.random().toString(36).slice(-8);
        const { data: newUser } = await supabase.from('portal_users').insert({
          email,
          password,
          display_name: displayName,
          profile_data: profileData,
          verification_status: verificationStatus,
        }).select('id').single();

        if (newUser) {
          await supabase.from('portal_user_demo_assignments').insert({
            portal_user_id: newUser.id,
            demo_id: demoId,
          });
        }
      }
      console.log('Account created/updated with verification status:', verificationStatus);
    } catch (err) {
      console.error('Failed to create/update account:', err);
    }
  }, [formData, demoId]);

  // Complete the flow (success or failure)
  const completeFlow = useCallback(async (success: boolean, refId?: string) => {
    if (refId) setReferenceId(refId);
    onComplete?.(success, refId);

    // Log verification completion
    logPortalActivity({
      action: success ? 'verification_completed' : 'verification_failed',
      demoId,
      demoName: customerName,
      portalUserEmail: formData.email || undefined,
      verificationResult: success ? 'pass' : 'fail',
      details: { referenceId: refId },
    });

    // Process completion actions in order
    const actions = success
      ? currentStep?.stepCompletionConfig?.onSuccess
      : currentStep?.stepCompletionConfig?.onFailure;

    if (actions && actions.length > 0) {
      // Execute create_account if configured
      if (actions.some(a => a.type === 'create_account')) {
        await executeCreateAccount(success);
      }

      // Execute login_portal — navigate to portal and skip result page
      if (actions.some(a => a.type === 'login_portal')) {
        const isNewAccount = actions.some(a => a.type === 'create_account');
        const email = (formData.email || '').trim().toLowerCase();
        const profileData: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(formData)) {
          if (val && key !== 'email' && key !== 'password') {
            profileData[key] = val;
          }
        }
        onNavigateToPortal?.({ email: email || 'verified@demo.portal', profileData, isNewAccount });
        return; // Don't show result page
      }

      // Check for next_step — advance instead of showing result
      if (actions.some(a => a.type === 'next_step') && !actions.some(a => a.type === 'show_result_page')) {
        if (!isLastStep) {
          setCurrentStepIndex(prev => prev + 1);
          return;
        }
      }

      // Check for redirect
      const redirectAction = actions.find(a => a.type === 'redirect' && a.redirectUrl);
      if (redirectAction && !actions.some(a => a.type === 'show_result_page')) {
        window.location.href = redirectAction.redirectUrl!;
        return;
      }
    }

    // Default: show result page
    setFlowComplete(success ? 'success' : 'failure');
  }, [onComplete, currentStep, executeCreateAccount, formData, onNavigateToPortal, isLastStep, demoId, customerName]);

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

  // Authenticate against portal_users table via assignments
  const authenticateLogin = useCallback(async (): Promise<boolean> => {
    if (!demoId) {
      setLoginError('Login is not available for this demo.');
      return false;
    }
    const email = (formData.email || '').trim().toLowerCase();
    const password = formData.password || '';
    
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return false;
    }

    setLoginError(null);
    setIsLoading(true);

    try {
      // Find user by email in portal_users
      const { data: portalUser, error: userError } = await supabase
        .from('portal_users')
        .select('id, email, password, is_active, is_default, profile_data')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (userError) throw userError;

      if (!portalUser) {
        setLoginError('Invalid email or password.');
        setIsLoading(false);
        return false;
      }

      // Check if user has access to this demo (is_default or has assignment)
      if (!portalUser.is_default) {
        const { data: assignment } = await supabase
          .from('portal_user_demo_assignments')
          .select('id')
          .eq('portal_user_id', portalUser.id)
          .eq('demo_id', demoId)
          .maybeSingle();

        if (!assignment) {
          setLoginError('Invalid email or password.');
          setIsLoading(false);
          return false;
        }
      }

      if (portalUser.password !== password) {
        setLoginError('Invalid email or password.');
        setIsLoading(false);
        return false;
      }

      // Notify parent of successful login with user data
      const profileData = (portalUser.profile_data && typeof portalUser.profile_data === 'object' && !Array.isArray(portalUser.profile_data))
        ? portalUser.profile_data as Record<string, unknown>
        : undefined;
      lastLoginUserData.current = profileData;
      onLoginSuccess?.({ email: portalUser.email, profileData });

      // Log portal login activity
      logPortalActivity({
        action: 'login',
        portalUserId: portalUser.id,
        portalUserEmail: portalUser.email,
        demoId,
        demoName: customerName,
      });

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('An error occurred. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, [demoId, formData, onLoginSuccess, customerName]);

  // Validate registration code against portal_users table
  const validateRegistrationCode = useCallback(async (): Promise<boolean> => {
    if (!demoId) {
      setLoginError('Code validation is not available for this demo.');
      return false;
    }
    const code = (formData.registrationCode || '').trim();
    
    if (!code) {
      setLoginError('Please enter your registration code.');
      return false;
    }

    setLoginError(null);
    setIsLoading(true);

    try {
      // Check global registration codes first
      const { data: globalCodeRows } = await supabase
        .from('global_settings')
        .select('value')
        .like('key', 'global_reg_code_%');

      if (globalCodeRows && globalCodeRows.length > 0) {
        const isGlobalCode = globalCodeRows.some(row => {
          try {
            const parsed = JSON.parse(row.value);
            return parsed.isActive !== false && parsed.code === code;
          } catch {
            return row.value === code;
          }
        });
        if (isGlobalCode) {
          setIsLoading(false);
          return true;
        }
      }

      // Also check legacy single master code
      const { data: masterCodes } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'master_registration_code')
        .maybeSingle();

      if ((masterCodes as any)?.value && code === (masterCodes as any).value) {
        setIsLoading(false);
        return true;
      }

      // Find portal user by registration code
      const { data: portalUser, error: queryError } = await supabase
        .from('portal_users')
        .select('id, email, registration_code, registration_code_expires_at, is_active, is_default, profile_data')
        .eq('registration_code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!portalUser) {
        setLoginError('Invalid registration code.');
        setIsLoading(false);
        return false;
      }

      // Check if user has access to this demo
      if (!portalUser.is_default) {
        const { data: assignment } = await supabase
          .from('portal_user_demo_assignments')
          .select('id')
          .eq('portal_user_id', portalUser.id)
          .eq('demo_id', demoId)
          .maybeSingle();

        if (!assignment) {
          setLoginError('Invalid registration code.');
          setIsLoading(false);
          return false;
        }
      }

      // Check expiration
      if (portalUser.registration_code_expires_at) {
        const expiresAt = new Date(portalUser.registration_code_expires_at);
        if (expiresAt < new Date()) {
          setLoginError('This registration code has expired. Please request a new one.');
          setIsLoading(false);
          return false;
        }
      }

      // Populate form data with profile_data from the matched user
      if (portalUser.profile_data && typeof portalUser.profile_data === 'object' && !Array.isArray(portalUser.profile_data)) {
        const profileData = portalUser.profile_data as Record<string, unknown>;
        const prefillData: Record<string, string> = {};
        for (const [key, value] of Object.entries(profileData)) {
          if (typeof value === 'string' && value.trim()) {
            prefillData[key] = value;
          }
        }
        if (portalUser.email && !prefillData.email) {
          prefillData.email = portalUser.email;
        }
        setFormData(prev => ({ ...prev, ...prefillData }));
      } else if (portalUser.email) {
        setFormData(prev => ({ ...prev, email: portalUser.email }));
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Code validation error:', err);
      setLoginError('An error occurred. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, [demoId, formData]);

  // Verify credit card number against portal_users profile_data
  const verifyCreditCard = useCallback(async (): Promise<boolean> => {
    if (!demoId) {
      setLoginError('Card verification is not available for this demo.');
      return false;
    }
    const ccNumber = (formData.credit_card_number || formData.creditCardNumber || '').trim();
    
    if (!ccNumber) {
      setLoginError('Please enter your credit card number.');
      return false;
    }

    setLoginError(null);
    setIsLoading(true);

    try {
      const normalizedInput = ccNumber.replace(/[\s-]/g, '');

      const { data: assignments } = await supabase
        .from('portal_user_demo_assignments')
        .select('portal_user_id')
        .eq('demo_id', demoId);

      const assignedIds = (assignments || []).map(a => a.portal_user_id);

      const { data: users } = await supabase
        .from('portal_users')
        .select('id, email, display_name, profile_data, is_default, is_active')
        .eq('is_active', true);

      const matchingUser = (users || []).find(user => {
        if (!user.is_default && !assignedIds.includes(user.id)) return false;
        const pd = user.profile_data as Record<string, string> | null;
        if (!pd?.creditCardNumber) return false;
        return pd.creditCardNumber.replace(/[\s-]/g, '') === normalizedInput;
      });

      if (!matchingUser) {
        setLoginError('Card number not recognized. Please check and try again.');
        setIsLoading(false);
        return false;
      }

      // Pre-fill form data from matched user's profile
      const pd = matchingUser.profile_data as Record<string, string> | null;
      if (pd) {
        const prefillMap: Record<string, string> = {
          firstName: 'first_name', lastName: 'last_name', phone: 'phone',
          dateOfBirth: 'dateOfBirth', ssn4: 'ssn4',
          streetAddress: 'streetAddress', city: 'city', state: 'state', zipCode: 'zipCode',
        };
        for (const [profileKey, formKey] of Object.entries(prefillMap)) {
          if (pd[profileKey]) {
            setFormData(prev => ({ ...prev, [formKey]: pd[profileKey] }));
          }
        }
        if (matchingUser.email) {
          setFormData(prev => ({ ...prev, email: matchingUser.email }));
        }
      }

      lastLoginUserData.current = (pd as Record<string, unknown>) || {};
      onLoginSuccess?.({ email: matchingUser.email, profileData: (pd as Record<string, unknown>) || {} });

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('CC verification error:', err);
      setLoginError('An error occurred. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, [demoId, formData, onLoginSuccess]);

  const goToNextStep = useCallback(async () => {
    // First validate required fields for form steps
    if (currentStep?.stepType === 'form' && !validateRequiredFields()) {
      return;
    }

    // Handle login submit action
    if (currentStep?.submitAction === 'login') {
      const success = await authenticateLogin();
      if (!success) return;
      // If destination is portal, navigate directly to portal instead of next step
      if (currentStep.loginDestination === 'portal') {
        // Pass the login user data so the portal can use it immediately
        const email = (formData.email || '').trim().toLowerCase();
        const profileData = lastLoginUserData.current;
        onNavigateToPortal?.({ email, profileData });
        return;
      }
      proceedToNextStep();
      return;

    // Handle registration code validation
    } else if (currentStep?.submitAction === 'validate_code') {
      const success = await validateRegistrationCode();
      if (!success) return;
      proceedToNextStep();
      return;

    // Handle credit card verification
    } else if (currentStep?.submitAction === 'verify_cc') {
      const success = await verifyCreditCard();
      if (!success) return;
      proceedToNextStep();
      return;
    }

    // Check if address validation is enabled and step has address fields
    if (currentStep?.addressValidationEnabled && hasAddressFields(currentStep)) {
      setIsLoading(true);
      const validation = await validateAddress();
      setIsLoading(false);

      if (!validation.isValid || validation.isApiError) {
        // Build combined address for display
        const street = formData.streetAddress || formData.addressStreet || '';
        const city = formData.city || formData.addressCity || '';
        const state = formData.state || formData.addressState || '';
        const zip = formData.zipCode || formData.addressZip || '';
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
  }, [currentStep, hasAddressFields, validateAddress, formData, proceedToNextStep, validateRequiredFields, authenticateLogin, validateRegistrationCode, verifyCreditCard, onNavigateToPortal]);

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
  const createVerificationSession = useCallback(async (verificationType: VerificationType, skipAdvance = false, resourceIdOverride?: string) => {
    // Guard against duplicate calls
    if (verificationSessionId) {
      console.log('Session already exists, skipping creation');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    const startTime = Date.now();
    
    // Determine the correct resource ID using 3-tier hierarchy
    const getResourceIdForType = (type: VerificationType): string | undefined => {
      switch (type) {
        case 'docBio':
          return resolvedIds.resourceIdDocBio;
        case 'dataBio':
          return resolvedIds.resourceIdDataBio;
        case 'dataOnly':
          return resolvedIds.resourceIdDataOnly;
        default:
          return resolvedIds.resourceId;
      }
    };
    
    const requestBody = {
      formData,
      verificationType,
      customerName: customerName || 'Verification Demo',
      returnUrl: returnUrl || window.location.href,
      includeQr: includeQr ?? true,
      referenceIdPrefix: referenceIdPrefix,
      resourceId: resourceIdOverride || getResourceIdForType(verificationType),
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
      endpoint: `${SUPABASE_FUNCTIONS_URL}/create-verification-session`,
      method: 'POST',
      data: requestBody,
    });
    
    try {
      console.log('Creating verification session:', { verificationType, customerName, formData, branding: requestBody.branding });

      // Log verification started
      logPortalActivity({
        action: 'verification_started',
        demoId,
        demoName: customerName,
        portalUserEmail: formData.email || undefined,
        verificationType,
      });
      
      const { data, error: invokeError } = await supabase.functions.invoke('create-verification-session', {
        body: requestBody,
      });

      if (invokeError) {
        console.error('Edge function error:', invokeError);
        
        // Log error response
        onSubmissionLog?.({
          type: 'response',
          endpoint: `${SUPABASE_FUNCTIONS_URL}/create-verification-session`,
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
        endpoint: `${SUPABASE_FUNCTIONS_URL}/create-verification-session`,
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
  }, [formData, customerName, returnUrl, includeQr, referenceIdPrefix, resolvedIds, logoUrl, buttonColor, headerTextColor, headerBgColor, currentStep?.id, goToNextStep, onSubmissionLog, verificationSessionId]);

  // Poll for verification status
  const pollVerificationStatus = useCallback(async () => {
    if (!verificationSessionId) return;
    
    // Don't poll if flow is already complete
    if (flowComplete) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollEndpoint = `${SUPABASE_FUNCTIONS_URL}/get-verification-status`;

    try {
      const startTime = Date.now();
      const { data, error: invokeError } = await supabase.functions.invoke('get-verification-status', {
        body: { sessionId: verificationSessionId },
      });
      const duration = Date.now() - startTime;

      if (invokeError) {
        console.error('Status poll error:', invokeError);
        onSubmissionLog?.({
          type: 'response',
          endpoint: pollEndpoint,
          method: 'POST',
          status: 500,
          data: { error: invokeError.message } as Record<string, unknown>,
          duration,
        });
        return;
      }

      console.log('Verification status:', data);
      setPollingStatus(data.status);

      // Log completed/final status responses to submission log
      if (data.isComplete) {
        // Stop polling immediately
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }

        onSubmissionLog?.({
          type: 'response',
          endpoint: pollEndpoint,
          method: 'POST',
          status: 200,
          data: data as Record<string, unknown>,
          duration,
        });

        if (data.isPassed) {
          completeFlow(true, referenceId || undefined);
        } else {
          completeFlow(false, referenceId || undefined);
        }
      }
    } catch (err) {
      console.error('Status poll error:', err);
    }
  }, [verificationSessionId, referenceId, completeFlow, onSubmissionLog, flowComplete]);

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
  const handleUnifiedVerificationSelect = useCallback((verificationType: VerificationType, typeKey: string, providerId?: string) => {
    console.log('Unified verification selected:', verificationType, typeKey, 'provider:', providerId);
    setSelectedVerificationType(verificationType);
    
    // Resolve step-level resource ID override robustly across key formats
    const typeConfigs = currentStep?.unifiedVerificationConfig?.typeConfigs || {};
    const canonicalTypeKey = verificationType === 'docBio'
      ? 'docbio'
      : verificationType === 'dataBio'
        ? 'databio'
        : verificationType === 'dataOnly'
          ? 'dataonly'
          : typeKey;

    const stepResourceId =
      typeConfigs[typeKey]?.resourceId ||
      typeConfigs[typeKey?.toLowerCase?.() || '']?.resourceId ||
      typeConfigs[canonicalTypeKey]?.resourceId;

    // TODO: If mDL with providerId, use the provider-specific flow
    if (typeKey === 'mdl' && providerId) {
      console.log('Starting mDL verification with provider:', providerId);
    }

    // Create verification session with step-level resource ID override if configured
    createVerificationSession(verificationType, true, stepResourceId || undefined);
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
    // Handle login step - show only a "Log In" button (no separate next/submit)
    else if (currentStep?.submitAction === 'login') {
      if (currentStep.buttons) {
        currentStep.buttons.forEach(btn => {
          if (btn.id === 'back') defaultButtons.back = { enabled: btn.enabled && !isFirstStep, label: btn.label };
          if (btn.id === 'submit') defaultButtons.submit = { enabled: btn.enabled, label: btn.label || 'Log In' };
        });
      }
      // Always disable next for login steps and ensure submit shows as "Log In"
      defaultButtons.next = { enabled: false, label: 'Next' };
      if (!defaultButtons.submit.enabled && !currentStep.buttons) {
        defaultButtons.submit = { enabled: true, label: 'Log In' };
      }
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
          } else if (element.buttonAction === 'portal') {
            onNavigateToPortal?.();
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
                {(vfStatus === 'pending' || vfStatus === 'in_progress' || vfStatus === 'processing') && (
                  <div className="flex flex-col items-center justify-center gap-2 py-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm font-medium">Verification Pending</p>
                    <p className="text-xs text-muted-foreground">Please complete the verification on your device</p>
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
                {(currentStatus === 'pending' || currentStatus === 'in_progress' || currentStatus === 'processing') && (
                  <div className="flex flex-col items-center justify-center gap-2 py-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm font-medium">Verification Pending</p>
                    <p className="text-xs text-muted-foreground">Please complete the verification on your device</p>
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
              {typeConfig?.customDescription && (
                <p className="text-muted-foreground text-sm">{typeConfig.customDescription}</p>
              )}
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
            mdlProviders={mdlProviders}
            onSelectType={handleUnifiedVerificationSelect}
            onBack={goToPrevStep}
          />
        );

      default:
        // Form step - apply custom styling
        return (
          <div>
            <StyledFormFields
              fields={currentStep.fields}
              formData={formData}
              onInputChange={handleInputChange}
              style={style}
              fieldErrors={fieldErrors}
              onNavigateToLogin={onNavigateToLogin}
              columns={currentStep.columns}
            />
            {/* Login / code validation error message */}
            {(currentStep.submitAction === 'login' || currentStep.submitAction === 'validate_code' || currentStep.submitAction === 'verify_cc') && loginError && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: `${style.errorColor}10`,
                border: `1px solid ${style.errorColor}30`,
                borderRadius: '8px',
                color: style.errorColor,
                fontSize: '14px',
                fontFamily: style.fontFamily,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                {loginError}
              </div>
            )}
            {/* Forgot Password link for login steps */}
            {currentStep.submitAction === 'login' && (
              <div style={{ marginTop: '8px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setForgotPasswordEmail(formData.email || '');
                    setForgotPasswordSuccess(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: style.inputFocusBorderColor || effectiveButtonBgColor,
                    fontFamily: style.fontFamily,
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}
            {/* Forgot Password inline dialog */}
            {showForgotPassword && currentStep.submitAction === 'login' && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                border: `1px solid ${style.inputBorderColor}`,
                borderRadius: '8px',
                backgroundColor: style.inputBgColor,
                fontFamily: style.fontFamily,
              }}>
                {forgotPasswordSuccess ? (
                  <div style={{ textAlign: 'center' }}>
                    <CheckCircle2 style={{ width: 32, height: 32, color: style.successColor || '#22c55e', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', color: mainReadableLabelColor, fontWeight: 500 }}>
                      Password reset instructions sent
                    </p>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                      Please contact your administrator to reset your password.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      style={{
                        marginTop: '12px',
                        fontSize: '13px',
                        color: style.inputFocusBorderColor || effectiveButtonBgColor,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: '14px', color: mainReadableLabelColor, fontWeight: 500, marginBottom: '8px' }}>
                      Reset Password
                    </p>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                      Enter your email address and we'll help you reset your password.
                    </p>
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Enter your email"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: `${style.borderWidth}px solid ${style.inputBorderColor}`,
                        borderRadius: '6px',
                        fontFamily: style.fontFamily,
                        backgroundColor: style.inputBgColor,
                        color: mainReadableInputText,
                        outline: 'none',
                        marginBottom: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          border: `1px solid ${style.inputBorderColor}`,
                          borderRadius: '6px',
                          background: 'transparent',
                          color: mainReadableLabelColor,
                          cursor: 'pointer',
                          fontFamily: style.fontFamily,
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordSuccess(true)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          border: 'none',
                          borderRadius: '6px',
                          backgroundColor: effectiveButtonBgColor,
                          color: effectiveButtonTextColor,
                          cursor: 'pointer',
                          fontFamily: style.fontFamily,
                        }}
                      >
                        Send Reset Link
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  // Don't show forward nav buttons for certain step types that handle their own navigation
  const stepTypesWithOwnNav = ['api', 'decision', 'unified_verification'];
  const isOwnNavStep = stepTypesWithOwnNav.includes(currentStep?.stepType || '');
  const isAddressValidating = isLoading && currentStep?.addressValidationEnabled;
  const showNavButtons = !isOwnNavStep && (!isLoading || isAddressValidating);
  // Still show back button for own-nav steps when configured
  const showBackOnly = isOwnNavStep && buttonConfig.back.enabled && !isLoading;

  // Handle result page button clicks
  const handleResultButtonClick = (isSuccess: boolean) => {
    const config = isSuccess ? successPageConfig : failurePageConfig;
    
    // Check if this button should navigate to portal
    if (config?.buttonAction === 'portal') {
      onNavigateToPortal?.();
      return;
    }
    
    const url = isSuccess ? (approvedUrl || config?.buttonUrl) : (rejectedUrl || config?.buttonUrl);
    if (url) {
      window.location.href = url;
    }
  };

  // If flow is complete, show result page
  if (flowComplete) {
    const isSuccess = flowComplete === 'success';
    
    // Check for stepCompletionConfig show_result_page action first
    const completionActions = isSuccess
      ? currentStep?.stepCompletionConfig?.onSuccess
      : currentStep?.stepCompletionConfig?.onFailure;
    const showResultAction = completionActions?.find(a => a.type === 'show_result_page');

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

    // Build config: completion action config > decision choice > legacy config
    let config: ResultPageConfig;
    if (showResultAction) {
      config = {
        ...(isSuccess ? { ...DEFAULT_SUCCESS_CONFIG, ...successPageConfig } : { ...DEFAULT_FAILURE_CONFIG, ...failurePageConfig }),
        title: showResultAction.messageTitle || (isSuccess ? DEFAULT_SUCCESS_CONFIG.title : DEFAULT_FAILURE_CONFIG.title),
        subtitle: showResultAction.subtitle,
        message: showResultAction.message || (isSuccess ? DEFAULT_SUCCESS_CONFIG.message : DEFAULT_FAILURE_CONFIG.message),
        showIcon: showResultAction.showIcon ?? true,
        showReferenceId: showResultAction.showReferenceId ?? false,
        buttonText: showResultAction.buttonText,
        buttonAction: showResultAction.buttonAction,
        buttonUrl: showResultAction.buttonUrl,
        referenceId: referenceId || undefined,
      };
    } else {
      config = isSuccess 
        ? { ...DEFAULT_SUCCESS_CONFIG, ...successPageConfig, ...customSuccessPage, referenceId: referenceId || undefined }
        : { ...DEFAULT_FAILURE_CONFIG, ...failurePageConfig, ...customFailurePage, referenceId: referenceId || undefined };
    }
    
    return (
      <ResultPage
        config={config}
        formStyle={style}
        buttonColor={buttonColor}
        onButtonClick={() => handleResultButtonClick(isSuccess)}
      />
    );
  }

  // Determine which fill buttons to show based on per-step config (falls back to global toggle)
  const globalShowPass = storedTestData?.showFillPassButton === true;
  const globalShowFail = storedTestData?.showFillFailButton === true;
  const stepShowPass = currentStep?.showFillPass !== undefined ? currentStep.showFillPass : globalShowPass;
  const stepShowFail = currentStep?.showFillFail !== undefined ? currentStep.showFillFail : globalShowFail;
  const showPassButton = showTestButtons && stepShowPass;
  const showFailButton = showTestButtons && stepShowFail;
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

      {/* Step title with Fill buttons aligned right — hidden for verification steps that render their own title */}
      {(
      <div className="space-y-2">
        <h2 
          className="text-2xl font-semibold" 
          style={{ 
            fontFamily: style.fontFamily,
            textAlign: currentStep?.titleAlignment || 'left',
            color: style.titleColor || '#1a1a2e',
          }}
        >
          {currentStep?.title}
        </h2>
        
        {/* Fill Pass / Fill Fail buttons - subtle gray style */}
        {showAnyFillButton && (
          <div className={`flex gap-1.5 ${
            storedTestData?.buttonPosition === 'left' ? 'justify-start' :
            storedTestData?.buttonPosition === 'center' ? 'justify-center' :
            'justify-end'
          }`}>
            {showPassButton && (
              <button 
                onClick={() => fillTestData('pass')}
                className="px-2.5 py-0.5 text-xs font-normal rounded-full border transition-colors"
                style={{
                  color: '#6b7280',
                  borderColor: '#d1d5db',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✓ Pass
              </button>
            )}
            {showFailButton && (
              <button 
                onClick={() => fillTestData('fail')}
                className="px-2.5 py-0.5 text-xs font-normal rounded-full border transition-colors"
                style={{
                  color: '#6b7280',
                  borderColor: '#d1d5db',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✗ Fail
              </button>
            )}
          </div>
        )}
        
        {currentStep?.description && (
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        )}
      </div>
      )}

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      {showNavButtons && (
        <div className="flex gap-3 pt-4">
          {isAddressValidating ? (
            <button 
              disabled
              className="flex-1 inline-flex items-center justify-center gap-2 transition-all opacity-90 cursor-not-allowed"
              style={getButtonStyles()}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              {currentStep?.addressValidationLabel || 'Validating Address...'}
            </button>
          ) : (
            <>
              {buttonConfig.back.enabled && (
                <button 
                  onClick={goToPrevStep} 
                  className="flex-1 inline-flex items-center justify-center gap-2"
                  style={getReverseButtonStyles()}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = effectiveReverseHoverBgColor; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = effectiveReverseBgColor; }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {buttonConfig.back.label}
                </button>
              )}
              
              {buttonConfig.next.enabled && currentStep?.stepType !== 'page' && (
                <button 
                  onClick={goToNextStep} 
                  className="flex-1 inline-flex items-center justify-center gap-2 transition-all"
                  style={getButtonStyles()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = effectiveButtonHoverBgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = effectiveButtonBgColor;
                  }}
                >
                  {buttonConfig.next.label}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              
              {buttonConfig.submit.enabled && currentStep?.stepType !== 'page' && (
                <button 
                  onClick={goToNextStep}
                  className="flex-1 inline-flex items-center justify-center gap-2 transition-all"
                  style={getButtonStyles()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = effectiveButtonHoverBgColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = effectiveButtonBgColor;
                  }}
                >
                  {buttonConfig.submit.label}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Back button for step types that handle their own forward navigation */}
      {showBackOnly && (
        <div className="flex gap-3 pt-4">
          <button 
            onClick={goToPrevStep} 
            className="flex-1 inline-flex items-center justify-center gap-2"
            style={getReverseButtonStyles()}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = effectiveReverseHoverBgColor; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = effectiveReverseBgColor; }}
          >
            <ArrowLeft className="w-4 h-4" />
            {buttonConfig.back.label}
          </button>
        </div>
      )}
      </div>
    </>
  );
}
