// Form Style Configuration Types

export type FormStyleSource = 'default' | 'mirrored' | 'template' | 'custom';

export interface FormStyleConfig {
  source: FormStyleSource;
  templateId?: string; // Used when source = 'template'
  formStyleUrl?: string; // URL to a specific form page on customer's site
  
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
  
  // Status colors
  errorColor: string;
  successColor: string;
  
  // Additional styling
  inputPadding?: 'sm' | 'md' | 'lg';
  fieldSpacing?: 'compact' | 'normal' | 'relaxed';
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
  errorColor: '#ef4444',
  successColor: '#22c55e',
  inputPadding: 'md',
  fieldSpacing: 'normal',
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
