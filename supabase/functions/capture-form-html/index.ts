const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureOptions {
  url: string;
  formId?: string; // Form ID attribute (e.g., "membershipForm") - optional, will find first form if not specified
  triggerSelector?: string; // CSS selector for button/link to click to open modal
  waitTime?: number; // Custom wait time in ms
}

// Detected label display patterns
type LabelStyle = 'floating' | 'above' | 'inline' | 'placeholder-only' | 'hidden';

interface CapturedFormPatterns {
  labelStyle: LabelStyle;
  labelPosition?: 'top' | 'left' | 'inside';
  labelsVisible: boolean;
  usesPlaceholders: boolean;
  placeholderAsLabel: boolean;
  fieldLayout: 'stacked' | 'inline' | 'grid';
  fieldsPerRow?: number;
  hasHelperText: boolean;
  hasRequiredIndicator: boolean;
  requiredIndicatorStyle?: 'asterisk' | 'text' | 'color';
  inputStyle: 'bordered' | 'underlined' | 'filled' | 'outline';
  focusStyle: 'border-color' | 'shadow' | 'underline' | 'label-shrink';
  detectedFontFamily?: string;
  detectedFontSize?: string;
  detectedLabelFontSize?: string;
  detectedLabelFontWeight?: string;
  detectedLabelColor?: string;
  detectedInputFontSize?: string;
  detectedInputPadding?: string;
  detectedHelperTextSize?: string;
  detectedHelperTextColor?: string;
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
  detectedFieldSpacing?: string;
  detectedLabelSpacing?: string;
  detectedBorderRadius?: string;
  detectedBorderWidth?: string;
}

