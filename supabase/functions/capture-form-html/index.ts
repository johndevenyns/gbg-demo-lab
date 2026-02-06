const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureOptions {
  url: string;
  formId: string; // Form ID attribute (e.g., "membershipForm")
  triggerSelector?: string; // CSS selector for button/link to click to open modal
  waitTime?: number; // Custom wait time in ms
}

interface CapturedFormData {
  formHtml: string;
  formCss: string;
  formId: string;
  sourceUrl: string;
  styles: Record<string, string>;
  branding: Record<string, unknown> | null;
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

    if (!formId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Form ID is required' }),
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

    // Fetch the page with rawHtml to get complete DOM
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
    
    if (!rawHtml) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not retrieve page HTML' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the form by ID
    console.log(`Extracting form with id="${formId}"...`);
    const formHtml = extractFormById(rawHtml, formId, baseUrl);
    
    if (!formHtml) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Form with id="${formId}" not found on the page. Make sure the form ID is correct and the form is visible (not behind a modal that needs to be triggered).` 
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
    const relevantCss = filterRelevantCss(allCss, formClasses, formIds, formElements, formId);
    console.log(`Filtered to ${relevantCss.length} chars of relevant CSS`);

    // Also extract computed styles for fallback
    const styles = extractFormStyles(rawHtml, formId);

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

    console.log('Form capture complete');

    const capturedData: CapturedFormData = {
      formHtml,
      formCss: relevantCss,
      formId,
      sourceUrl: formattedUrl,
      styles,
      branding,
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
      return null;
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
