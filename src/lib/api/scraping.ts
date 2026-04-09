import { supabase } from '@/integrations/supabase/client';
import type { CapturedFormPatterns, LabelStyle } from '@/types/formStyle';

export type { CapturedFormPatterns, LabelStyle };

export interface FormElementStyles {
  // Input styles
  inputBgColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  inputBorderWidth: string;
  inputBorderRadius: string;
  inputPadding: string;
  inputFontSize: string;
  inputFontFamily: string;
  inputPlaceholderColor: string;
  
  // Focus state
  inputFocusBorderColor: string;
  inputFocusBoxShadow: string;
  
  // Label styles
  labelColor: string;
  labelFontSize: string;
  labelFontWeight: string;
  labelFontFamily: string;
  
  // Button styles
  buttonBgColor: string;
  buttonTextColor: string;
  buttonBorderRadius: string;
  buttonFontWeight: string;
  
  // Container styles
  containerBgColor: string;
  containerPadding: string;
  
  // Error styles
  errorColor: string;
  
  // Raw CSS that can be injected
  rawFormCss?: string;
}

export interface ScrapedBranding {
  headerHtml: string;
  footerHtml: string;
  cssContent: string;
  logoUrl: string | null;
  logoFoundAt?: string | null;
  fetchedUrls?: string[];
  screenshot: string | null;
  screenshots?: {
    desktop: string | null;
    tablet: string | null;
    mobile: string | null;
  };
  colors: {
    headerBgColor: string;
    headerTextColor: string;
    buttonColor: string;
  };
  branding: {
    colorScheme?: string;
    logo?: string;
    colors?: Record<string, string>;
    fonts?: Array<{ family: string }>;
    typography?: Record<string, unknown>;
    spacing?: Record<string, unknown>;
    components?: Record<string, unknown>;
    images?: Record<string, string>;
  } | null;
  formStyles?: FormElementStyles;
  sourceUrl: string;
}

export interface ScrapedFormStyles {
  styles: FormElementStyles;
  rawCss: string;
  branding: ScrapedBranding['branding'];
  sourceUrl: string;
  selectorUsed: string;
}

// Captured form data for faithful reproduction
export interface CapturedFormData {
  formHtml: string;
  formCss: string;
  formJs: string;
  formId: string;
  sourceUrl: string;
  styles: FormElementStyles;
  branding: ScrapedBranding['branding'];
  patterns: CapturedFormPatterns;
  formScreenshot?: string; // Base64 screenshot of the page
  availableFormIds?: string[]; // Available form IDs found on the page
}

export interface ScrapeResponse {
  success: boolean;
  error?: string;
  data?: ScrapedBranding;
}

export interface ScrapeFormStylesResponse {
  success: boolean;
  error?: string;
  data?: ScrapedFormStyles;
}

export interface CaptureFormResponse {
  success: boolean;
  error?: string;
  data?: CapturedFormData;
  availableFormIds?: string[]; // Returned even on error to help users
}

