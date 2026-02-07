const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormElementStyles {
  inputBgColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  inputBorderWidth: string;
  inputBorderRadius: string;
  inputPadding: string;
  inputFontSize: string;
  inputFontFamily: string;
  inputPlaceholderColor: string;
  inputFocusBorderColor: string;
  inputFocusBoxShadow: string;
  labelColor: string;
  labelFontSize: string;
  labelFontWeight: string;
  labelFontFamily: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonBorderRadius: string;
  buttonFontWeight: string;
  containerBgColor: string;
  containerPadding: string;
  errorColor: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    
    // Fix common protocol typos
    formattedUrl = formattedUrl
      .replace(/^hhtps?:\/\//i, 'https://')  // hhtps -> https
      .replace(/^htps:\/\//i, 'https://')    // htps -> https
      .replace(/^htttp:\/\//i, 'http://')    // htttp -> http
      .replace(/^hhtp:\/\//i, 'http://');    // hhtp -> http
    
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate URL before proceeding
    let baseUrl: URL;
    try {
      baseUrl = new URL(formattedUrl);
    } catch (urlError) {
      console.error('Invalid URL format:', formattedUrl);
      return new Response(
        JSON.stringify({ success: false, error: `Invalid URL format: "${url}". Please enter a valid URL like "example.com" or "https://example.com"` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Scraping branding from URL:', formattedUrl);

    const firecrawlScrape = async (body: Record<string, unknown>) => {
      const doRequest = async (b: Record<string, unknown>) => {
        return fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(b),
        });
      };

      // Try request as-is first.
      let res = await doRequest(body);
      if (res.ok) return res;

      // If Firecrawl rejects newer keys (e.g. screenshot options), retry without them.
      // This preserves backwards compatibility while still allowing us to attempt enhanced options.
      try {
        const cloned = res.clone();
        const data = await cloned.json();
        const errText = (data?.error as string | undefined) || '';
        const unrecognizedKeys: string[] =
          (Array.isArray(data?.details)
            ? data.details.flatMap((d: any) => Array.isArray(d?.keys) ? d.keys : [])
            : [])
            .filter((k: any) => typeof k === 'string');

        if (res.status === 400 && (errText.includes('Unrecognized key') || unrecognizedKeys.length > 0)) {
          if ('screenshot' in body || unrecognizedKeys.includes('screenshot')) {
            const { screenshot: _s, ...rest } = body as any;
            console.warn('Firecrawl rejected screenshot options; retrying without screenshot key');
            res = await doRequest(rest);
            return res;
          }
        }
      } catch {
        // ignore parse errors
      }

      return res;
    };

    // Define viewport sizes for screenshots
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ];

    // Main request for HTML, branding, and desktop screenshot
    const mainRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['html', 'rawHtml', 'screenshot', 'branding'],
      onlyMainContent: false,
     waitFor: 4000,
      // Attempt full-page screenshots, but fall back automatically if Firecrawl rejects the key.
      screenshot: {
        fullPage: true,
      },
     actions: [
       // Scroll to bottom to ensure lazy-loaded footer content is captured
       { type: 'scroll', direction: 'down', amount: 99999 },
       { type: 'wait', milliseconds: 1500 },
       // Scroll back to top for consistent header capture
       { type: 'scroll', direction: 'up', amount: 99999 },
       { type: 'wait', milliseconds: 500 },
     ]
    });

    // Parallel requests for tablet and mobile screenshots
    const tabletRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['screenshot'],
      onlyMainContent: false,
      waitFor: 2000,
      screenshot: {
        fullPage: true,
      },
      actions: [
       { type: 'viewport', width: viewports[1].width, height: viewports[1].height },
       { type: 'scroll', direction: 'down', amount: 99999 },
       { type: 'wait', milliseconds: 1000 },
       { type: 'scroll', direction: 'up', amount: 99999 },
       { type: 'wait', milliseconds: 300 },
      ]
    });

    const mobileRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['screenshot'],
      onlyMainContent: false,
      waitFor: 2000,
      screenshot: {
        fullPage: true,
      },
      actions: [
       { type: 'viewport', width: viewports[2].width, height: viewports[2].height },
       { type: 'scroll', direction: 'down', amount: 99999 },
       { type: 'wait', milliseconds: 1000 },
       { type: 'scroll', direction: 'up', amount: 99999 },
       { type: 'wait', milliseconds: 300 },
      ]
    });

    console.log('Fetching screenshots for desktop, tablet, and mobile viewports...');

    // Execute all requests in parallel
    const [mainResponse, tabletResponse, mobileResponse] = await Promise.all([
      mainRequest,
      tabletRequest,
      mobileRequest,
    ]);

    const mainData = await mainResponse.json();

    if (!mainResponse.ok) {
      console.error('Firecrawl API error:', mainData);
      return new Response(
        JSON.stringify({ success: false, error: mainData.error || `Request failed with status ${mainResponse.status}` }),
        { status: mainResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse tablet and mobile responses (don't fail if they error)
    let tabletScreenshot: string | null = null;
    let mobileScreenshot: string | null = null;

    try {
      const tabletData = await tabletResponse.json();
      tabletScreenshot = tabletData.data?.screenshot || tabletData.screenshot || null;
      console.log('Tablet screenshot captured:', !!tabletScreenshot);
    } catch (e) {
      console.warn('Failed to get tablet screenshot:', e);
    }

    try {
      const mobileData = await mobileResponse.json();
      mobileScreenshot = mobileData.data?.screenshot || mobileData.screenshot || null;
      console.log('Mobile screenshot captured:', !!mobileScreenshot);
    } catch (e) {
      console.warn('Failed to get mobile screenshot:', e);
    }

    // Extract data from main response
    const html = mainData.data?.html || mainData.html || '';
    const rawHtml = mainData.data?.rawHtml || mainData.rawHtml || html;
    const branding = mainData.data?.branding || mainData.branding || null;
    const desktopScreenshot = mainData.data?.screenshot || mainData.screenshot || null;
    const metadata = mainData.data?.metadata || mainData.metadata || {};

    console.log('Desktop screenshot captured:', !!desktopScreenshot);

    // Parse header and footer from HTML
    const headerHtml = convertRelativeUrls(extractHeader(html), baseUrl);
    const footerHtml = convertRelativeUrls(extractFooter(html), baseUrl);
    
    // Extract and inline all CSS
    console.log('Extracting and inlining CSS...');
    const cssContent = await extractAndInlineCss(rawHtml, baseUrl);
    console.log(`Extracted ${cssContent.length} characters of CSS`);
    
    // Extract form styles from the page
    console.log('Extracting form styles...');
    const formStyles = extractFormElementStyles(rawHtml, cssContent, branding);
    console.log('Form styles extracted:', Object.keys(formStyles).filter(k => formStyles[k as keyof FormElementStyles]).length, 'properties');
    
    // Extract logo from branding or metadata
    let logoUrl = branding?.images?.logo || 
                  branding?.logo || 
                  metadata.ogImage || 
                  null;

    // If no logo found and we're not already at root, try fetching from root domain
    const isRootUrl = baseUrl.pathname === '/' || baseUrl.pathname === '';
    if (!logoUrl && !isRootUrl) {
      console.log('No logo found on page, attempting to fetch from root domain...');
      const rootUrl = `${baseUrl.protocol}//${baseUrl.host}`;
      
      try {
        const rootResponse = await firecrawlScrape({
          url: rootUrl,
          formats: ['branding'],
          onlyMainContent: false,
          waitFor: 2000,
        });
        
        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          const rootBranding = rootData.data?.branding || rootData.branding || null;
          const rootMetadata = rootData.data?.metadata || rootData.metadata || {};
          
          logoUrl = rootBranding?.images?.logo || 
                    rootBranding?.logo || 
                    rootMetadata.ogImage || 
                    null;
          
          if (logoUrl) {
            console.log('Logo found on root domain:', logoUrl);
          } else {
            console.log('No logo found on root domain either');
          }
        }
      } catch (rootError) {
        console.warn('Failed to fetch logo from root domain:', rootError);
      }
    }

    // Extract colors from branding
    const colors = branding?.colors || {};
    const headerBgColor = colors.background || colors.primary || '#1a1a2e';
    const headerTextColor = colors.textPrimary || '#ffffff';
    const buttonColor = colors.primary || colors.accent || '#6366f1';

    console.log('Scrape successful, extracted branding, CSS, and form styles');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          headerHtml,
          footerHtml,
          cssContent,
          logoUrl,
          screenshot: desktopScreenshot,
          screenshots: {
            desktop: desktopScreenshot,
            tablet: tabletScreenshot,
            mobile: mobileScreenshot,
          },
          colors: {
            headerBgColor,
            headerTextColor,
            buttonColor,
          },
          branding,
          formStyles, // NEW: Include extracted form styles
          sourceUrl: formattedUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract form element styles from HTML and CSS
function extractFormElementStyles(html: string, css: string, branding: { colors?: Record<string, string>; fonts?: Array<{ family: string }> } | null): FormElementStyles {
  const styles: Partial<FormElementStyles> = {};
  
  // Parse CSS for common form selectors
  const cssRules = parseCssRules(css);
  
  // Common input selectors to look for
  const inputSelectors = [
    'input[type="text"]',
    'input[type="email"]',
    'input[type="password"]',
    'input',
    '.form-control',
    '.input',
    '[class*="input"]',
    '[class*="field"]',
    '[class*="text-input"]',
  ];
  
  // Find matching input styles
  for (const inputSel of inputSelectors) {
    const inputRules = findMatchingRules(cssRules, inputSel);
    if (inputRules.length > 0) {
      const merged = mergeRules(inputRules);
      if (merged['background-color'] || merged['background']) {
        styles.inputBgColor = merged['background-color'] || extractBgColor(merged['background']);
      }
      if (merged['color']) {
        styles.inputTextColor = merged['color'];
      }
      if (merged['border-color']) {
        styles.inputBorderColor = merged['border-color'];
      }
      if (merged['border']) {
        const borderParts = parseBorderShorthand(merged['border']);
        if (borderParts.color) styles.inputBorderColor = borderParts.color;
        if (borderParts.width) styles.inputBorderWidth = borderParts.width;
      }
      if (merged['border-radius']) {
        styles.inputBorderRadius = merged['border-radius'];
      }
      if (merged['padding']) {
        styles.inputPadding = merged['padding'];
      }
      if (merged['font-size']) {
        styles.inputFontSize = merged['font-size'];
      }
      if (merged['font-family']) {
        styles.inputFontFamily = merged['font-family'];
      }
      break;
    }
  }
  
  // Find focus state styles
  const focusSelectors = inputSelectors.map(s => `${s}:focus`);
  for (const focusSel of focusSelectors) {
    const focusRules = findMatchingRules(cssRules, focusSel);
    if (focusRules.length > 0) {
      const merged = mergeRules(focusRules);
      if (merged['border-color']) {
        styles.inputFocusBorderColor = merged['border-color'];
      }
      if (merged['box-shadow']) {
        styles.inputFocusBoxShadow = merged['box-shadow'];
        if (!styles.inputFocusBorderColor) {
          const shadowColor = extractColorFromBoxShadow(merged['box-shadow']);
          if (shadowColor) styles.inputFocusBorderColor = shadowColor;
        }
      }
      if (merged['outline-color']) {
        styles.inputFocusBorderColor = styles.inputFocusBorderColor || merged['outline-color'];
      }
      break;
    }
  }
  
  // Find label styles
  const labelSelectors = ['label', '.label', '.form-label', '[class*="label"]'];
  for (const labelSel of labelSelectors) {
    const labelRules = findMatchingRules(cssRules, labelSel);
    if (labelRules.length > 0) {
      const merged = mergeRules(labelRules);
      if (merged['color']) {
        styles.labelColor = merged['color'];
      }
      if (merged['font-size']) {
        styles.labelFontSize = merged['font-size'];
      }
      if (merged['font-weight']) {
        styles.labelFontWeight = merged['font-weight'];
      }
      if (merged['font-family']) {
        styles.labelFontFamily = merged['font-family'];
      }
      break;
    }
  }
  
  // Find button styles
  const buttonSelectors = [
    'button[type="submit"]',
    '.btn-primary',
    '.btn',
    'button',
    '[class*="button"]',
    '[class*="submit"]',
    '[class*="cta"]',
  ];
  
  for (const btnSel of buttonSelectors) {
    const btnRules = findMatchingRules(cssRules, btnSel);
    if (btnRules.length > 0) {
      const merged = mergeRules(btnRules);
      if (merged['background-color'] || merged['background']) {
        styles.buttonBgColor = merged['background-color'] || extractBgColor(merged['background']);
      }
      if (merged['color']) {
        styles.buttonTextColor = merged['color'];
      }
      if (merged['border-radius']) {
        styles.buttonBorderRadius = merged['border-radius'];
      }
      if (merged['font-weight']) {
        styles.buttonFontWeight = merged['font-weight'];
      }
      break;
    }
  }
  
  // Find container/form styles
  const containerSelectors = ['form', '.form', '[class*="form"]', '[class*="card"]'];
  for (const containerSel of containerSelectors) {
    const containerRules = findMatchingRules(cssRules, containerSel);
    if (containerRules.length > 0) {
      const merged = mergeRules(containerRules);
      if (merged['background-color'] || merged['background']) {
        styles.containerBgColor = merged['background-color'] || extractBgColor(merged['background']);
      }
      if (merged['padding']) {
        styles.containerPadding = merged['padding'];
      }
      break;
    }
  }
  
  // Find error styles
  const errorSelectors = ['.error', '.invalid', '[class*="error"]', '[class*="invalid"]', '.text-danger'];
  for (const errorSel of errorSelectors) {
    const errorRules = findMatchingRules(cssRules, errorSel);
    if (errorRules.length > 0) {
      const merged = mergeRules(errorRules);
      if (merged['color']) {
        styles.errorColor = merged['color'];
      }
      break;
    }
  }
  
  // Extract inline styles from form elements in HTML
  extractInlineStyles(html, styles);
  
  // Merge with branding-based defaults
  return mergeWithBrandingDefaults(styles, branding);
}

// Parse CSS into rules
function parseCssRules(css: string): Array<{ selector: string; properties: Record<string, string> }> {
  const rules: Array<{ selector: string; properties: Record<string, string> }> = [];
  
  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Match CSS rules: selector { properties }
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const selectors = match[1].split(',').map(s => s.trim()).filter(s => s);
    const propsString = match[2];
    
    const properties: Record<string, string> = {};
    const propPairs = propsString.split(';').filter(p => p.trim());
    
    for (const pair of propPairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex > 0) {
        const prop = pair.substring(0, colonIndex).trim().toLowerCase();
        const value = pair.substring(colonIndex + 1).trim();
        if (prop && value) {
          properties[prop] = value;
        }
      }
    }
    
    for (const selector of selectors) {
      if (Object.keys(properties).length > 0) {
        rules.push({ selector, properties });
      }
    }
  }
  
  return rules;
}

// Find rules matching a selector pattern
function findMatchingRules(rules: Array<{ selector: string; properties: Record<string, string> }>, targetSelector: string): Array<Record<string, string>> {
  const matching: Array<Record<string, string>> = [];
  const targetLower = targetSelector.toLowerCase();
  
  for (const rule of rules) {
    const ruleSel = rule.selector.toLowerCase();
    
    if (ruleSel === targetLower || 
        ruleSel.includes(targetLower) ||
        targetLower.includes(ruleSel) ||
        selectorMatches(ruleSel, targetLower)) {
      matching.push(rule.properties);
    }
  }
  
  return matching;
}

// Check if selectors match
function selectorMatches(ruleSelector: string, target: string): boolean {
  const targetParts = target.split(/\s+/);
  const ruleParts = ruleSelector.split(/\s+/);
  
  for (const tp of targetParts) {
    for (const rp of ruleParts) {
      if (tp === rp || rp.includes(tp) || tp.includes(rp)) {
        return true;
      }
    }
  }
  
  return false;
}

// Merge multiple rule objects
function mergeRules(rules: Array<Record<string, string>>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const rule of rules) {
    Object.assign(merged, rule);
  }
  return merged;
}