interface CapturedFormData {
  formHtml: string;
  formCss: string;
  formJs: string;
  formId: string;
  sourceUrl: string;
  styles: Record<string, string>;
  branding: Record<string, unknown> | null;
  patterns: CapturedFormPatterns; // Extracted display patterns
  formScreenshot?: string; // Base64 screenshot of the form area
  availableFormIds?: string[]; // List of form IDs found on the page
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, formId, triggerSelector, waitTime } = await req.json() as CaptureOptions;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // formId is now optional - we'll find the first form if not specified

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
    console.log('Capturing form from URL:', formattedUrl);
    console.log('Form ID:', formId);
    console.log('Trigger selector:', triggerSelector || '(none)');
    console.log('Wait time:', waitTime || 5000, 'ms');

    // Build actions array for triggering modals/pop-outs
    const actions: Array<{ type: string; selector?: string; milliseconds?: number }> = [];
    
    if (triggerSelector) {
      actions.push({ type: 'click', selector: triggerSelector });
      actions.push({ type: 'wait', milliseconds: 2000 });
    }
    
    // Wait for dynamic content to load
    actions.push({ type: 'wait', milliseconds: waitTime || 5000 });

    // Fetch the page with rawHtml AND screenshot to get complete DOM and visual
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['rawHtml', 'html', 'screenshot'],
        onlyMainContent: false,
        waitFor: waitTime || 5000,
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

    const rawHtml = data.data?.rawHtml || data.rawHtml || '';
    const pageScreenshot = data.data?.screenshot || data.screenshot || '';
    
    if (!rawHtml) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not retrieve page HTML' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract all form IDs found on the page to help the user
    const availableFormIds = extractAllFormIds(rawHtml);
    console.log(`Found ${availableFormIds.length} form/container IDs on page:`, availableFormIds.slice(0, 10));

    // Extract the form - either by ID or find the first form
    let actualFormId = formId || '';
    let formHtml: string | null = null;
    
    if (formId) {
      console.log(`Extracting form with id="${formId}"...`);
      formHtml = extractFormById(rawHtml, formId, baseUrl);
    } else {
      // Find the first form on the page
      console.log('No form ID specified, finding first form on page...');
      const result = extractFirstForm(rawHtml, baseUrl);
      if (result) {
        formHtml = result.html;
        actualFormId = result.formId || 'form-1';
        console.log(`Found first form${result.formId ? ` with id="${result.formId}"` : ''}`);
      }
    }
    
    if (!formHtml) {
      // Provide helpful error with available IDs
      const searchedFor = formId ? `Form with id="${formId}"` : 'No forms';
      const idSuggestions = availableFormIds.length > 0 
        ? ` Available IDs found: ${availableFormIds.slice(0, 8).join(', ')}${availableFormIds.length > 8 ? '...' : ''}`
        : ' No form or container IDs found on the page.';
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `${searchedFor} not found on the page.${idSuggestions}`,
          availableFormIds: availableFormIds.slice(0, 20),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Form extracted successfully (${formHtml.length} chars)`);

    // Extract all CSS from the page
    console.log('Extracting CSS from page...');
    const allCss = await extractAllCss(rawHtml, baseUrl);
    console.log(`Extracted ${allCss.length} chars of CSS`);

    // Extract form element classes to filter relevant CSS
    const formClasses = extractClassesFromHtml(formHtml);
    const formIds = extractIdsFromHtml(formHtml);
    const formElements = extractElementTypesFromHtml(formHtml);
    
    console.log(`Found ${formClasses.size} classes, ${formIds.size} IDs, ${formElements.size} element types in form`);

    // Filter CSS to only include rules that might apply to the form
    const relevantCss = filterRelevantCss(allCss, formClasses, formIds, formElements, actualFormId);
    console.log(`Filtered to ${relevantCss.length} chars of relevant CSS`);

    // Extract JavaScript for form interactions (floating labels, validation, etc.)
    console.log('Extracting JavaScript for form interactions...');
    const formJs = extractFormJavaScript(rawHtml, actualFormId, formClasses, formIds);
    console.log(`Extracted ${formJs.length} chars of JavaScript`);

    // Also extract computed styles for fallback
    const styles = extractFormStyles(rawHtml, actualFormId);

    // Get branding for additional context
    let branding = null;
    try {
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
      branding = brandingData.data?.branding || brandingData.branding || null;
    } catch (e) {
      console.warn('Failed to fetch branding:', e);
    }

    console.log('Analyzing form display patterns...');
    const patterns = analyzeFormPatterns(formHtml, relevantCss);
    console.log('Detected label style:', patterns.labelStyle);
    console.log('Labels visible:', patterns.labelsVisible);
    console.log('Uses placeholders:', patterns.usesPlaceholders);

    console.log('Form capture complete');

    const capturedData: CapturedFormData = {
      formHtml,
      formCss: relevantCss,
      formJs,
      formId: actualFormId,
      sourceUrl: formattedUrl,
      styles,
      branding,
      patterns,
      formScreenshot: pageScreenshot || undefined,
      availableFormIds,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: capturedData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error capturing form:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to capture form';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract a form element by its ID attribute
function extractFormById(html: string, formId: string, baseUrl: URL): string | null {
  // First try to find the opening form tag with the ID
  const formStartPatterns = [
    new RegExp(`<form[^>]*id=["']${escapeRegex(formId)}["'][^>]*>`, 'i'),
    new RegExp(`<form[^>]*id=${escapeRegex(formId)}[^>]*>`, 'i'),
  ];
  
  let startMatch = null;
  let startIndex = -1;
  
  for (const pattern of formStartPatterns) {
    const match = html.match(pattern);
    if (match) {
      startMatch = match;
      startIndex = html.indexOf(match[0]);
      break;
    }
  }
  
  if (!startMatch || startIndex === -1) {
    // Try to find any element with this ID that might be a form container
    const divPattern = new RegExp(`<[^>]*id=["']${escapeRegex(formId)}["'][^>]*>`, 'i');
    const divMatch = html.match(divPattern);
    if (divMatch) {
      startIndex = html.indexOf(divMatch[0]);
      startMatch = divMatch;
    } else {
      // Try to find an element with this as an attribute name (e.g., Angular _ngcontent-* attributes)
      const attrPattern = new RegExp(`<[^>]+\\s${escapeRegex(formId)}[\\s=>][^>]*>`, 'i');
      const attrMatch = html.match(attrPattern);
      if (attrMatch) {
        startIndex = html.indexOf(attrMatch[0]);
        startMatch = attrMatch;
        console.log(`Found element by attribute name "${formId}" instead of id`);
      } else {
        return null;
      }
    }
  }
  
  // Find the matching closing tag
  const tagMatch = startMatch[0].match(/^<(\w+)/);
  if (!tagMatch) return null;
  
  const tagName = tagMatch[1];
  const closeTag = `</${tagName}>`;
  
  // Find the matching close tag (handling nested tags)
  let depth = 1;
  let currentPos = startIndex + startMatch[0].length;
  const openTagPattern = new RegExp(`<${tagName}[\\s>]`, 'gi');
  const closeTagPattern = new RegExp(`</${tagName}>`, 'gi');
  
  while (depth > 0 && currentPos < html.length) {
    // Find next open or close tag
    openTagPattern.lastIndex = currentPos;
    closeTagPattern.lastIndex = currentPos;
    
    const nextOpen = openTagPattern.exec(html);
    const nextClose = closeTagPattern.exec(html);
    
    if (!nextClose) break; // No more close tags, malformed HTML
    
    if (!nextOpen || nextClose.index < nextOpen.index) {
      // Close tag comes first
      depth--;
      currentPos = nextClose.index + nextClose[0].length;
    } else {
      // Open tag comes first
      depth++;
      currentPos = nextOpen.index + nextOpen[0].length;
    }
  }
  
  if (depth !== 0) {
    // Fallback: just take a reasonable chunk after the start
    const fallbackEnd = html.indexOf(closeTag, startIndex);
    if (fallbackEnd !== -1) {
      currentPos = fallbackEnd + closeTag.length;
    }
  }
  
  let formHtml = html.substring(startIndex, currentPos);
  
  // Convert relative URLs to absolute
  formHtml = convertRelativeUrls(formHtml, baseUrl);
  
  return formHtml;
}

