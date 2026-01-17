import { supabase } from '@/integrations/supabase/client';

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
  sourceUrl: string;
}

export interface ScrapeResponse {
  success: boolean;
  error?: string;
  data?: ScrapedBranding;
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
};