// Extract background color from background shorthand
function extractBgColor(bg: string): string | undefined {
  if (!bg) return undefined;
  
  const hexMatch = bg.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  
  const rgbMatch = bg.match(/rgba?\([^)]+\)/);
  if (rgbMatch) return rgbMatch[0];
  
  const colorNames = ['white', 'black', 'red', 'blue', 'green', 'gray', 'grey', 'transparent'];
  for (const name of colorNames) {
    if (bg.includes(name)) return name;
  }
  
  return undefined;
}

// Parse border shorthand
function parseBorderShorthand(border: string): { width?: string; style?: string; color?: string } {
  const parts: { width?: string; style?: string; color?: string } = {};
  
  const widthMatch = border.match(/(\d+(?:\.\d+)?(?:px|em|rem))/i);
  if (widthMatch) parts.width = widthMatch[1];
  
  const styles = ['solid', 'dashed', 'dotted', 'double', 'none'];
  for (const style of styles) {
    if (border.includes(style)) {
      parts.style = style;
      break;
    }
  }
  
  const hexMatch = border.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) {
    parts.color = hexMatch[0];
  } else {
    const rgbMatch = border.match(/rgba?\([^)]+\)/);
    if (rgbMatch) parts.color = rgbMatch[0];
  }
  
  return parts;
}