// Extract the first form element found on the page
function extractFirstForm(html: string, baseUrl: URL): { html: string; formId: string | null } | null {
  // Find the first <form> tag
  const formStartPattern = /<form[^>]*>/i;
  const match = html.match(formStartPattern);
  
  if (!match) {
    return null;
  }
  
  const startIndex = html.indexOf(match[0]);
  
  // Try to extract the form's ID if it has one
  const idMatch = match[0].match(/id=["']([^"']+)["']/i);
  const formId = idMatch ? idMatch[1] : null;
  
  // Find the matching </form> tag
  let depth = 1;
  let currentPos = startIndex + match[0].length;
  const openTagPattern = /<form[\s>]/gi;
  const closeTagPattern = /<\/form>/gi;
  
  while (depth > 0 && currentPos < html.length) {
    openTagPattern.lastIndex = currentPos;
    closeTagPattern.lastIndex = currentPos;
    
    const nextOpen = openTagPattern.exec(html);
    const nextClose = closeTagPattern.exec(html);
    
    if (!nextClose) break;
    
    if (!nextOpen || nextClose.index < nextOpen.index) {
      depth--;
      currentPos = nextClose.index + nextClose[0].length;
    } else {
      depth++;
      currentPos = nextOpen.index + nextOpen[0].length;
    }
  }
  
  if (depth !== 0) {
    // Fallback: find the first </form>
    const fallbackEnd = html.indexOf('</form>', startIndex);
    if (fallbackEnd !== -1) {
      currentPos = fallbackEnd + '</form>'.length;
    } else {
      return null;
    }
  }
  
  let formHtml = html.substring(startIndex, currentPos);
  formHtml = convertRelativeUrls(formHtml, baseUrl);
  
  return { html: formHtml, formId };
}

// Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Convert relative URLs in HTML to absolute
function convertRelativeUrls(html: string, baseUrl: URL): string {
  // Convert src attributes
  html = html.replace(/\ssrc=["']([^"']+)["']/gi, (match, url) => {
    const absolute = makeAbsoluteUrl(url, baseUrl);
    return ` src="${absolute}"`;
  });
  
  // Convert href attributes
  html = html.replace(/\shref=["']([^"']+)["']/gi, (match, url) => {
    if (url.startsWith('#') || url.startsWith('javascript:')) return match;
    const absolute = makeAbsoluteUrl(url, baseUrl);
    return ` href="${absolute}"`;
  });
  
  // Convert background URLs in inline styles
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    const absolute = makeAbsoluteUrl(url, baseUrl);
    return `url("${absolute}")`;
  });
  
  return html;
}

// Extract all classes from HTML
function extractClassesFromHtml(html: string): Set<string> {
  const classes = new Set<string>();
  const classPattern = /class=["']([^"']+)["']/gi;
  let match;
  
  while ((match = classPattern.exec(html)) !== null) {
    const classString = match[1];
    classString.split(/\s+/).forEach(cls => {
      if (cls.trim()) classes.add(cls.trim());
    });
  }
  
  return classes;
}

