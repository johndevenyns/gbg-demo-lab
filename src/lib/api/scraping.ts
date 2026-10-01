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
  /**
   * Natural rendered height of the footer (in CSS pixels) measured on the
   * live site. Used as a starting value for the footer-height badge so
   * captured footers don't get clipped by the default fixed height.
   */
  footerHeight?: number;
  /**
   * Natural rendered height of the header (in CSS pixels) measured on the
   * live site BEFORE any scroll-driven shrink behavior. Used as the
   * starting floor for the header preview so mega-menus and stacked
   * top-bars are visible without manual badge tweaking.
   */
  headerHeight?: number;
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
  extractedFields?: ExtractedField[];
}

export interface ExtractedField {
  canonicalType: string;
  rawType: string;
  label: string;
  name: string;
  id: string | null;
  placeholder: string | null;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  confidence: number;
}

export interface DiscoveredForm {
  pageUrl: string;
  formId: string | null;
  selector: string | null;
  fieldCount: number;
  inputTypes: string[];
  hasSubmitButton: boolean;
  detectedKind: 'application' | 'contact' | 'signup' | 'login' | 'newsletter' | 'search' | 'unknown';
  score: number;
  reason: string;
}

export interface DiscoverFormsResponse {
  success: boolean;
  error?: string;
  searchedUrls?: string[];
  data?: {
    best: DiscoveredForm;
    candidates: DiscoveredForm[];
    scannedUrls: string[];
  };
}

export interface RefineFormResponse {
  success: boolean;
  error?: string;
  data?: {
    matchScore: number;
    additionalCss: string;
    changes: Array<{ element: string; change: string; severity: string }>;
    detectedColors?: Record<string, string>;
  };
}

export interface ScrapeResponse {
  success: boolean;
  error?: string;
  data?: ScrapedBranding;
  partialData?: ScrapedBranding;
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

/**
 * Turn a backend function failure into a plain-language reason.
 * The default message ("Edge Function returned a non-2xx status code") hides
 * the real cause, so read the HTTP status and response body when available.
 */
export async function describeFunctionError(error: unknown): Promise<string> {
  const err = error as { message?: string; context?: Response };
  let status: number | undefined;
  let body = '';
  try {
    if (err?.context && typeof err.context.text === 'function') {
      status = err.context.status;
      body = await err.context.clone().text();
    }
  } catch { /* ignore */ }
  let bodyMsg = '';
  try {
    const parsed = JSON.parse(body);
    bodyMsg = parsed?.error || parsed?.message || parsed?.msg || '';
  } catch { bodyMsg = body.slice(0, 200); }
  const text = `${bodyMsg} ${err?.message || ''}`.toLowerCase();
  if (status === 546 || /memory limit|worker_limit|resource limit/.test(text)) {
    return 'The site is too large for the capture service (ran out of memory). Try the Screenshot method or a simpler page URL.';
  }
  if (status === 504 || status === 408 || /timeout|timed out/.test(text)) {
    return 'The site took too long to respond (timed out). It may be slow or blocking automated visits.';
  }
  if (status === 401 || status === 403) {
    return bodyMsg ? `Access denied: ${bodyMsg}` : 'Access denied — your session may have expired. Sign in again and retry.';
  }
  if (status === 402 || /credits|payment required|rate limit|429/.test(text)) {
    return 'The capture service is out of credits or rate-limited. Wait a moment and retry.';
  }
  if (bodyMsg) return `${bodyMsg}${status ? ` (HTTP ${status})` : ''}`;
  if (status) return `Capture service error (HTTP ${status})`;
  if (/failed to fetch|network/.test(text)) return 'Could not reach the capture service (network error).';
  return err?.message || 'Unknown error';
}

export type CaptureMode = 'auto' | 'full' | 'light';

export interface SiteLogoResponse {
  success: boolean;
  error?: string;
  data?: { logoUrl: string | null; logoSource: string | null; themeColor: string | null };
}

const isHeavyFailure = (msg?: string) =>
  !!msg && /too large|ran out of memory|timed out|took too long/i.test(msg);

export const scrapingApi = {
  /**
   * Capture header/footer/branding. `auto` tries a full capture and falls
   * back to the light capture if the site is too large or too slow.
   * The returned `modeUsed` says which capture produced the result.
   */
  async scrapeSiteBranding(
    url: string,
    signal?: AbortSignal,
    mode: CaptureMode = 'auto',
  ): Promise<ScrapeResponse & { modeUsed?: 'full' | 'light'; fullError?: string }> {
    const run = async (m: 'full' | 'light'): Promise<ScrapeResponse> => {
      const { data, error } = await supabase.functions.invoke('scrape-site-branding', {
        body: { url, mode: m },
        ...(signal ? { signal } : {}),
      });
      if (error) {
        if (signal?.aborted) return { success: false, error: 'Cancelled' };
        return { success: false, error: await describeFunctionError(error) };
      }
      return data;
    };

    if (mode === 'light') return { ...(await run('light')), modeUsed: 'light' };
    const full = await run('full');
    if (mode === 'full' || full.success || !isHeavyFailure(full.error) || signal?.aborted) {
      return { ...full, modeUsed: 'full' };
    }
    const light = await run('light');
    return { ...light, modeUsed: 'light', fullError: full.error };
  },

  /** Quick logo + theme colour lookup that doesn't render the page. */
  async grabSiteLogo(url: string): Promise<SiteLogoResponse> {
    const { data, error } = await supabase.functions.invoke('grab-site-logo', { body: { url } });
    if (error) return { success: false, error: await describeFunctionError(error) };
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
      return { success: false, error: await describeFunctionError(error) };
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
      return { success: false, error: await describeFunctionError(error) };
    }
    
    return data;
  },

  async discoverForms(
    url: string,
    options?: { formType?: 'application' | 'contact' | 'signup' | 'any'; maxPages?: number; signal?: AbortSignal }
  ): Promise<DiscoverFormsResponse> {
    const { data, error } = await supabase.functions.invoke('discover-forms', {
      body: { url, formType: options?.formType ?? 'any', maxPages: options?.maxPages ?? 6 },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    if (error) {
      if (options?.signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: await describeFunctionError(error) };
    }
    return data;
  },

  async refineFormCapture(
    originalScreenshot: string,
    capturedFormHtml: string,
    capturedFormCss: string,
    options?: { renderedScreenshot?: string; mimeType?: string; signal?: AbortSignal }
  ): Promise<RefineFormResponse> {
    const { data, error } = await supabase.functions.invoke('refine-form-capture', {
      body: {
        originalScreenshot,
        renderedScreenshot: options?.renderedScreenshot,
        capturedFormHtml,
        capturedFormCss,
        mimeType: options?.mimeType ?? 'image/png',
      },
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    if (error) {
      if (options?.signal?.aborted) return { success: false, error: 'Cancelled' };
      return { success: false, error: await describeFunctionError(error) };
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
      return { success: false, error: await describeFunctionError(error) };
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
      return { success: false, error: await describeFunctionError(error) };
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
      return { success: false, error: await describeFunctionError(error) };
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