// Extract color from box-shadow
function extractColorFromBoxShadow(shadow: string): string | undefined {
  const rgbMatch = shadow.match(/rgba?\([^)]+\)/);
  if (rgbMatch) return rgbMatch[0];
  
  const hexMatch = shadow.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  
  return undefined;
}

// Extract inline styles from HTML elements
function extractInlineStyles(html: string, styles: Partial<FormElementStyles>): void {
  const inputStyleRegex = /<input[^>]*style=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = inputStyleRegex.exec(html)) !== null) {
    const inlineStyle = match[1];
    parseInlineStyleToFormStyles(inlineStyle, styles, 'input');
  }
  
  const labelStyleRegex = /<label[^>]*style=["']([^"']+)["'][^>]*>/gi;
  while ((match = labelStyleRegex.exec(html)) !== null) {
    const inlineStyle = match[1];
    parseInlineStyleToFormStyles(inlineStyle, styles, 'label');
  }
  
  const buttonStyleRegex = /<button[^>]*style=["']([^"']+)["'][^>]*>/gi;
  while ((match = buttonStyleRegex.exec(html)) !== null) {
    const inlineStyle = match[1];
    parseInlineStyleToFormStyles(inlineStyle, styles, 'button');
  }
}

// Parse inline style string to form styles
function parseInlineStyleToFormStyles(inlineStyle: string, styles: Partial<FormElementStyles>, elementType: 'input' | 'label' | 'button'): void {
  const props: Record<string, string> = {};
  const pairs = inlineStyle.split(';').filter(p => p.trim());
  
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex > 0) {
      const prop = pair.substring(0, colonIndex).trim().toLowerCase();
      const value = pair.substring(colonIndex + 1).trim();
      if (prop && value) {
        props[prop] = value;
      }
    }
  }
  
  if (elementType === 'input') {
    if (props['background-color'] && !styles.inputBgColor) styles.inputBgColor = props['background-color'];
    if (props['color'] && !styles.inputTextColor) styles.inputTextColor = props['color'];
    if (props['border-color'] && !styles.inputBorderColor) styles.inputBorderColor = props['border-color'];
    if (props['border-radius'] && !styles.inputBorderRadius) styles.inputBorderRadius = props['border-radius'];
    if (props['font-family'] && !styles.inputFontFamily) styles.inputFontFamily = props['font-family'];
  } else if (elementType === 'label') {
    if (props['color'] && !styles.labelColor) styles.labelColor = props['color'];
    if (props['font-weight'] && !styles.labelFontWeight) styles.labelFontWeight = props['font-weight'];
    if (props['font-family'] && !styles.labelFontFamily) styles.labelFontFamily = props['font-family'];
  } else if (elementType === 'button') {
    if (props['background-color'] && !styles.buttonBgColor) styles.buttonBgColor = props['background-color'];
    if (props['color'] && !styles.buttonTextColor) styles.buttonTextColor = props['color'];
    if (props['border-radius'] && !styles.buttonBorderRadius) styles.buttonBorderRadius = props['border-radius'];
  }
}

