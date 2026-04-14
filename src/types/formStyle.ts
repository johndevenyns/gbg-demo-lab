// Form Style Configuration Types

export type FormStyleSource = 'default' | 'mirrored' | 'template' | 'custom' | 'captured';

// Label display patterns detected from captured forms
export type LabelStyle = 'floating' | 'above' | 'inline' | 'placeholder-only' | 'hidden';

// Captured form display patterns - extracted from the original form
export interface CapturedFormPatterns {
  // Label behavior
  labelStyle: LabelStyle;
  labelPosition?: 'top' | 'left' | 'inside'; // Where label sits relative to input
  labelsVisible: boolean; // Are labels shown at all?
  
  // Placeholder behavior
  usesPlaceholders: boolean;
  placeholderAsLabel: boolean; // Placeholder text acts as label
  
  // Field layout
  fieldLayout: 'stacked' | 'inline' | 'grid';
  fieldsPerRow?: number;
  
  // Text content patterns
  hasHelperText: boolean;
  hasRequiredIndicator: boolean;
  requiredIndicatorStyle?: 'asterisk' | 'text' | 'color';
  
  // Visual patterns
  inputStyle: 'bordered' | 'underlined' | 'filled' | 'outline';
  focusStyle: 'border-color' | 'shadow' | 'underline' | 'label-shrink';
  
  // Typography extracted from form
  detectedFontFamily?: string;
  detectedFontSize?: string;
  detectedLabelFontSize?: string;
  detectedLabelFontWeight?: string;
  detectedLabelColor?: string;
  detectedInputFontSize?: string;
  detectedInputPadding?: string;
  detectedHelperTextSize?: string;
  detectedHelperTextColor?: string;
  
  // Colors extracted
  detectedInputBgColor?: string;
  detectedInputBorderColor?: string;
  detectedInputFocusBorderColor?: string;
  detectedButtonBgColor?: string;
  detectedButtonTextColor?: string;
  detectedButtonHoverBgColor?: string;
  detectedButtonBorderRadius?: string;
  detectedButtonPadding?: string;
  detectedButtonFontWeight?: string;
  detectedErrorColor?: string;
  
  // Spacing
  detectedFieldSpacing?: string;
  detectedLabelSpacing?: string; // Gap between label and input
  
  // Border styles
  detectedBorderRadius?: string;
  detectedBorderWidth?: string;
}

export interface FormStyleConfig {
  source: FormStyleSource;
  templateId?: string; // Used when source = 'template'
  formStyleUrl?: string; // URL to a specific form page on customer's site
  formContainerSelector?: string; // CSS selector to target specific form container on the page
  
  // Captured form HTML/CSS/JS (source = 'captured')
  // These store the raw extracted form for faithful reproduction
  capturedFormHtml?: string; // The actual form HTML extracted from the customer site
  capturedFormCss?: string; // All CSS that applies to the form
  capturedFormJs?: string; // JavaScript for form interactions (floating labels, validation)
  capturedFormId?: string; // The form ID that was captured
  capturedSourceUrl?: string; // The URL where the form was captured from
  
  // Captured form display patterns - used when building custom forms
  // These patterns tell the form builder HOW to display fields
  capturedPatterns?: CapturedFormPatterns;
  
  // Typography
  fontFamily: string;
  fontSize: 'sm' | 'base' | 'lg';
  
  // Borders
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  borderWidth: '0' | '1' | '2';
  
  // Input styling
  inputBgColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  inputFocusBorderColor: string;
  inputPlaceholderColor?: string;
  
  // Label styling
  labelColor: string;
  labelWeight?: 'normal' | 'medium' | 'semibold';
  labelStyle?: LabelStyle; // How labels are displayed (floating, above, inline, etc.)
  
  // Status colors
  errorColor: string;
  successColor: string;
  
  // Additional styling
  inputPadding?: 'sm' | 'md' | 'lg';
  fieldSpacing?: 'compact' | 'normal' | 'relaxed';
  
  // Background colors
  formBgColor?: string;        // Background color of the form container itself
  contentAreaBgColor?: string; // Background color of the area surrounding the form
  
  // Content area layout (area between header and footer)
  contentAreaMinHeight?: number;   // Minimum height in px (default 400)
  contentAreaPaddingY?: number;    // Vertical padding in px (default 40)
  contentAreaJustify?: 'start' | 'center' | 'end'; // Vertical justification of form (default 'start')
  contentAreaMaxWidth?: number;    // Max width of form container in px (0 = full width, default 0)
  
