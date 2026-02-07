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
  async scrapeSiteBranding(url: string): Promise<ScrapeResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-site-branding', {
      body: { url },
    });

    if (error) {
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
    }
  ): Promise<ScrapeFormStylesResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-form-styles', {
      body: { 
        url, 
        selector,
        triggerSelector: options?.triggerSelector,
        waitTime: options?.waitTime,
      },
    });

    if (error) {
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
    }
  ): Promise<CaptureFormResponse> {
    const { data, error } = await supabase.functions.invoke('capture-form-html', {
      body: { 
        url, 
        formId,
        triggerSelector: options?.triggerSelector,
        waitTime: options?.waitTime,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    return data;
  },
};

export interface AnalyzeScreenshotResponse {
  success: boolean;
  error?: string;
  data?: {
    styles: {
      inputBgColor?: string;
      inputTextColor?: string;
      inputBorderColor?: string;
      inputBorderWidth?: string;
      inputBorderRadius?: string;
      inputFocusBorderColor?: string;
      labelColor?: string;
      labelFontWeight?: string;
      fontFamily?: string;
      fontSize?: string;
      errorColor?: string;
      buttonBgColor?: string;
      buttonTextColor?: string;
    };
  };
}

export const formAnalysisApi = {
  async analyzeFormScreenshot(imageBase64: string, mimeType: string): Promise<AnalyzeScreenshotResponse> {
    const { data, error } = await supabase.functions.invoke('analyze-form-screenshot', {
      body: { imageBase64, mimeType },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    return data;
  },
};
