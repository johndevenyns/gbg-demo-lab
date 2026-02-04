import { supabase } from '@/integrations/supabase/client';

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
  screenshot: string | null;
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
  formStyles?: FormElementStyles; // NEW: Form styles extracted from initial scrape
  sourceUrl: string;
}

export interface ScrapedFormStyles {
  styles: FormElementStyles;
  rawCss: string;
  branding: ScrapedBranding['branding'];
  sourceUrl: string;
  selectorUsed: string;
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

  async scrapeFormStyles(url: string, selector?: string): Promise<ScrapeFormStylesResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-form-styles', {
      body: { url, selector },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    return data;
  },
};
