import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeOptions {
  url: string;
  selector?: string;
  triggerSelector?: string; // CSS selector for button/link to click to open modal
  waitTime?: number; // Custom wait time in ms
}

interface FormElementStyles {
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
  rawFormCss: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authentication
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { url, selector, triggerSelector, waitTime } = await req.json() as ScrapeOptions;

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
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const baseUrl = new URL(formattedUrl);
    console.log('Scraping form styles from URL:', formattedUrl);
    console.log('Target selector:', selector || '(auto-detect)');
    console.log('Trigger selector:', triggerSelector || '(none)');
    console.log('Wait time:', waitTime || 3000, 'ms');

    // Build actions array for triggering modals/pop-outs
    const actions: Array<{ type: string; selector?: string; milliseconds?: number }> = [];
    
    if (triggerSelector) {
      // Click the trigger element to open modal/pop-out
      actions.push({ type: 'click', selector: triggerSelector });
      // Wait for modal animation
      actions.push({ type: 'wait', milliseconds: 1500 });
    }
    
    // Always wait for dynamic content
    actions.push({ type: 'wait', milliseconds: waitTime || 3000 });

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['rawHtml', 'html'],
        onlyMainContent: false,
        waitFor: waitTime || 3000,
        actions: actions.length > 0 ? actions : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from response
    const html = data.data?.html || data.html || '';
    const rawHtml = data.data?.rawHtml || data.rawHtml || html;

    // Extract all CSS from the page
    console.log('Extracting CSS from page...');
    const allCss = await extractAndInlineCss(rawHtml, baseUrl);
    
    // Parse the HTML to find form elements and extract inline styles
    const formStyles = extractFormElementStyles(rawHtml, allCss, selector);
    
    // Also get branding for fallback colors
    const brandingResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['branding'],
        onlyMainContent: false,
      }),
    });

    const brandingData = await brandingResponse.json();
    const branding = brandingData.data?.branding || brandingData.branding || null;

    // Merge extracted styles with branding fallbacks
    const finalStyles = mergeWithBrandingDefaults(formStyles, branding);

    console.log('Form style extraction complete');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          styles: finalStyles,
          rawCss: allCss,
          branding,
          sourceUrl: formattedUrl,
          selectorUsed: selector || 'auto-detected',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping form styles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape form styles';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract form element styles from HTML and CSS
function extractFormElementStyles(html: string, css: string, selector?: string): Partial<FormElementStyles> {
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
  ];
  
  // If a specific selector is provided, also check for inputs within it
  if (selector) {
    inputSelectors.unshift(`${selector} input`);
    inputSelectors.unshift(`${selector} .form-control`);
  }
  
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
      break; // Use first match
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
        // Extract color from box-shadow for focus border color fallback
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
  if (selector) {
    labelSelectors.unshift(`${selector} label`);
  }
  
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
  ];
  if (selector) {
    buttonSelectors.unshift(`${selector} button`);
    buttonSelectors.unshift(`${selector} [type="submit"]`);
  }
  
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
  const containerSelectors = selector ? [selector, `${selector} > div`, 'form', '.form'] : ['form', '.form', '[class*="form"]'];
  
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
  extractInlineStyles(html, styles, selector);
  
  return styles;
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
    
    // Parse properties
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
    
    // Create a rule for each selector
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
    
    // Check for exact match or partial match
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
  // Simple matching for common patterns
  const targetParts = target.split(/\s+/);
  const ruleParts = ruleSelector.split(/\s+/);
  
  // Check if any part matches
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
  
  // Match hex colors
  const hexMatch = bg.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  
  // Match rgb/rgba
  const rgbMatch = bg.match(/rgba?\([^)]+\)/);
  if (rgbMatch) return rgbMatch[0];
  
  // Match color names
  const colorNames = ['white', 'black', 'red', 'blue', 'green', 'gray', 'grey', 'transparent'];
  for (const name of colorNames) {
    if (bg.includes(name)) return name;
  }
  
  return undefined;
}

// Parse border shorthand
function parseBorderShorthand(border: string): { width?: string; style?: string; color?: string } {
  const parts: { width?: string; style?: string; color?: string } = {};
  
  // Extract width (px, em, rem)
  const widthMatch = border.match(/(\d+(?:\.\d+)?(?:px|em|rem))/i);
  if (widthMatch) parts.width = widthMatch[1];
  
  // Extract style
  const styles = ['solid', 'dashed', 'dotted', 'double', 'none'];
  for (const style of styles) {
    if (border.includes(style)) {
      parts.style = style;
      break;
    }
  }
  
  // Extract color
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
  // Match rgba/rgb colors
  const rgbMatch = shadow.match(/rgba?\([^)]+\)/);
  if (rgbMatch) return rgbMatch[0];
  
  // Match hex colors
  const hexMatch = shadow.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  
  return undefined;
}

// Extract inline styles from HTML elements
function extractInlineStyles(html: string, styles: Partial<FormElementStyles>, selector?: string): void {
  // Extract inline style attributes from input elements
  const inputStyleRegex = /<input[^>]*style=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = inputStyleRegex.exec(html)) !== null) {
    const inlineStyle = match[1];
    parseInlineStyleToFormStyles(inlineStyle, styles, 'input');
  }
  
  // Extract from labels
  const labelStyleRegex = /<label[^>]*style=["']([^"']+)["'][^>]*>/gi;
  while ((match = labelStyleRegex.exec(html)) !== null) {
    const inlineStyle = match[1];
    parseInlineStyleToFormStyles(inlineStyle, styles, 'label');
  }
  
  // Extract from buttons
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
    rawFormCss: '',
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
  
  // Merge with extracted styles taking priority
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(styles).filter(([_, v]) => v !== undefined && v !== null)),
  } as FormElementStyles;
}

// Extract and inline all CSS from the page
async function extractAndInlineCss(html: string, baseUrl: URL): Promise<string> {
  const cssFragments: string[] = [];
  
  // Extract inline <style> tags first
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(html)) !== null) {
    if (styleMatch[1]) {
      const processedCss = convertCssUrls(styleMatch[1], baseUrl);
      cssFragments.push(processedCss);
    }
  }
  
  // Extract linked stylesheet URLs
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
  
  // Fetch all external stylesheets in parallel
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
        return convertCssUrls(cssText, new URL(absoluteUrl));
      }
      return '';
    } catch (error) {
      console.warn(`Error fetching stylesheet ${href}:`, error);
      return '';
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