// Extract all IDs from HTML
function extractIdsFromHtml(html: string): Set<string> {
  const ids = new Set<string>();
  const idPattern = /id=["']([^"']+)["']/gi;
  let match;
  
  while ((match = idPattern.exec(html)) !== null) {
    ids.add(match[1]);
  }
  
  return ids;
}

// Extract all form and container IDs from the page to help users find the right ID
function extractAllFormIds(html: string): string[] {
  const ids: string[] = [];
  
  // Look for form elements with IDs
  const formIdPattern = /<form[^>]*id=["']([^"']+)["']/gi;
  let match;
  while ((match = formIdPattern.exec(html)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }
  
  // Look for section/div elements that might contain forms (common patterns)
  const containerPatterns = [
    /<section[^>]*id=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*id=["']([^"']*(?:form|signup|signin|register|login|apply|checkout|contact|subscribe|membership)[^"']*)["']/gi,
    /<div[^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*(?:form|card|panel|container|section|wrapper)[^"']*["']/gi,
  ];
  
  for (const pattern of containerPatterns) {
    while ((match = pattern.exec(html)) !== null) {
      if (match[1] && !ids.includes(match[1])) ids.push(match[1]);
    }
  }
  
  // Look for any element with common form-related IDs
  const formRelatedIdPattern = /id=["']([^"']*(?:form|card|application|step|input|field|modal|dialog|panel)[^"']*)["']/gi;
  while ((match = formRelatedIdPattern.exec(html)) !== null) {
    if (match[1] && !ids.includes(match[1]) && match[1].length < 50) {
      ids.push(match[1]);
    }
  }
  
  return ids.slice(0, 30); // Limit to avoid overwhelming the response
}

// Extract all element types from HTML
function extractElementTypesFromHtml(html: string): Set<string> {
  const elements = new Set<string>();
  const tagPattern = /<(\w+)[>\s]/gi;
  let match;
  
  while ((match = tagPattern.exec(html)) !== null) {
    elements.add(match[1].toLowerCase());
  }
  
  // Always include common form elements
  ['input', 'label', 'button', 'select', 'textarea', 'form', 'fieldset', 'legend'].forEach(el => elements.add(el));
  
  return elements;
}

// Filter CSS to only include rules relevant to the form
function filterRelevantCss(
  css: string,
  formClasses: Set<string>,
  formIds: Set<string>,
  formElements: Set<string>,
  formId: string
): string {
  const relevantRules: string[] = [];
  
  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Extract @font-face rules (always include these)
  const fontFacePattern = /@font-face\s*\{[^}]+\}/gi;
  let fontMatch;
  while ((fontMatch = fontFacePattern.exec(css)) !== null) {
    relevantRules.push(fontMatch[0]);
  }
  
  // Extract @import rules (include all)
  const importPattern = /@import\s+[^;]+;/gi;
  let importMatch;
  while ((importMatch = importPattern.exec(css)) !== null) {
    relevantRules.push(importMatch[0]);
  }
  
  // Parse CSS rules
  const rulePattern = /([^{}@]+)\{([^{}]+)\}/g;
  let ruleMatch;
  
  while ((ruleMatch = rulePattern.exec(css)) !== null) {
    const selector = ruleMatch[1].trim();
    const properties = ruleMatch[2];
    
    // Skip if it's a nested at-rule content
    if (selector.startsWith('@')) continue;
    
    // Check if this rule might apply to our form
    if (isRuleRelevant(selector, formClasses, formIds, formElements, formId)) {
      relevantRules.push(`${selector} { ${properties} }`);
    }
  }
  
  // Also extract @media rules
  const mediaPattern = /@media[^{]+\{([\s\S]*?)\}\s*\}/gi;
  let mediaMatch;
  while ((mediaMatch = mediaPattern.exec(css)) !== null) {
    const mediaQuery = css.substring(mediaMatch.index, mediaMatch.index + mediaMatch[0].indexOf('{') + 1);
    const mediaContent = mediaMatch[1];
    
    // Check rules inside media query
    const innerRules: string[] = [];
    const innerRulePattern = /([^{}]+)\{([^{}]+)\}/g;
    let innerMatch;
    
    while ((innerMatch = innerRulePattern.exec(mediaContent)) !== null) {
      const selector = innerMatch[1].trim();
      const properties = innerMatch[2];
      
      if (isRuleRelevant(selector, formClasses, formIds, formElements, formId)) {
        innerRules.push(`${selector} { ${properties} }`);
      }
    }
    
    if (innerRules.length > 0) {
      relevantRules.push(`${mediaQuery}\n${innerRules.join('\n')}\n}`);
    }
  }
  
  return relevantRules.join('\n\n');
}

// Check if a CSS rule is relevant to the form
function isRuleRelevant(
  selector: string,
  formClasses: Set<string>,
  formIds: Set<string>,
  formElements: Set<string>,
  formId: string
): boolean {
  const selectorLower = selector.toLowerCase();
  
  // Direct form ID reference
  if (selectorLower.includes(`#${formId.toLowerCase()}`)) return true;
  
  // Check for form element IDs
  for (const id of formIds) {
    if (selectorLower.includes(`#${id.toLowerCase()}`)) return true;
  }
  
  // Check for form element classes
  for (const cls of formClasses) {
    if (selectorLower.includes(`.${cls.toLowerCase()}`)) return true;
  }
  
  // Check for element type selectors
  for (const element of formElements) {
    // Match element type at word boundary
    const elementPattern = new RegExp(`(^|[\\s,>+~])${element}([\\s,>+~:.[#]|$)`, 'i');
    if (elementPattern.test(selector)) return true;
  }
  
  // Include common form-related selectors
  const formKeywords = [
    'input', 'label', 'button', 'select', 'textarea', 'form',
    'field', 'control', 'error', 'valid', 'invalid', 'focus',
    'placeholder', 'disabled', 'required', 'submit', 'checkbox',
    'radio', 'option', 'optgroup'
  ];
  
  for (const keyword of formKeywords) {
    if (selectorLower.includes(keyword)) return true;
  }
  
  // Include :root and * selectors for CSS variables
  if (selector.trim() === ':root' || selector.trim() === '*') return true;
  
  return false;
}

// Extract form styles (simplified version for fallback)
function extractFormStyles(html: string, formId: string): Record<string, string> {
  const styles: Record<string, string> = {};
  
  // Extract inline styles from form elements
  const stylePattern = /style=["']([^"']+)["']/gi;
  let match;
  
  while ((match = stylePattern.exec(html)) !== null) {
    const styleString = match[1];
    const pairs = styleString.split(';');
    
    for (const pair of pairs) {
      const [prop, value] = pair.split(':').map(s => s.trim());
      if (prop && value) {
        styles[prop] = value;
      }
    }
  }
  
  return styles;
}

// Extract all CSS from the page
async function extractAllCss(html: string, baseUrl: URL): Promise<string> {
  const cssFragments: string[] = [];
  
  // Extract inline <style> tags
  const styleTagPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagPattern.exec(html)) !== null) {
    if (styleMatch[1]) {
      const processedCss = convertCssUrls(styleMatch[1], baseUrl);
      cssFragments.push(processedCss);
    }
  }
  
  // Extract linked stylesheets
  const stylesheetUrls = new Set<string>();
  const linkPatterns = [
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/gi,
  ];
  
  for (const pattern of linkPatterns) {
    let linkMatch;
    while ((linkMatch = pattern.exec(html)) !== null) {
      if (linkMatch[1]) {
        stylesheetUrls.add(linkMatch[1]);
      }
    }
  }
  
  console.log(`Found ${stylesheetUrls.size} external stylesheets`);
  
  // Fetch all external stylesheets in parallel
  const fetchPromises = Array.from(stylesheetUrls).map(async (href) => {
    try {
      const absoluteUrl = makeAbsoluteUrl(href, baseUrl);
      console.log(`Fetching stylesheet: ${absoluteUrl}`);
      
      const response = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

// Extract JavaScript that might control form interactions (floating labels, validation, etc.)
function extractFormJavaScript(
  html: string,
  formId: string,
  formClasses: Set<string>,
  formIds: Set<string>
): string {
  const jsFragments: string[] = [];
  
  // Extract inline <script> tags (not external ones)
  const scriptPattern = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    const scriptContent = scriptMatch[1].trim();
    if (!scriptContent) continue;
    
    // Check if this script references our form or its elements
    const isRelevant = isScriptRelevantToForm(scriptContent, formId, formClasses, formIds);
    if (isRelevant) {
      jsFragments.push(scriptContent);
    }
  }
  
  // If we didn't find any inline scripts, create a fallback floating label implementation
  // since many forms use this pattern but implement it via external bundles
  if (jsFragments.length === 0) {
    jsFragments.push(generateFloatingLabelScript(formId));
  }
  
  return jsFragments.join('\n\n');
}

// Check if a script is relevant to our form
function isScriptRelevantToForm(
  script: string,
  formId: string,
  formClasses: Set<string>,
  formIds: Set<string>
): boolean {
  const scriptLower = script.toLowerCase();
  
  // Check for form ID reference
  if (scriptLower.includes(formId.toLowerCase())) return true;
  
  // Check for form IDs
  for (const id of formIds) {
    if (scriptLower.includes(id.toLowerCase())) return true;
  }
  
  // Check for class references (common patterns)
  for (const cls of formClasses) {
    if (scriptLower.includes(`.${cls.toLowerCase()}`)) return true;
    if (scriptLower.includes(`'${cls.toLowerCase()}'`)) return true;
    if (scriptLower.includes(`"${cls.toLowerCase()}"`)) return true;
  }
  
  // Check for common form interaction patterns
  const formPatterns = [
    'floating', 'label', 'focus', 'blur', 'input',
    'validate', 'error', 'field', 'form',
    'addeventlistener', 'queryselector', 'getelementby'
  ];
  
  let matchCount = 0;
  for (const pattern of formPatterns) {
    if (scriptLower.includes(pattern)) matchCount++;
  }
  
  // If multiple form-related patterns are found, include it
  return matchCount >= 3;
}

// Generate a floating label script as fallback
function generateFloatingLabelScript(formId: string): string {
  return `
// Floating Label Implementation (auto-generated fallback)
(function() {
  const form = document.getElementById('${formId}') || document.querySelector('form');
  if (!form) return;
  
  // Find all inputs and textareas
  const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
  
  inputs.forEach(function(input) {
    const wrapper = input.closest('.form-group, .field-wrapper, .input-wrapper, .form-field') || input.parentElement;
    const label = wrapper ? wrapper.querySelector('label') : null;
    
    if (!label) return;
    
    // Add floating class on focus
    input.addEventListener('focus', function() {
      wrapper.classList.add('focused', 'has-focus', 'is-focused');
      if (label) label.classList.add('floating', 'active', 'shrink', 'label-active');
    });
    
    // Check value on blur
    input.addEventListener('blur', function() {
      wrapper.classList.remove('focused', 'has-focus', 'is-focused');
      if (!input.value) {
        if (label) label.classList.remove('floating', 'active', 'shrink', 'label-active');
      }
    });
    
    // Check initial value
    if (input.value) {
      if (label) label.classList.add('floating', 'active', 'shrink', 'label-active');
    }
  });
})();
`.trim();
}

// Analyze form HTML and CSS to detect display patterns
function analyzeFormPatterns(formHtml: string, formCss: string): CapturedFormPatterns {
  const htmlLower = formHtml.toLowerCase();
  const cssLower = formCss.toLowerCase();
  
  // Detect label presence and style
  const hasLabels = /<label[^>]*>/i.test(formHtml);
  const labelCount = (formHtml.match(/<label/gi) || []).length;
  const inputCount = (formHtml.match(/<input(?![^>]*type=["'](?:hidden|submit|button)["'])/gi) || []).length;
  
  // Check for floating label patterns in CSS
  const hasFloatingLabelCss = 
    /\.floating|label\.active|label\.shrink|\.has-value|\.focused\s+label|:focus\s*\+\s*label|:focus-within.*label/i.test(cssLower) ||
    /transform:\s*translatey\s*\(|transform:\s*scale\s*\(/i.test(cssLower);
  
  // Check for floating label patterns in HTML classes
  const hasFloatingLabelClasses = 
    /class=["'][^"']*(?:floating|material|mdc-text-field|form-floating|float-label)[^"']*["']/i.test(formHtml);
  
  // Check if labels are inside input wrappers (floating pattern)
  const labelsInsideWrapper = /<div[^>]*>[\s\S]*?<input[^>]*>[\s\S]*?<label[^>]*>/i.test(formHtml) ||
    /<div[^>]*>[\s\S]*?<label[^>]*>[\s\S]*?<input[^>]*>/i.test(formHtml);
  
  // Check for placeholder-only pattern (no visible labels, just placeholders)
  const hasPlaceholders = /placeholder=["'][^"']+["']/i.test(formHtml);
  const placeholderCount = (formHtml.match(/placeholder=["'][^"']+["']/gi) || []).length;
  
  // Determine label style
  let labelStyle: LabelStyle = 'above';
  let labelPosition: 'top' | 'left' | 'inside' = 'top';
  
  if (!hasLabels || labelCount === 0) {
    if (hasPlaceholders) {
      labelStyle = 'placeholder-only';
    } else {
      labelStyle = 'hidden';
    }
  } else if (hasFloatingLabelCss || hasFloatingLabelClasses) {
    labelStyle = 'floating';
    labelPosition = 'inside';
  } else if (labelsInsideWrapper && hasPlaceholders && placeholderCount >= inputCount * 0.8) {
    // If most inputs have placeholders and labels are in wrappers, likely floating
    labelStyle = 'floating';
    labelPosition = 'inside';
  }
  
  // Check for inline layout (labels beside inputs)
  const hasInlineLabels = /display:\s*(?:inline-flex|inline-block|flex).*label|label.*display:\s*(?:inline|inline-block)/i.test(cssLower) ||
    /class=["'][^"']*(?:inline|horizontal|row)[^"']*["']/i.test(formHtml);
  
  if (hasInlineLabels && labelStyle === 'above') {
    labelStyle = 'inline';
    labelPosition = 'left';
  }
  
  // Detect field layout
  let fieldLayout: 'stacked' | 'inline' | 'grid' = 'stacked';
  let fieldsPerRow = 1;
  
  if (/display:\s*grid|grid-template-columns/i.test(cssLower)) {
    fieldLayout = 'grid';
    // Try to detect columns
    const gridMatch = cssLower.match(/grid-template-columns:\s*repeat\s*\(\s*(\d+)/i);
    if (gridMatch) {
      fieldsPerRow = parseInt(gridMatch[1], 10);
    }
  } else if (/display:\s*flex.*flex-direction:\s*row|flex-wrap:\s*wrap/i.test(cssLower)) {
    fieldLayout = 'inline';
    fieldsPerRow = 2;
  }
  
  // Detect input styling
  let inputStyle: 'bordered' | 'underlined' | 'filled' | 'outline' = 'bordered';
  
  if (/border-bottom[^;]*:\s*[^n]|border-bottom-width/i.test(cssLower) && 
      !/border(?:-top|-left|-right)?[^-]/i.test(cssLower)) {
    inputStyle = 'underlined';
  } else if (/background-color:\s*(?!transparent|rgba\([^)]*,\s*0\))/i.test(cssLower) &&
             /border:\s*(?:none|0)/i.test(cssLower)) {
    inputStyle = 'filled';
  }
  
  // Detect focus style
  let focusStyle: 'border-color' | 'shadow' | 'underline' | 'label-shrink' = 'border-color';
  
  if (labelStyle === 'floating') {
    focusStyle = 'label-shrink';
  } else if (/focus.*box-shadow|:focus-within.*box-shadow/i.test(cssLower)) {
    focusStyle = 'shadow';
  } else if (inputStyle === 'underlined') {
    focusStyle = 'underline';
  }
  
  // Extract colors from CSS
  const extractColor = (pattern: RegExp): string | undefined => {
    const match = cssLower.match(pattern);
    if (match && match[1]) {
      // Return original case from full CSS
      const originalMatch = formCss.match(new RegExp(pattern.source, 'i'));
      return originalMatch?.[1];
    }
    return undefined;
  };
  
  // Try to extract specific colors
  const detectedInputBgColor = extractColor(/input[^{]*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i);
  const detectedInputBorderColor = extractColor(/input[^{]*\{[^}]*border(?:-color)?:\s*[^;]*?([#\w]+(?:\([^)]+\))?)/i);
  const detectedLabelColor = extractColor(/label[^{]*\{[^}]*color:\s*([^;}\s]+)/i);
  const detectedButtonBgColor = extractColor(/button[^{]*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i) ||
    extractColor(/\[type=["']?submit["']?\][^{]*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i);
  const detectedButtonTextColor = extractColor(/button[^{]*\{[^}]*(?<!background-)color:\s*([^;}\s]+)/i);
  const detectedButtonHoverBgColor = extractColor(/button:hover[^{]*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i);
  const detectedButtonBorderRadius = extractColor(/button[^{]*\{[^}]*border-radius:\s*([^;}\s]+)/i) ||
    extractColor(/\[type=["']?submit["']?\][^{]*\{[^}]*border-radius:\s*([^;}\s]+)/i);
  const detectedButtonPadding = extractColor(/button[^{]*\{[^}]*padding:\s*([^;]+)/i);
  const detectedButtonFontWeight = extractColor(/button[^{]*\{[^}]*font-weight:\s*([^;}\s]+)/i);
  const detectedErrorColor = extractColor(/\.error[^{]*\{[^}]*color:\s*([^;}\s]+)/i) ||
    extractColor(/\.invalid[^{]*\{[^}]*color:\s*([^;}\s]+)/i);
  
  // Extract typography
  const detectedFontFamily = extractColor(/(?:body|form|input)[^{]*\{[^}]*font-family:\s*([^;]+)/i);
  const detectedFontSize = extractColor(/input[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i);
  const detectedLabelFontSize = extractColor(/label[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i);
  const detectedLabelFontWeight = extractColor(/label[^{]*\{[^}]*font-weight:\s*([^;}\s]+)/i);
  
  // Extract spacing
  const detectedInputPadding = extractColor(/input[^{]*\{[^}]*padding:\s*([^;]+)/i);
  const detectedBorderRadius = extractColor(/input[^{]*\{[^}]*border-radius:\s*([^;}\s]+)/i);
  const detectedBorderWidth = extractColor(/input[^{]*\{[^}]*border(?:-width)?:\s*(\d+(?:px)?)/i);
  
  // Detect helper text
  const hasHelperText = /class=["'][^"']*(?:helper|hint|description|help-text|supporting)[^"']*["']/i.test(formHtml) ||
    /<small[^>]*>|<span[^>]*class=["'][^"']*help/i.test(formHtml);
  
  // Detect required indicator
  const hasRequiredIndicator = /required|aria-required/i.test(formHtml) ||
    /\*|class=["'][^"']*required/i.test(formHtml);
  let requiredIndicatorStyle: 'asterisk' | 'text' | 'color' | undefined;
  if (hasRequiredIndicator) {
    if (/>\s*\*/i.test(formHtml) || /::after[^{]*content:\s*["']\*/i.test(cssLower)) {
      requiredIndicatorStyle = 'asterisk';
    } else if (/required/i.test(formHtml) && !/aria-required/i.test(formHtml)) {
      requiredIndicatorStyle = 'text';
    }
  }
  
  return {
    labelStyle,
    labelPosition,
    labelsVisible: hasLabels && labelCount > 0,
    usesPlaceholders: hasPlaceholders,
    placeholderAsLabel: labelStyle === 'placeholder-only' || 
      (labelStyle === 'floating' && hasPlaceholders && placeholderCount >= inputCount * 0.5),
    fieldLayout,
    fieldsPerRow,
    hasHelperText,
    hasRequiredIndicator,
    requiredIndicatorStyle,
    inputStyle,
    focusStyle,
    detectedFontFamily: detectedFontFamily?.trim(),
    detectedFontSize,
    detectedLabelFontSize,
    detectedLabelFontWeight,
    detectedLabelColor,
    detectedInputFontSize: detectedFontSize, // Same as detectedFontSize for inputs
    detectedInputPadding,
    detectedHelperTextSize: undefined, // Could be extracted if needed
    detectedHelperTextColor: undefined,
    detectedInputBgColor,
    detectedInputBorderColor,
    detectedInputFocusBorderColor: undefined,
    detectedButtonBgColor,
    detectedButtonTextColor,
    detectedButtonHoverBgColor,
    detectedButtonBorderRadius,
    detectedButtonPadding,
    detectedButtonFontWeight,
    detectedErrorColor,
    detectedFieldSpacing: undefined,
    detectedLabelSpacing: undefined,
    detectedBorderRadius,
    detectedBorderWidth,
  };
}