  // Form container styling
  formBorderWidth?: '0' | '1' | '2' | '3';
  formBorderColor?: string;
  formBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  formShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Title text styling (form heading)
  titleFontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  titleFontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  titleColor?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  
  // Body text styling (descriptions, helper text)
  bodyFontSize?: 'xs' | 'sm' | 'base';
  bodyColor?: string;
  
  // Forward Button styling (Next, Submit, Continue)
  buttonBgColor?: string;          // Button background color (overrides demo.buttonColor if set)
  buttonTextColor?: string;        // Button text color
  buttonHoverBgColor?: string;     // Button hover background color
  buttonHoverTextColor?: string;   // Button hover text color
  buttonPadding?: 'sm' | 'md' | 'lg';  // Button padding size
  buttonBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';  // Button corner radius
  buttonFontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  buttonShadow?: 'none' | 'sm' | 'md' | 'lg';  // Button shadow
  
  // Reverse Button styling (Back, Previous, Cancel)
  reverseButtonBgColor?: string;
  reverseButtonTextColor?: string;
  reverseButtonHoverBgColor?: string;
  reverseButtonHoverTextColor?: string;
  reverseButtonBorderColor?: string;
  reverseButtonBorderWidth?: '0' | '1' | '2';
  reverseButtonPadding?: 'sm' | 'md' | 'lg';
  reverseButtonBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  reverseButtonFontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  reverseButtonShadow?: 'none' | 'sm' | 'md' | 'lg';
}

// Default form style
export const DEFAULT_FORM_STYLE: FormStyleConfig = {
  source: 'default',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 'base',
  borderRadius: 'md',
  borderWidth: '1',
  inputBgColor: '#ffffff',
  inputTextColor: '#1a1a2e',
  inputBorderColor: '#e2e8f0',
  inputFocusBorderColor: '#6366f1',
  inputPlaceholderColor: '#9ca3af',
  labelColor: '#374151',
  labelWeight: 'medium',
  labelStyle: 'above', // Default: labels appear above inputs
  errorColor: '#ef4444',
  successColor: '#22c55e',
  inputPadding: 'md',
  fieldSpacing: 'normal',
  formBgColor: '#ffffff',
  contentAreaBgColor: '#f5f5f5',
  formBorderWidth: '1',
  formBorderColor: '#e5e7eb',
  formBorderRadius: 'lg',
  formShadow: 'lg',
  titleFontSize: 'xl',
  titleFontWeight: 'semibold',
  titleColor: '#1f2937',
  titleAlignment: 'center',
  bodyFontSize: 'sm',
  bodyColor: '#6b7280',
  // Forward button defaults
  buttonPadding: 'md',
  buttonBorderRadius: 'md',
  buttonFontWeight: 'semibold',
  buttonShadow: 'none',
  // Reverse button defaults (outline style)
  reverseButtonBgColor: 'transparent',
  reverseButtonTextColor: '#6b7280',
  reverseButtonBorderColor: '#e5e7eb',
  reverseButtonBorderWidth: '1',
  reverseButtonPadding: 'md',
  reverseButtonBorderRadius: 'md',
  reverseButtonFontWeight: 'medium',
  reverseButtonShadow: 'none',
};

// Predefined form style templates
export interface FormStyleTemplate {
  id: string;
  name: string;
  description: string;
  preview: {
    primaryColor: string;
    bgColor: string;
  };
  style: Omit<FormStyleConfig, 'source' | 'templateId'>;
}