// Merge extracted styles with branding defaults
function mergeWithBrandingDefaults(
  styles: Partial<FormElementStyles>,
  branding: { colors?: Record<string, string>; fonts?: Array<{ family: string }> } | null
): FormElementStyles {
  const defaults: FormElementStyles = {
    inputBgColor: '#ffffff',
    inputTextColor: '#1a1a2e',
    inputBorderColor: '#e2e8f0',
    inputBorderWidth: '1px',
    inputBorderRadius: '6px',
    inputPadding: '12px 16px',
    inputFontSize: '16px',
    inputFontFamily: 'system-ui, -apple-system, sans-serif',
    inputPlaceholderColor: '#9ca3af',
    inputFocusBorderColor: '#6366f1',
    inputFocusBoxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
    labelColor: '#374151',
    labelFontSize: '14px',
    labelFontWeight: '500',
    labelFontFamily: 'system-ui, -apple-system, sans-serif',
    buttonBgColor: '#6366f1',
    buttonTextColor: '#ffffff',
    buttonBorderRadius: '6px',
    buttonFontWeight: '600',
    containerBgColor: '#ffffff',
    containerPadding: '24px',
    errorColor: '#ef4444',
  };
  
  // Apply branding colors as fallbacks
  if (branding?.colors) {
    if (branding.colors.primary && !styles.inputFocusBorderColor) {
      defaults.inputFocusBorderColor = branding.colors.primary;
    }
    if (branding.colors.primary && !styles.buttonBgColor) {
      defaults.buttonBgColor = branding.colors.primary;
    }
    if (branding.colors.textPrimary && !styles.inputTextColor) {
      defaults.inputTextColor = branding.colors.textPrimary;
    }
    if (branding.colors.textPrimary && !styles.labelColor) {
      defaults.labelColor = branding.colors.textPrimary;
    }
  }
  
  // Apply branding fonts as fallbacks
  if (branding?.fonts && branding.fonts.length > 0) {
    const fontFamily = branding.fonts.map(f => f.family).join(', ') + ', sans-serif';
    if (!styles.inputFontFamily) {
      defaults.inputFontFamily = fontFamily;
    }
    if (!styles.labelFontFamily) {
      defaults.labelFontFamily = fontFamily;
    }
  }
  
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(styles).filter(([_, v]) => v !== undefined && v !== null)),
  } as FormElementStyles;
}