export const scrapingApi = {
  async scrapeSiteBranding(url: string, signal?: AbortSignal): Promise<ScrapeResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-site-branding', {
      body: { url },
      ...(signal ? { signal } : {}),
    });

    if (error) {
      if (signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: error.message };
    }
    
    return data;
  },

  async scrapeFormStyles(
    url: string, 
    selector?: string,
    options?: {
      triggerSelector?: string;
      waitTime?: number;
      signal?: AbortSignal;
    }
  ): Promise<ScrapeFormStylesResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-form-styles', {
      body: { 
        url, 
        selector,
        triggerSelector: options?.triggerSelector,
        waitTime: options?.waitTime,
      },
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    if (error) {
      if (options?.signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: error.message };
    }
    
    return data;
  },

  // NEW: Capture exact form HTML and CSS by form ID for faithful reproduction
  async captureFormById(
    url: string,
    formId: string,
    options?: {
      triggerSelector?: string;
      waitTime?: number;
      signal?: AbortSignal;
    }
  ): Promise<CaptureFormResponse> {
    const { data, error } = await supabase.functions.invoke('capture-form-html', {
      body: { 
        url, 
        formId,
        triggerSelector: options?.triggerSelector,
        waitTime: options?.waitTime,
      },
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    if (error) {
      if (options?.signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: error.message };
    }
    
    return data;
  },
};

// Detailed form styles extracted by AI vision
export interface ExtractedDetailedFormStyles {
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  
  // Input styling
  inputBgColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  inputBorderWidth: string;
  inputBorderRadius: string;
  inputPadding: string;
  inputHeight: string;
  inputFocusBorderColor: string;
  inputFocusBoxShadow: string;
  inputPlaceholderColor: string;
  
  // Label styling
  labelColor: string;
  labelFontSize: string;
  labelFontWeight: string;
  labelFontFamily: string;
  labelPosition: 'above' | 'floating' | 'inline' | 'placeholder-only' | 'hidden';
  labelMarginBottom: string;
  labelTextTransform: string;
  
  // Error styling
  errorColor: string;
  
  // Button styling
  buttonBgColor: string;
  buttonTextColor: string;
  buttonBorderRadius: string;
  buttonPadding: string;
  buttonFontWeight: string;
  buttonFontSize: string;
  buttonTextTransform: string;
  buttonBorderWidth: string;
  buttonBorderColor: string;
  buttonShadow: string;
  
  // Spacing
  fieldSpacing: string;
  formPadding: string;
  
  // Container
  containerBgColor: string;
  containerBorderRadius: string;
  containerShadow: string;
}

// Extracted form content (placeholders, labels, etc.)
export interface ExtractedFormContent {
  placeholders: Array<{
    fieldType: string;
    placeholderText: string;
  }>;
  labels: Array<{
    fieldType: string;
    labelText: string;
  }>;
  buttonTexts: string[];
  helperTextExamples: string[];
  formTitle: string | null;
  detectedFieldTypes: string[];
  layoutPattern: 'single-column' | 'two-column' | 'multi-column' | 'inline';
  fieldsPerRow: number;
}

export interface AnalyzeScreenshotResponse {
  success: boolean;
  error?: string;
  data?: {
    styles: ExtractedDetailedFormStyles;
    content: ExtractedFormContent;
  };
}

export const formAnalysisApi = {
  async analyzeFormScreenshot(imageBase64: string, mimeType: string, signal?: AbortSignal): Promise<AnalyzeScreenshotResponse> {
    const { data, error } = await supabase.functions.invoke('analyze-form-screenshot', {
      body: { imageBase64, mimeType },
      ...(signal ? { signal } : {}),
    });

    if (error) {
      if (signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: error.message };
    }
    
    return data;
  },

  async compareFormScreenshots(
    originalScreenshot: string,
    renderedScreenshot: string,
    currentCss?: string,
    mimeType?: string
  ): Promise<CompareFormResponse> {
    const { data, error } = await supabase.functions.invoke('compare-form-styles', {
      body: { originalScreenshot, renderedScreenshot, currentCss, mimeType },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  },
};

export interface RefineHeaderResponse {
  success: boolean;
  error?: string;
  data?: {
    refinedHeaderHtml: string;
    refinedFooterHtml?: string;
    additionalCss: string;
    matchScore: number;
    changes: Array<{
      element: string;
      change: string;
      severity: 'critical' | 'major' | 'minor';
    }>;
    extractedColors?: {
      headerBgColor?: string;
      headerTextColor?: string;
      buttonColor?: string;
      logoUrl?: string;
    };
  };
}

export const headerRefinementApi = {
  async refineCapture(
    originalScreenshot: string,
    capturedHeaderHtml: string,
    capturedFooterHtml: string,
    capturedCss: string,
    sourceUrl: string,
    signal?: AbortSignal
  ): Promise<RefineHeaderResponse> {
    const { data, error } = await supabase.functions.invoke('refine-header-capture', {
      body: { originalScreenshot, capturedHeaderHtml, capturedFooterHtml, capturedCss, sourceUrl },
      ...(signal ? { signal } : {}),
    });

    if (error) {
      if (signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: error.message };
    }

    return data;
  },
};

export interface CompareFormResponse {
  success: boolean;
  error?: string;
  data?: {
    matchScore: number;
    differences: Array<{
      element: string;
      issue: string;
      severity: 'critical' | 'major' | 'minor';
    }>;
    cssFixes: string;
    fontFix?: {
      fontFamily?: string;
      googleFontsUrl?: string;
    };
    colorFixes?: Record<string, string>;
    typographyFixes?: Record<string, string>;
    spacingFixes?: Record<string, string>;
  };
}
  success: boolean;
  error?: string;
  data?: {
    matchScore: number;
    differences: Array<{
      element: string;
      issue: string;
      severity: 'critical' | 'major' | 'minor';
    }>;
    cssFixes: string;
    fontFix?: {
      fontFamily?: string;
      googleFontsUrl?: string;
    };
    colorFixes?: Record<string, string>;
    typographyFixes?: Record<string, string>;
    spacingFixes?: Record<string, string>;
  };
}