export const FORM_STYLE_TEMPLATES: FormStyleTemplate[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean lines, subtle borders, Inter font',
    preview: { primaryColor: '#6366f1', bgColor: '#ffffff' },
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 'base',
      borderRadius: 'lg',
      borderWidth: '1',
      inputBgColor: '#ffffff',
      inputTextColor: '#1f2937',
      inputBorderColor: '#e5e7eb',
      inputFocusBorderColor: '#6366f1',
      inputPlaceholderColor: '#9ca3af',
      labelColor: '#374151',
      labelWeight: 'medium',
      errorColor: '#ef4444',
      successColor: '#10b981',
      inputPadding: 'md',
      fieldSpacing: 'normal',
    },
  },
  {
    id: 'corporate-classic',
    name: 'Corporate Classic',
    description: 'Professional look with sharp corners',
    preview: { primaryColor: '#1e40af', bgColor: '#f8fafc' },
    style: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 'base',
      borderRadius: 'sm',
      borderWidth: '1',
      inputBgColor: '#f8fafc',
      inputTextColor: '#1e293b',
      inputBorderColor: '#cbd5e1',
      inputFocusBorderColor: '#1e40af',
      inputPlaceholderColor: '#94a3b8',
      labelColor: '#1e293b',
      labelWeight: 'semibold',
      errorColor: '#dc2626',
      successColor: '#16a34a',
      inputPadding: 'md',
      fieldSpacing: 'normal',
    },
  },
  {
    id: 'soft-rounded',
    name: 'Soft & Rounded',
    description: 'Friendly feel with pill-shaped inputs',
    preview: { primaryColor: '#8b5cf6', bgColor: '#faf5ff' },
    style: {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: 'base',
      borderRadius: 'full',
      borderWidth: '2',
      inputBgColor: '#faf5ff',
      inputTextColor: '#4c1d95',
      inputBorderColor: '#ddd6fe',
      inputFocusBorderColor: '#8b5cf6',
      inputPlaceholderColor: '#a78bfa',
      labelColor: '#5b21b6',
      labelWeight: 'medium',
      errorColor: '#e11d48',
      successColor: '#059669',
      inputPadding: 'lg',
      fieldSpacing: 'relaxed',
    },
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Sleek dark theme for modern brands',
    preview: { primaryColor: '#22d3ee', bgColor: '#0f172a' },
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 'base',
      borderRadius: 'md',
      borderWidth: '1',
      inputBgColor: '#1e293b',
      inputTextColor: '#f1f5f9',
      inputBorderColor: '#334155',
      inputFocusBorderColor: '#22d3ee',
      inputPlaceholderColor: '#64748b',
      labelColor: '#e2e8f0',
      labelWeight: 'medium',
      errorColor: '#f87171',
      successColor: '#34d399',
      inputPadding: 'md',
      fieldSpacing: 'normal',
    },
  },
  {
    id: 'banking-trust',
    name: 'Banking Trust',
    description: 'Secure, trustworthy appearance',
    preview: { primaryColor: '#0ea5e9', bgColor: '#f0f9ff' },
    style: {
      fontFamily: 'Georgia, serif',
      fontSize: 'lg',
      borderRadius: 'sm',
      borderWidth: '2',
      inputBgColor: '#ffffff',
      inputTextColor: '#0c4a6e',
      inputBorderColor: '#7dd3fc',
      inputFocusBorderColor: '#0ea5e9',
      inputPlaceholderColor: '#7dd3fc',
      labelColor: '#0c4a6e',
      labelWeight: 'semibold',
      errorColor: '#b91c1c',
      successColor: '#15803d',
      inputPadding: 'lg',
      fieldSpacing: 'relaxed',
    },
  },
  {
    id: 'gaming-bold',
    name: 'Gaming Bold',
    description: 'Vibrant and energetic style',
    preview: { primaryColor: '#f59e0b', bgColor: '#18181b' },
    style: {
      fontFamily: 'Rajdhani, system-ui, sans-serif',
      fontSize: 'lg',
      borderRadius: 'none',
      borderWidth: '2',
      inputBgColor: '#27272a',
      inputTextColor: '#fafafa',
      inputBorderColor: '#f59e0b',
      inputFocusBorderColor: '#fbbf24',
      inputPlaceholderColor: '#71717a',
      labelColor: '#f59e0b',
      labelWeight: 'semibold',
      errorColor: '#ef4444',
      successColor: '#22c55e',
      inputPadding: 'md',
      fieldSpacing: 'compact',
    },
  },
];

// Helper to convert scraped branding to form style
export function scrapedBrandingToFormStyle(branding: {
  colors?: Record<string, string>;
  fonts?: Array<{ family: string }>;
  buttonColor?: string;
}): Partial<FormStyleConfig> {
  const style: Partial<FormStyleConfig> = {
    source: 'mirrored',
  };

  // Extract font family
  if (branding.fonts && branding.fonts.length > 0) {
    style.fontFamily = branding.fonts.map(f => f.family).join(', ') + ', sans-serif';
  }

  // Extract colors
  if (branding.colors) {
    if (branding.colors.primary) {
      style.inputFocusBorderColor = branding.colors.primary;
    }
    if (branding.colors.textPrimary) {
      style.inputTextColor = branding.colors.textPrimary;
      style.labelColor = branding.colors.textPrimary;
    }
    if (branding.colors.background) {
      style.inputBgColor = branding.colors.background;
    }
  }

  if (branding.buttonColor) {
    style.inputFocusBorderColor = branding.buttonColor;
  }

  return style;
}