// Convert relative URLs to absolute in HTML content
function convertRelativeUrls(html: string, baseUrl: URL): string {
  if (!html) return html;
  
  html = html.replace(/src=["']([^"']+)["']/gi, (match, url) => {
    return `src="${makeAbsoluteUrl(url, baseUrl)}"`;
  });
  
  html = html.replace(/href=["']([^"']+)["']/gi, (match, url) => {
    if (url.startsWith('#') || url.startsWith('javascript:')) {
      return match;
    }
    return `href="${makeAbsoluteUrl(url, baseUrl)}"`;
  });
  
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    return `url("${makeAbsoluteUrl(url, baseUrl)}")`;
  });
  
  return html;
}

// Make a URL absolute
function makeAbsoluteUrl(url: string, baseUrl: URL): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/')) {
    return baseUrl.origin + url;
  }
  
  return baseUrl.origin + '/' + url;
}

// Extract and inline all CSS from the page
async function extractAndInlineCss(html: string, baseUrl: URL): Promise<string> {
  const cssFragments: string[] = [];
  
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(html)) !== null) {
    if (styleMatch[1]) {
      const processedCss = convertCssUrls(styleMatch[1], baseUrl);
      cssFragments.push(`/* Inline style */\n${processedCss}`);
    }
  }
  
  const stylesheetUrls = new Set<string>();
  
  const linkRegex1 = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkRegex2 = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  const linkRegex3 = /<link[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/gi;
  
  for (const regex of [linkRegex1, linkRegex2, linkRegex3]) {
    let linkMatch;
    while ((linkMatch = regex.exec(html)) !== null) {
      if (linkMatch[1]) {
        stylesheetUrls.add(linkMatch[1]);
      }
    }
  }
  
  console.log(`Found ${stylesheetUrls.size} external stylesheets to fetch`);
  
  const fetchPromises = Array.from(stylesheetUrls).map(async (href) => {
    try {
      const absoluteUrl = makeAbsoluteUrl(href, baseUrl);
      console.log(`Fetching stylesheet: ${absoluteUrl}`);
      
      const response = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/css,*/*;q=0.1',
        },
      });
      
      if (response.ok) {
        const cssText = await response.text();
        const processedCss = convertCssUrls(cssText, new URL(absoluteUrl));
        const withImports = await resolveImports(processedCss, new URL(absoluteUrl));
        return `/* From: ${absoluteUrl} */\n${withImports}`;
      } else {
        console.warn(`Failed to fetch ${absoluteUrl}: ${response.status}`);
        return `/* Failed to fetch: ${absoluteUrl} (${response.status}) */`;
      }
    } catch (error) {
      console.warn(`Error fetching stylesheet ${href}:`, error);
      return `/* Error fetching: ${href} */`;
    }
  });
  
  const fetchedStyles = await Promise.all(fetchPromises);
  
  return [...fetchedStyles, ...cssFragments].join('\n\n');
}

// Convert relative URLs within CSS to absolute
function convertCssUrls(css: string, baseUrl: URL): string {
  return css.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    const absoluteUrl = makeAbsoluteUrl(url.trim(), baseUrl);
    return `url("${absoluteUrl}")`;
  });
}

// Resolve @import rules in CSS (one level deep)
async function resolveImports(css: string, baseUrl: URL): Promise<string> {
  const importRegex = /@import\s+(?:url\()?["']?([^"'\)]+)["']?\)?[^;]*;/gi;
  const imports: { match: string; url: string }[] = [];
  
  let importMatch;
  while ((importMatch = importRegex.exec(css)) !== null) {
    imports.push({ match: importMatch[0], url: importMatch[1] });
  }
  
  if (imports.length === 0) {
    return css;
  }
  
  console.log(`Resolving ${imports.length} @import rules`);
  
  const importedCss: string[] = [];
  for (const imp of imports) {
    try {
      const absoluteUrl = makeAbsoluteUrl(imp.url, baseUrl);
      const response = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/css,*/*;q=0.1',
        },
      });
      
      if (response.ok) {
        const importedText = await response.text();
        const processed = convertCssUrls(importedText, new URL(absoluteUrl));
        importedCss.push(`/* @import from: ${absoluteUrl} */\n${processed}`);
      }
    } catch (error) {
      console.warn(`Error resolving @import ${imp.url}:`, error);
    }
    
    css = css.replace(imp.match, '');
  }
  
  return importedCss.join('\n\n') + '\n\n' + css;
}

function extractHeader(html: string): string {
  const parts: string[] = [];
  
  // First, try to extract the entire <header> element if it exists
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
  if (headerMatch) {
    return headerMatch[0];
  }
  
  // Look for common header wrapper divs
  const headerDivPatterns = [
    /<div[^>]*(?:id|class)=["'][^"']*(?:header|site-header|main-header|page-header)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*(?:id|class)=["'][^"']*(?:masthead|top-header|global-header)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
  ];
  
  for (const pattern of headerDivPatterns) {
    const match = html.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  // Extract navigation elements
  const navRegex = /<nav[^>]*>[\s\S]*?<\/nav>/gi;
  let navMatch;
  while ((navMatch = navRegex.exec(html)) !== null) {
    parts.push(navMatch[0]);
  }
  
  // Look for top bar / announcement bar
  const topBarRegex = /<div[^>]*class="[^"]*(?:top-bar|announcement|promo-bar|utility-nav|secondary-menu)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  let topBarMatch: RegExpExecArray | null;
  while ((topBarMatch = topBarRegex.exec(html)) !== null) {
    if (!parts.some(p => p.includes(topBarMatch![0]))) {
      parts.unshift(topBarMatch[0]); // Add at the beginning
    }
  }
  
  // Look for logo/branding section if not already captured
  const logoRegex = /<(?:div|a)[^>]*class="[^"]*(?:logo|brand|site-branding)[^"]*"[^>]*>[\s\S]*?<\/(?:div|a)>/gi;
  let logoMatch: RegExpExecArray | null;
  while ((logoMatch = logoRegex.exec(html)) !== null) {
    if (!parts.some(p => p.includes(logoMatch![0]))) {
      parts.unshift(logoMatch[0]);
    }
  }
  
  return parts.join('\n');
}

function extractFooter(html: string): string {
  const parts: string[] = [];
  
  const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
  if (footerMatch) {
    parts.push(footerMatch[0]);
  }
  
  if (parts.length === 0) {
    const footerDivRegex = /<div[^>]*class="[^"]*(?:footer|site-footer|main-footer|bottom-bar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    let footerMatch;
    while ((footerMatch = footerDivRegex.exec(html)) !== null) {
      parts.push(footerMatch[0]);
    }
  }
  
  return parts.join('\n');
}
