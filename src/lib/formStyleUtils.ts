import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import type { FormElementStyles } from '@/lib/api/scraping';

type ParsedColor = { r: number; g: number; b: number; a: number };

const NAMED_COLOR_MAP: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  gray: '#808080',
  grey: '#808080',
  transparent: 'transparent',
};

const clampChannel = (value: number) => Math.max(0, Math.min(255, value));

const parseRgbChannel = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    return clampChannel(Math.round((parseFloat(trimmed) / 100) * 255));
  }
  return clampChannel(parseFloat(trimmed));
};

const hslToRgb = (h: number, s: number, l: number): ParsedColor => {
  const hue = ((h % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(1, s / 100));
  const lightness = Math.max(0, Math.min(1, l / 100));

  if (saturation === 0) {
    const channel = Math.round(lightness * 255);
    return { r: channel, g: channel, b: channel, a: 1 };
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const toChannel = (t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  return {
    r: Math.round(toChannel(hue / 360 + 1 / 3) * 255),
    g: Math.round(toChannel(hue / 360) * 255),
    b: Math.round(toChannel(hue / 360 - 1 / 3) * 255),
    a: 1,
  };
};

export function parseCssColor(color?: string | null): ParsedColor | null {
  if (!color) return null;

  const normalized = color.trim().toLowerCase();
  if (!normalized || ['inherit', 'initial', 'unset', 'currentcolor'].includes(normalized)) {
    return null;
  }

  if (normalized in NAMED_COLOR_MAP) {
    if (normalized === 'transparent') {
      return { r: 255, g: 255, b: 255, a: 0 };
    }
    return parseCssColor(NAMED_COLOR_MAP[normalized]);
  }

  if (normalized.startsWith('#')) {
    let hex = normalized.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((char) => `${char}${char}`).join('');
    }
    if (hex.length === 6) {
      hex += 'ff';
    }
    if (hex.length !== 8) return null;

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16) / 255;

    if ([r, g, b, a].some((value) => Number.isNaN(value))) return null;
    return { r, g, b, a };
  }

  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const alpha = parts[3] ? parseFloat(parts[3]) : 1;

    return {
      r: parseRgbChannel(parts[0]),
      g: parseRgbChannel(parts[1]),
      b: parseRgbChannel(parts[2]),
      a: Number.isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha)),
    };
  }

  const hslMatch = normalized.match(/^hsla?\((.+)\)$/);
  if (hslMatch) {
    const parts = hslMatch[1].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const alpha = parts[3] ? parseFloat(parts[3]) : 1;
    const rgb = hslToRgb(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
    return {
      ...rgb,
      a: Number.isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha)),
    };
  }

  return null;
}

const getColorLuminance = (color?: string | null): number | null => {
  const parsed = parseCssColor(color);
  if (!parsed) return null;
  return (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;
};

export function getReadableTextColor(textColor?: string | null, bgColor?: string | null): string {
  const fallbackDark = '#1a1a2e';
  const fallbackLight = '#f1f5f9';
  const backgroundLuminance = getColorLuminance(bgColor);

  if (backgroundLuminance == null) {
    return textColor?.trim() || fallbackDark;
  }

  const fallback = backgroundLuminance > 0.5 ? fallbackDark : fallbackLight;
  const textLuminance = getColorLuminance(textColor);

  if (textLuminance == null) {
    return fallback;
  }

  return Math.abs(textLuminance - backgroundLuminance) < 0.3 ? fallback : textColor!.trim();
}
 
 /**
  * Shared utility functions for form styling.
  * Used across all preview contexts: FormStyleCard, ScreenshotCaptureTab, HtmlCaptureTab, DemoFlowRenderer
  */

 /**
  * Convert scraped FormElementStyles to FormStyleConfig.
  * Shared across HtmlCaptureTab, ScreenshotCaptureTab, and DemoCreationWizard.
  */
 export function formElementStylesToConfig(styles: FormElementStyles): FormStyleConfig {
   const config: FormStyleConfig = {
     ...DEFAULT_FORM_STYLE,
     source: 'mirrored',
   };

   config.inputBgColor = styles.inputBgColor || config.inputBgColor;
   config.inputTextColor = getReadableTextColor(styles.inputTextColor || config.inputTextColor, config.inputBgColor);
   if (styles.inputBorderColor) config.inputBorderColor = styles.inputBorderColor;
   if (styles.inputFocusBorderColor) config.inputFocusBorderColor = styles.inputFocusBorderColor;
   if (styles.inputPlaceholderColor) config.inputPlaceholderColor = styles.inputPlaceholderColor;
   if (styles.labelColor) config.labelColor = styles.labelColor;
   
   if (styles.labelFontWeight) {
     const weight = parseInt(styles.labelFontWeight);
     if (weight >= 600) config.labelWeight = 'semibold';
     else if (weight >= 500) config.labelWeight = 'medium';
     else config.labelWeight = 'normal';
   }

   if (styles.inputFontFamily || styles.labelFontFamily) {
     config.fontFamily = styles.inputFontFamily || styles.labelFontFamily || DEFAULT_FORM_STYLE.fontFamily;
   }

   if (styles.inputFontSize) {
     const size = parseInt(styles.inputFontSize);
     if (size <= 14) config.fontSize = 'sm';
     else if (size >= 18) config.fontSize = 'lg';
     else config.fontSize = 'base';
   }

   if (styles.inputBorderRadius) {
     const radius = styles.inputBorderRadius.toLowerCase();
     if (radius === '0' || radius === '0px') config.borderRadius = 'none';
     else if (radius.includes('999')) config.borderRadius = 'full';
     else {
       const px = parseInt(radius);
       if (px <= 4) config.borderRadius = 'sm';
       else if (px >= 12) config.borderRadius = 'lg';
       else config.borderRadius = 'md';
     }
   }

   if (styles.inputBorderWidth) {
     const width = parseInt(styles.inputBorderWidth);
     if (width === 0) config.borderWidth = '0';
     else if (width >= 2) config.borderWidth = '2';
     else config.borderWidth = '1';
   }

   if (styles.errorColor) config.errorColor = styles.errorColor;

   return config;
 }
 
 // ============ Style Value Mappers ============
 
 export function getBorderRadius(radius: string = 'md'): string {
   switch (radius) {
     case 'none': return '0px';
     case 'sm': return '4px';
     case 'lg': return '12px';
     case 'full': return '9999px';
     default: return '8px';
   }
 }
 
 export function getPadding(padding: string = 'md'): string {
   switch (padding) {
     case 'sm': return '8px 12px';
     case 'lg': return '14px 18px';
     default: return '10px 14px';
   }
 }
 
 export function getFontSize(size: string = 'base'): string {
   switch (size) {
     case 'sm': return '14px';
     case 'lg': return '18px';
     default: return '16px';
   }
 }
 
 export function getLabelWeight(weight: string = 'medium'): number {
   switch (weight) {
     case 'semibold': return 600;
     case 'medium': return 500;
     default: return 400;
   }
 }
 
 export function getFieldSpacing(spacing: string = 'normal'): string {
   switch (spacing) {
     case 'compact': return '12px';
     case 'relaxed': return '24px';
     default: return '16px';
   }
 }
 
// Form container border radius mapper
export function getFormBorderRadius(radius: string = 'lg'): string {
  switch (radius) {
    case 'none': return '0px';
    case 'sm': return '6px';
    case 'md': return '8px';
    case 'lg': return '12px';
    case 'xl': return '16px';
    case '2xl': return '24px';
    default: return '12px';
  }
}

// Form container shadow mapper
export function getFormShadow(shadow: string = 'lg'): string {
  switch (shadow) {
    case 'none': return 'none';
    case 'sm': return '0 1px 2px rgba(0,0,0,0.05)';
    case 'md': return '0 4px 6px -1px rgba(0,0,0,0.1)';
    case 'lg': return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
    case 'xl': return '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
    default: return '0 10px 15px -3px rgba(0,0,0,0.1)';
  }
}

// Title font size mapper
export function getTitleFontSize(size: string = 'xl'): string {
  switch (size) {
    case 'sm': return '16px';
    case 'base': return '18px';
    case 'lg': return '20px';
    case 'xl': return '24px';
    case '2xl': return '30px';
    default: return '24px';
  }
}

// Title font weight mapper
export function getTitleFontWeight(weight: string = 'semibold'): number {
  switch (weight) {
    case 'normal': return 400;
    case 'medium': return 500;
    case 'semibold': return 600;
    case 'bold': return 700;
    default: return 600;
  }
}

// Body font size mapper
export function getBodyFontSize(size: string = 'sm'): string {
  switch (size) {
    case 'xs': return '12px';
    case 'sm': return '14px';
    case 'base': return '16px';
    default: return '14px';
  }
}

// ============ Button Style Mappers ============

export function getButtonPadding(padding: string = 'md'): string {
  switch (padding) {
    case 'sm': return '10px 16px';
    case 'lg': return '16px 28px';
    default: return '12px 24px';
  }
}

export function getButtonBorderRadius(radius: string = 'md'): string {
  switch (radius) {
    case 'none': return '0px';
    case 'sm': return '4px';
    case 'md': return '6px';
    case 'lg': return '10px';
    case 'full': return '9999px';
    default: return '6px';
  }
}

export function getButtonFontWeight(weight: string = 'semibold'): number {
  switch (weight) {
    case 'normal': return 400;
    case 'medium': return 500;
    case 'semibold': return 600;
    case 'bold': return 700;
    default: return 600;
  }
}

export function getButtonShadow(shadow: string = 'none'): string {
  switch (shadow) {
    case 'sm': return '0 1px 2px rgba(0,0,0,0.1)';
    case 'md': return '0 4px 6px -1px rgba(0,0,0,0.1)';
    case 'lg': return '0 10px 15px -3px rgba(0,0,0,0.15)';
    default: return 'none';
  }
}

 // ============ Style Object Generators ============
 
 export interface FormInputStyles {
   container: string;
   title: string;
   label: string;
   input: string;
   button: string;
   errorText: string;
 }
 
 /**
  * Generates inline CSS style strings for form elements.
  * Used for iframe srcDoc HTML generation.
  */
 export function getFormInlineStyles(formStyle: FormStyleConfig, buttonColor: string): FormInputStyles {
   const borderRadius = getBorderRadius(formStyle.borderRadius);
   const padding = getPadding(formStyle.inputPadding);
   const fontSize = getFontSize(formStyle.fontSize);
   const labelWeight = getLabelWeight(formStyle.labelWeight);
  const readableInputTextColor = getReadableTextColor(formStyle.inputTextColor, formStyle.inputBgColor);
  
  // Form container styling
  const formBgColor = formStyle.formBgColor || '#ffffff';
  const formBorderRadius = getFormBorderRadius(formStyle.formBorderRadius);
  const formShadow = getFormShadow(formStyle.formShadow);
  const formBorderWidth = formStyle.formBorderWidth || '1';
  const formBorderColor = formStyle.formBorderColor || '#e5e7eb';
  
  // Title styling
  const titleFontSize = getTitleFontSize(formStyle.titleFontSize);
  const titleFontWeight = getTitleFontWeight(formStyle.titleFontWeight);
  const titleColor = formStyle.titleColor || formStyle.labelColor;
  const titleAlignment = formStyle.titleAlignment || 'center';
 
   return {
    container: `max-width: 480px; margin: 0 auto; background: ${formBgColor}; border-radius: ${formBorderRadius}; box-shadow: ${formShadow}; padding: 32px; border: ${formBorderWidth}px solid ${formBorderColor};`,
    title: `margin: 0 0 24px 0; font-size: ${titleFontSize}; font-weight: ${titleFontWeight}; color: ${titleColor}; font-family: ${formStyle.fontFamily}; text-align: ${titleAlignment};`,
     label: `display: block; margin-bottom: 6px; font-weight: ${labelWeight}; color: ${formStyle.labelColor}; font-family: ${formStyle.fontFamily}; font-size: ${fontSize};`,
      input: `width: 100%; padding: ${padding}; border: ${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}; border-radius: ${borderRadius}; background: ${formStyle.inputBgColor}; color: ${readableInputTextColor}; font-family: ${formStyle.fontFamily}; font-size: ${fontSize}; box-sizing: border-box; outline: none;`,
     button: `width: 100%; padding: 12px 24px; background: ${buttonColor}; color: white; border: none; border-radius: ${borderRadius}; font-size: ${fontSize}; font-weight: 600; cursor: pointer; font-family: ${formStyle.fontFamily};`,
     errorText: `color: ${formStyle.errorColor}; margin-left: 4px;`,
   };
 }
 
 /**
  * Generates the complete form HTML for use in iframe srcDoc.
  * This is the SINGLE SOURCE OF TRUTH for all preview contexts.
  * 
  * NOTE: This generates a mock form for preview purposes matching the
  * FormStyleCard live preview (First Name, Last Name, Email + focus state).
  */
 export function generateFormHtml(formStyle: FormStyleConfig, buttonColor: string): string {
   const styles = getFormInlineStyles(formStyle, buttonColor);
   
   return `
     <div style="${styles.container}">
       <h2 style="${styles.title}">Application Form</h2>
       <div style="margin-bottom: 16px;">
         <label style="${styles.label}">First Name<span style="${styles.errorText}">*</span></label>
         <input type="text" placeholder="John" style="${styles.input}" />
       </div>
       <div style="margin-bottom: 16px;">
         <label style="${styles.label}">Last Name<span style="${styles.errorText}">*</span></label>
         <input type="text" placeholder="Doe" style="${styles.input}" />
       </div>
       <div style="margin-bottom: 16px;">
         <label style="${styles.label}">Email<span style="${styles.errorText}">*</span></label>
         <input type="email" placeholder="john@example.com" style="${styles.input}" />
       </div>
       <button style="${styles.button}">Continue</button>
     </div>
   `.trim();
 }
 
 /**
  * Generates a complete HTML document for iframe preview.
  * Includes optional header/footer content and CSS.
  */
 export interface PreviewDocumentOptions {
   formStyle: FormStyleConfig;
   buttonColor: string;
   headerHtml?: string;
   footerHtml?: string;
   cssContent?: string;
   contentBgColor?: string;
 }
 
 export function generatePreviewDocument(options: PreviewDocumentOptions): string {
  const { formStyle, buttonColor, headerHtml, footerHtml, cssContent, contentBgColor } = options;
   const formHtml = generateFormHtml(formStyle, buttonColor);
  const bgColor = contentBgColor || formStyle.contentAreaBgColor || '#f5f5f5';
  const paddingY = formStyle.contentAreaPaddingY ?? 40;
  const minHeight = formStyle.contentAreaMinHeight ?? 400;
  const justify = formStyle.contentAreaJustify || 'start';
  const justifyMap = { start: 'flex-start', center: 'center', end: 'flex-end' };

   return `
     <!DOCTYPE html>
     <html>
       <head>
         <meta charset="utf-8">
         <style>
           body { margin: 0; padding: 0; font-family: ${formStyle.fontFamily}; }
           * { box-sizing: border-box; }
         </style>
         ${cssContent ? `<style>${cssContent}</style>` : ''}
       </head>
       <body>
         ${headerHtml || ''}
        <div style="padding: ${paddingY}px 20px; background: ${bgColor}; min-height: ${minHeight}px; display: flex; flex-direction: column; justify-content: ${justifyMap[justify]};">
           ${formHtml}
         </div>
         ${footerHtml || ''}
       </body>
     </html>
   `.trim();
       </body>
     </html>
   `.trim();
 }