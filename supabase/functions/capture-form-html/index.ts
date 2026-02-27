import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureOptions {
  url: string;
  formId?: string;
  triggerSelector?: string;
  waitTime?: number;
}

type LabelStyle = 'floating' | 'above' | 'inline' | 'placeholder-only' | 'hidden';

interface DetectedFramework {
  name: string;
  version?: string;
  cdnCss?: string[];
  cdnJs?: string[];
}

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
  detectedFrameworks?: DetectedFramework[];
  // Enhanced font data
  fontLinks?: string[];        // Google Fonts, Adobe Fonts, etc. link URLs
  fontFaceRules?: string[];    // Raw @font-face CSS rules
  detectedFontWeights?: string[];  // All font weights found
  detectedFontStyles?: string[];   // italic, normal, etc.
  detectedLetterSpacing?: string;
  detectedLineHeight?: string;
  detectedTextTransform?: string;
  detectedLabelLetterSpacing?: string;
  detectedLabelTextTransform?: string;
  detectedInputLetterSpacing?: string;
  detectedButtonLetterSpacing?: string;
  detectedButtonTextTransform?: string;
  detectedLabelLineHeight?: string;
}

interface CapturedFormData {
  formHtml: string;
  formCss: string;
  formJs: string;
  formId: string;
  sourceUrl: string;
  styles: Record<string, string>;
  branding: Record<string, unknown> | null;
  patterns: CapturedFormPatterns;
  formScreenshot?: string;
  availableFormIds?: string[];
  detectedFrameworks?: DetectedFramework[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authentication
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { url, formId, triggerSelector, waitTime } = await req.json() as CaptureOptions;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const baseUrl = new URL(formattedUrl);
    console.log('Capturing form from URL:', formattedUrl);
    console.log('Form ID:', formId);
    console.log('Trigger selector:', triggerSelector || '(none)');
    console.log('Wait time:', waitTime || 5000, 'ms');

    const actions: Array<{ type: string; selector?: string; milliseconds?: number }> = [];
    if (triggerSelector) {
      actions.push({ type: 'click', selector: triggerSelector });
      actions.push({ type: 'wait', milliseconds: 2000 });
    }
    actions.push({ type: 'wait', milliseconds: waitTime || 5000 });

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

    // Detect frameworks FIRST - this informs all subsequent extraction
    const detectedFrameworks = detectFrameworks(rawHtml);
    console.log('Detected frameworks:', detectedFrameworks.map(f => f.name).join(', ') || 'none');

    const availableFormIds = extractAllFormIds(rawHtml);
    console.log(`Found ${availableFormIds.length} form/container IDs on page:`, availableFormIds.slice(0, 10));

    // Extract form using framework-aware strategies
    let actualFormId = formId || '';
    let formHtml: string | null = null;

    if (formId) {
      console.log(`Extracting form with id="${formId}"...`);
      formHtml = extractFormById(rawHtml, formId, baseUrl);
    }
    
    if (!formHtml) {
      // Framework-aware: try to find form containers using framework-specific selectors
      console.log('Trying framework-aware form extraction...');
      const result = extractFormFrameworkAware(rawHtml, baseUrl, detectedFrameworks, formId);
      if (result) {
        formHtml = result.html;
        actualFormId = result.formId || actualFormId || 'form-1';
        console.log(`Found form via ${result.method}`);
      }
    }

    if (!formHtml && !formId) {
      // Last resort: find the first <form> tag
      console.log('Falling back to first <form> tag...');
      const result = extractFirstForm(rawHtml, baseUrl);
      if (result) {
        formHtml = result.html;
        actualFormId = result.formId || 'form-1';
        console.log(`Found first form${result.formId ? ` with id="${result.formId}"` : ''}`);
      }
    }

    if (!formHtml) {
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

    // Clean framework-specific attributes that won't work outside the original app
    formHtml = cleanFrameworkAttributes(formHtml, detectedFrameworks);

    console.log('Extracting CSS from page...');
    const allCss = await extractAllCss(rawHtml, baseUrl);
    console.log(`Extracted ${allCss.length} chars of CSS`);

    const formClasses = extractClassesFromHtml(formHtml);
    const formIds = extractIdsFromHtml(formHtml);
    const formElements = extractElementTypesFromHtml(formHtml);

    console.log(`Found ${formClasses.size} classes, ${formIds.size} IDs, ${formElements.size} element types in form`);

    const relevantCss = filterRelevantCss(allCss, formClasses, formIds, formElements, actualFormId);
    console.log(`Filtered to ${relevantCss.length} chars of relevant CSS`);

    // Generate framework-aware JS
    console.log('Generating framework-aware JavaScript...');
    const formJs = generateFrameworkAwareJs(rawHtml, actualFormId, formClasses, formIds, detectedFrameworks);
    console.log(`Generated ${formJs.length} chars of JavaScript`);

    const styles = extractFormStyles(rawHtml, actualFormId);

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

    console.log('Extracting font resources...');
    const fontData = extractFontResources(rawHtml, allCss, baseUrl);
    console.log(`Found ${fontData.fontLinks.length} font links, ${fontData.fontFaceRules.length} @font-face rules`);

    console.log('Analyzing form display patterns...');
    const patterns = analyzeFormPatterns(formHtml, relevantCss);
    patterns.detectedFrameworks = detectedFrameworks;
    patterns.fontLinks = fontData.fontLinks;
    patterns.fontFaceRules = fontData.fontFaceRules;
    
    // Enhanced typography extraction
    const typo = extractDetailedTypography(formHtml, relevantCss, allCss);
    if (typo.fontFamily) patterns.detectedFontFamily = typo.fontFamily;
    if (typo.fontSize) patterns.detectedFontSize = typo.fontSize;
    if (typo.inputFontSize) patterns.detectedInputFontSize = typo.inputFontSize;
    if (typo.labelFontSize) patterns.detectedLabelFontSize = typo.labelFontSize;
    if (typo.labelFontWeight) patterns.detectedLabelFontWeight = typo.labelFontWeight;
    if (typo.labelColor) patterns.detectedLabelColor = typo.labelColor;
    patterns.detectedFontWeights = typo.fontWeights;
    patterns.detectedFontStyles = typo.fontStyles;
    patterns.detectedLetterSpacing = typo.letterSpacing;
    patterns.detectedLineHeight = typo.lineHeight;
    patterns.detectedTextTransform = typo.textTransform;
    patterns.detectedLabelLetterSpacing = typo.labelLetterSpacing;
    patterns.detectedLabelTextTransform = typo.labelTextTransform;
    patterns.detectedLabelLineHeight = typo.labelLineHeight;
    patterns.detectedInputLetterSpacing = typo.inputLetterSpacing;
    patterns.detectedButtonLetterSpacing = typo.buttonLetterSpacing;
    patterns.detectedButtonTextTransform = typo.buttonTextTransform;
    
    console.log('Detected font family:', patterns.detectedFontFamily);
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
      detectedFrameworks,
    };

    return new Response(
      JSON.stringify({ success: true, data: capturedData }),
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

// ==================== FRAMEWORK DETECTION ====================

function detectFrameworks(html: string): DetectedFramework[] {
  const frameworks: DetectedFramework[] = [];
  const htmlLower = html.toLowerCase();

  // Angular / Angular Material
  if (/_ngcontent-|_nghost-|ng-version|angular/i.test(html)) {
    const versionMatch = html.match(/ng-version=["']([^"']+)["']/i);
    const isAngularMaterial = /mat-form-field|mat-input|mat-label|mat-select|matinput/i.test(html);
    frameworks.push({
      name: isAngularMaterial ? 'angular-material' : 'angular',
      version: versionMatch?.[1],
      cdnCss: isAngularMaterial ? [
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
      ] : [],
    });
  }

  // React / Material UI (MUI)
  if (/data-reactroot|__next|data-reactid|react-root/i.test(html) ||
      /mui-|MuiInput|MuiTextField|MuiButton|MuiFormControl/i.test(html)) {
    const isMUI = /mui-|MuiInput|MuiTextField|MuiButton|MuiFormControl|css-[a-z0-9]{5,}/i.test(html);
    frameworks.push({
      name: isMUI ? 'mui' : 'react',
      cdnCss: isMUI ? [
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
      ] : [],
    });
  }

  // Bootstrap
  if (/class=["'][^"']*(?:form-control|form-group|form-floating|form-check|input-group|btn\s|btn-primary|form-label|form-select)/i.test(html) ||
      htmlLower.includes('bootstrap')) {
    const v5 = /form-floating|form-switch|was-validated/i.test(html);
    frameworks.push({
      name: 'bootstrap',
      version: v5 ? '5' : '4',
      cdnCss: v5
        ? ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css']
        : ['https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css'],
      cdnJs: v5
        ? ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js']
        : [],
    });
  }

  // Tailwind CSS
  if (/class=["'][^"']*(?:flex|grid|space-[xy]|rounded-|border-|bg-|text-|px-|py-|mt-|mb-|w-full|focus:ring)/i.test(html) &&
      (html.match(/(?:flex|rounded-|bg-|text-|px-|py-|w-)/gi) || []).length > 5) {
    frameworks.push({
      name: 'tailwind',
      cdnCss: ['https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css'],
    });
  }

  // Ant Design
  if (/ant-form|ant-input|ant-btn|ant-select|antd/i.test(html)) {
    frameworks.push({
      name: 'antd',
      cdnCss: ['https://cdn.jsdelivr.net/npm/antd@5/dist/reset.min.css'],
    });
  }

  // Chakra UI
  if (/chakra-|css-[a-z0-9]+.*chakra/i.test(html)) {
    frameworks.push({ name: 'chakra-ui' });
  }

  // Vuetify
  if (/v-text-field|v-form|v-btn|v-input|vuetify/i.test(html)) {
    frameworks.push({
      name: 'vuetify',
      cdnCss: [
        'https://cdn.jsdelivr.net/npm/vuetify@3/dist/vuetify.min.css',
        'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
      ],
    });
  }

  // Semantic UI / Fomantic UI
  if (/class=["'][^"']*(?:ui\s+form|ui\s+input|ui\s+button|ui\s+segment)/i.test(html)) {
    frameworks.push({
      name: 'semantic-ui',
      cdnCss: ['https://cdn.jsdelivr.net/npm/fomantic-ui@2/dist/semantic.min.css'],
    });
  }

  // Foundation
  if (/class=["'][^"']*(?:callout|cell|grid-x|grid-y|button\s+|hollow\s+button)/i.test(html) &&
      htmlLower.includes('foundation')) {
    frameworks.push({
      name: 'foundation',
      cdnCss: ['https://cdn.jsdelivr.net/npm/foundation-sites@6/dist/css/foundation.min.css'],
    });
  }

  // Bulma
  if (/class=["'][^"']*(?:field\s+|control\s+|input\s+is-|button\s+is-|label\s+)/i.test(html) &&
      /class=["'][^"']*(?:is-primary|is-danger|is-success|is-info)/i.test(html)) {
    frameworks.push({
      name: 'bulma',
      cdnCss: ['https://cdn.jsdelivr.net/npm/bulma@1/css/bulma.min.css'],
    });
  }

  // Materialize CSS
  if (/class=["'][^"']*(?:input-field|materialize|waves-effect)/i.test(html)) {
    frameworks.push({
      name: 'materialize',
      cdnCss: ['https://cdn.jsdelivr.net/npm/materialize-css@1/dist/css/materialize.min.css'],
      cdnJs: ['https://cdn.jsdelivr.net/npm/materialize-css@1/dist/js/materialize.min.js'],
    });
  }

  // Radix UI / shadcn/ui
  if (/data-radix|radix-|data-state=["'](?:open|closed|checked)/i.test(html)) {
    frameworks.push({ name: 'radix-ui' });
  }

  // Formik / React Hook Form markers
  if (/data-formik|formik|react-hook-form/i.test(html)) {
    frameworks.push({ name: 'formik' });
  }

  return frameworks;
}

// ==================== FRAMEWORK-AWARE FORM EXTRACTION ====================

function extractFormFrameworkAware(
  html: string,
  baseUrl: URL,
  frameworks: DetectedFramework[],
  formId?: string
): { html: string; formId: string | null; method: string } | null {
  const frameworkNames = new Set(frameworks.map(f => f.name));

  // Angular Material: look for <mat-form-field> or wrapper with mat- classes
  if (frameworkNames.has('angular-material') || frameworkNames.has('angular')) {
    // Try form by Angular attribute (e.g., _ngcontent-*)
    if (formId && /^_ng/.test(formId)) {
      // Find any element with this Angular attribute marker
      const attrPattern = new RegExp(`<[^>]+\\s${escapeRegex(formId)}(?=[\\s>])[^>]*>`, 'i');
      const match = html.match(attrPattern);
      if (match) {
        const startIndex = html.indexOf(match[0]);
        const tagMatch = match[0].match(/^<(\w+)/);
        if (tagMatch) {
          const extracted = extractTagBlock(html, startIndex, tagMatch[1]);
          if (extracted) {
            return { html: convertRelativeUrls(extracted, baseUrl), formId, method: 'angular-attribute' };
          }
        }
      }
    }

    // Find Angular form components
    const angularFormSelectors = [
      /<form[^>]*_ng[^>]*>/i,
      /<[^>]*class=["'][^"']*(?:login-form|signup-form|register-form|auth-form|signin-form)[^"']*["'][^>]*>/i,
      /<mat-card[^>]*>[\s\S]*?<form/i,
    ];

    for (const pattern of angularFormSelectors) {
      const match = html.match(pattern);
      if (match) {
        const startIndex = html.indexOf(match[0]);
        // Find the ancestor container - walk up to find wrapping card/section
        const containerStart = findContainerStart(html, startIndex);
        const tagMatch = html.substring(containerStart).match(/^<(\w+)/);
        if (tagMatch) {
          const extracted = extractTagBlock(html, containerStart, tagMatch[1]);
          if (extracted && extracted.length > 100) {
            return { html: convertRelativeUrls(extracted, baseUrl), formId: null, method: 'angular-form-container' };
          }
        }
      }
    }
  }

  // MUI: look for MuiFormControl, MuiTextField wrappers
  if (frameworkNames.has('mui')) {
    const muiFormPattern = /<[^>]*class=["'][^"']*(?:MuiFormControl|MuiBox)[^"']*["'][^>]*>/i;
    const match = html.match(muiFormPattern);
    if (match) {
      // Find the parent form or container
      const formStart = html.lastIndexOf('<form', html.indexOf(match[0]));
      if (formStart !== -1) {
        const extracted = extractTagBlock(html, formStart, 'form');
        if (extracted) {
          return { html: convertRelativeUrls(extracted, baseUrl), formId: null, method: 'mui-form' };
        }
      }
    }
  }

  // Generic: try common form container patterns across all frameworks
  const genericContainerPatterns = [
    // Role-based
    /<[^>]*role=["']form["'][^>]*>/i,
    // Common class patterns for login/signup forms
    /<[^>]*class=["'][^"']*(?:login-form|signin-form|signup-form|register-form|auth-form|login-container|sign-in|sign-up)[^"']*["'][^>]*>/i,
    // Common class patterns for general forms
    /<[^>]*class=["'][^"']*(?:form-wrapper|form-container|form-section|form-content|form-panel|form-card)[^"']*["'][^>]*>/i,
    // Data attribute patterns
    /<[^>]*data-(?:form|testid=["'][^"']*form)[^>]*>/i,
  ];

  for (const pattern of genericContainerPatterns) {
    const match = html.match(pattern);
    if (match) {
      const startIndex = html.indexOf(match[0]);
      const tagMatch = match[0].match(/^<(\w+)/);
      if (tagMatch) {
        const extracted = extractTagBlock(html, startIndex, tagMatch[1]);
        if (extracted && extracted.length > 100) {
          // Verify it contains input-like elements
          if (/<input|<select|<textarea|type=["'](?:text|email|password|tel)/i.test(extracted)) {
            const idMatch = match[0].match(/id=["']([^"']+)["']/i);
            return { html: convertRelativeUrls(extracted, baseUrl), formId: idMatch?.[1] || null, method: 'generic-container' };
          }
        }
      }
    }
  }

  return null;
}

// Find the start of a container element that wraps a given position
function findContainerStart(html: string, position: number): number {
  // Look backwards for containing elements like <div>, <section>, <mat-card>, etc.
  const lookback = html.substring(Math.max(0, position - 2000), position);
  
  // Find the last opening tag of a container element
  const containerPatterns = [
    /<(?:section|article|main|mat-card|div)[^>]*class=["'][^"']*(?:card|panel|container|form|auth|login|signup|content)[^"']*["'][^>]*>/gi,
    /<(?:mat-card|mat-dialog-content)[^>]*>/gi,
  ];

  let bestStart = position;
  for (const pattern of containerPatterns) {
    let match;
    while ((match = pattern.exec(lookback)) !== null) {
      const absolutePos = Math.max(0, position - 2000) + match.index;
      if (absolutePos < bestStart) {
        bestStart = absolutePos;
      }
    }
  }

  return bestStart;
}

// ==================== FRAMEWORK ATTRIBUTE CLEANUP ====================

function cleanFrameworkAttributes(html: string, frameworks: DetectedFramework[]): string {
  const frameworkNames = new Set(frameworks.map(f => f.name));

  // Remove Angular-specific attributes that don't work outside Angular
  if (frameworkNames.has('angular') || frameworkNames.has('angular-material')) {
    // Remove _ngcontent-*, _nghost-*, ng-reflect-*, ngModel bindings, [ngModel], (click), etc.
    html = html.replace(/\s_ng(?:content|host)-[a-z0-9-]+(?:="")?/gi, '');
    html = html.replace(/\sng-reflect-[a-z-]+=["'][^"']*["']/gi, '');
    html = html.replace(/\s\[(?:ngModel|formControl|formControlName|ngClass|ngStyle|hidden)\]=["'][^"']*["']/gi, '');
    html = html.replace(/\s\((?:click|submit|change|input|focus|blur|keyup|keydown)\)=["'][^"']*["']/gi, '');
    html = html.replace(/\s\*ng(?:If|For|Switch)=["'][^"']*["']/gi, '');
    html = html.replace(/\sng-(?:class|style|if|show|hide|model|click|submit)=["'][^"']*["']/gi, '');
    // Keep ngForm and formGroup as data attributes for reference
    html = html.replace(/\s\[formGroup\]=["'][^"']*["']/gi, '');

    // Convert Angular Material components to standard HTML equivalents
    html = convertAngularMaterialToHtml(html);
  }

  // Remove React-specific attributes
  if (frameworkNames.has('react') || frameworkNames.has('mui')) {
    html = html.replace(/\sdata-reactid=["'][^"']*["']/gi, '');
    // Keep data-testid as it's useful for identification
  }

  // Remove Vue-specific attributes
  if (frameworkNames.has('vuetify')) {
    html = html.replace(/\sv-(?:model|if|show|for|on:[a-z]+|bind:[a-z]+)=["'][^"']*["']/gi, '');
    html = html.replace(/\s:(?:value|class|style|disabled|readonly)=["'][^"']*["']/gi, '');
    html = html.replace(/\s@(?:click|submit|change|input)=["'][^"']*["']/gi, '');
  }

  return html;
}

// Convert Angular Material custom elements to standard HTML
function convertAngularMaterialToHtml(html: string): string {
  // mat-form-field → div with class
  html = html.replace(/<mat-form-field([^>]*)>/gi, '<div class="mat-form-field"$1>');
  html = html.replace(/<\/mat-form-field>/gi, '</div>');

  // mat-label → label
  html = html.replace(/<mat-label([^>]*)>/gi, '<label class="mat-label"$1>');
  html = html.replace(/<\/mat-label>/gi, '</label>');

  // mat-error → span with error class
  html = html.replace(/<mat-error([^>]*)>/gi, '<span class="mat-error"$1>');
  html = html.replace(/<\/mat-error>/gi, '</span>');

  // mat-hint → span
  html = html.replace(/<mat-hint([^>]*)>/gi, '<span class="mat-hint"$1>');
  html = html.replace(/<\/mat-hint>/gi, '</span>');

  // mat-select → select
  html = html.replace(/<mat-select([^>]*)>/gi, '<select class="mat-select"$1>');
  html = html.replace(/<\/mat-select>/gi, '</select>');

  // mat-option → option
  html = html.replace(/<mat-option([^>]*)>/gi, '<option$1>');
  html = html.replace(/<\/mat-option>/gi, '</option>');

  // mat-checkbox → div with checkbox
  html = html.replace(/<mat-checkbox([^>]*)>/gi, '<label class="mat-checkbox"$1><input type="checkbox">');
  html = html.replace(/<\/mat-checkbox>/gi, '</label>');

  // mat-radio-button → label with radio
  html = html.replace(/<mat-radio-button([^>]*)>/gi, '<label class="mat-radio"$1><input type="radio">');
  html = html.replace(/<\/mat-radio-button>/gi, '</label>');

  // mat-radio-group → div
  html = html.replace(/<mat-radio-group([^>]*)>/gi, '<div class="mat-radio-group"$1>');
  html = html.replace(/<\/mat-radio-group>/gi, '</div>');

  // mat-card → div
  html = html.replace(/<mat-card([^>]*)>/gi, '<div class="mat-card"$1>');
  html = html.replace(/<\/mat-card>/gi, '</div>');

  // mat-card-content → div
  html = html.replace(/<mat-card-content([^>]*)>/gi, '<div class="mat-card-content"$1>');
  html = html.replace(/<\/mat-card-content>/gi, '</div>');

  // mat-icon → span with icon class
  html = html.replace(/<mat-icon([^>]*)>/gi, '<span class="material-icons mat-icon"$1>');
  html = html.replace(/<\/mat-icon>/gi, '</span>');

  // Convert matInput attribute to standard + class
  html = html.replace(/\smatInput/gi, ' class="mat-input-element"');

  return html;
}

// ==================== FRAMEWORK-AWARE JAVASCRIPT GENERATION ====================

function generateFrameworkAwareJs(
  html: string,
  formId: string,
  formClasses: Set<string>,
  formIds: Set<string>,
  frameworks: DetectedFramework[]
): string {
  const js: string[] = [];
  const fwNames = new Set(frameworks.map(f => f.name));

  // Extract inline scripts relevant to the form
  const sp = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let sm;
  while ((sm = sp.exec(html)) !== null) {
    const c = sm[1].trim();
    if (c && isScriptRelevantToForm(c, formId, formClasses, formIds)) js.push(c);
  }

  // Compact universal floating label + framework scripts
  js.push(`(function(){
var S='.form-floating,.mat-form-field,.mdc-text-field,.MuiFormControl-root,.input-field,.form-group,.field-wrapper,.form-field,.floating-label';
function init(){document.querySelectorAll('input,textarea,select').forEach(function(i){
var w=i.closest(S)||i.parentElement;if(!w)return;
var l=w.querySelector('label,.mat-label,.mdc-floating-label,.MuiInputLabel-root');
i.addEventListener('focus',function(){w.classList.add('focused','is-focused');if(l)l.classList.add('floating','active','shrink','MuiInputLabel-shrink');});
i.addEventListener('blur',function(){w.classList.remove('focused','is-focused');if(!i.value&&l)l.classList.remove('floating','active','shrink','MuiInputLabel-shrink');});
if(i.value&&l)l.classList.add('floating','active','shrink','MuiInputLabel-shrink');
});}init();setTimeout(init,500);setTimeout(init,1500);
document.addEventListener('submit',function(e){e.preventDefault();});
document.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();});});
document.querySelectorAll('[type=checkbox],[type=radio]').forEach(function(i){i.addEventListener('change',function(){
var l=document.querySelector('label[for=\"'+i.id+'\"]')||i.closest('label');if(l){if(i.checked)l.classList.add('checked');else l.classList.remove('checked');}});});
document.querySelectorAll('select').forEach(function(s){s.style.appearance='auto';});
})();`);

  // Angular Material: style mat-form-field containers
  if (fwNames.has('angular-material') || fwNames.has('angular')) {
    js.push(`(function(){document.querySelectorAll('.mat-form-field').forEach(function(f){
f.style.display='block';f.style.marginBottom='16px';f.style.position='relative';
var l=f.querySelector('label,.mat-label'),i=f.querySelector('input,textarea,select,.mat-input-element');
if(l&&i){l.style.cssText='position:absolute;top:50%;left:12px;transform:translateY(-50%);transition:all .15s;pointer-events:none;font-size:16px;color:rgba(0,0,0,.6)';
i.style.cssText='width:100%;padding:20px 12px 6px;font-size:16px;border:1px solid rgba(0,0,0,.23);border-radius:4px;outline:none;box-sizing:border-box;background:transparent';
i.addEventListener('focus',function(){l.style.top='6px';l.style.transform='translateY(0) scale(.75)';l.style.color='#1976d2';i.style.borderColor='#1976d2';});
i.addEventListener('blur',function(){if(!i.value){l.style.top='50%';l.style.transform='translateY(-50%) scale(1)';}l.style.color='rgba(0,0,0,.6)';i.style.borderColor='rgba(0,0,0,.23)';});
if(i.value){l.style.top='6px';l.style.transform='translateY(0) scale(.75)';}}});
document.querySelectorAll('.material-icons').forEach(function(ic){ic.style.fontFamily='Material Icons';ic.style.fontSize='24px';});})();`);
  }

  // Bootstrap floating labels
  if (fwNames.has('bootstrap')) {
    js.push(`(function(){document.querySelectorAll('.form-floating').forEach(function(c){
var i=c.querySelector('.form-control,.form-select'),l=c.querySelector('label');
if(i&&l){var fl=function(){l.style.opacity='.65';l.style.transform='scale(.85) translateY(-.5rem) translateX(.15rem)';};
var ul=function(){if(!i.value){l.style.opacity='1';l.style.transform='none';}};
i.addEventListener('focus',fl);i.addEventListener('blur',ul);if(i.value)fl();}});})();`);
  }

  return js.join('\n');
}




// ==================== ORIGINAL EXTRACTION FUNCTIONS (ENHANCED) ====================

function extractFormById(html: string, formId: string, baseUrl: URL): string | null {
  // Standard ID match
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
    // Any element with this ID
    const divPattern = new RegExp(`<[^>]*id=["']${escapeRegex(formId)}["'][^>]*>`, 'i');
    const divMatch = html.match(divPattern);
    if (divMatch) {
      startIndex = html.indexOf(divMatch[0]);
      startMatch = divMatch;
    } else {
      // Try data attributes
      const dataAttrPattern = new RegExp(`<[^>]*data-[a-z-]+=["']${escapeRegex(formId)}["'][^>]*>`, 'i');
      const dataMatch = html.match(dataAttrPattern);
      if (dataMatch) {
        startIndex = html.indexOf(dataMatch[0]);
        startMatch = dataMatch;
      } else {
        // Try name attribute
        const namePattern = new RegExp(`<form[^>]*name=["']${escapeRegex(formId)}["'][^>]*>`, 'i');
        const nameMatch = html.match(namePattern);
        if (nameMatch) {
          startIndex = html.indexOf(nameMatch[0]);
          startMatch = nameMatch;
        } else {
          // Try class name
          const classPattern = new RegExp(`<[^>]*class=["'][^"']*${escapeRegex(formId)}[^"']*["'][^>]*>`, 'i');
          const classMatch = html.match(classPattern);
          if (classMatch) {
            startIndex = html.indexOf(classMatch[0]);
            startMatch = classMatch;
          } else {
            return null;
          }
        }
      }
    }
  }

  const tagMatch = startMatch[0].match(/^<(\w+[-\w]*)/);
  if (!tagMatch) return null;

  const tagName = tagMatch[1];
  const extracted = extractTagBlock(html, startIndex, tagName);
  if (!extracted) return null;

  return convertRelativeUrls(extracted, baseUrl);
}

// Extract a complete tag block from a starting position
function extractTagBlock(html: string, startIndex: number, tagName: string): string | null {
  const openTag = html.substring(startIndex).match(new RegExp(`^<${escapeRegex(tagName)}[^>]*>`, 'i'));
  if (!openTag) return null;

  let depth = 1;
  let currentPos = startIndex + openTag[0].length;
  
  // Handle self-closing tags
  if (openTag[0].endsWith('/>')) return openTag[0];

  const openTagPattern = new RegExp(`<${escapeRegex(tagName)}[\\s>]`, 'gi');
  const closeTagPattern = new RegExp(`</${escapeRegex(tagName)}>`, 'gi');

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
    const fallbackEnd = html.indexOf(`</${tagName}>`, startIndex);
    if (fallbackEnd !== -1) {
      currentPos = fallbackEnd + `</${tagName}>`.length;
    } else {
      return null;
    }
  }

  return html.substring(startIndex, currentPos);
}

function extractFirstForm(html: string, baseUrl: URL): { html: string; formId: string | null } | null {
  const formStartPattern = /<form[^>]*>/i;
  const match = html.match(formStartPattern);
  if (!match) return null;

  const startIndex = html.indexOf(match[0]);
  const idMatch = match[0].match(/id=["']([^"']+)["']/i);
  const formId = idMatch ? idMatch[1] : null;

  const extracted = extractTagBlock(html, startIndex, 'form');
  if (!extracted) return null;

  return { html: convertRelativeUrls(extracted, baseUrl), formId };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function convertRelativeUrls(html: string, baseUrl: URL): string {
  html = html.replace(/\ssrc=["']([^"']+)["']/gi, (_match, url) => {
    const absolute = makeAbsoluteUrl(url, baseUrl);
    return ` src="${absolute}"`;
  });
  html = html.replace(/\shref=["']([^"']+)["']/gi, (match, url) => {
    if (url.startsWith('#') || url.startsWith('javascript:')) return match;
    const absolute = makeAbsoluteUrl(url, baseUrl);
    return ` href="${absolute}"`;
  });
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (_match, url) => {
    const absolute = makeAbsoluteUrl(url, baseUrl);
    return `url("${absolute}")`;
  });
  return html;
}

function extractClassesFromHtml(html: string): Set<string> {
  const classes = new Set<string>();
  const classPattern = /class=["']([^"']+)["']/gi;
  let match;
  while ((match = classPattern.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(cls => {
      if (cls.trim()) classes.add(cls.trim());
    });
  }
  return classes;
}

function extractIdsFromHtml(html: string): Set<string> {
  const ids = new Set<string>();
  const idPattern = /id=["']([^"']+)["']/gi;
  let match;
  while ((match = idPattern.exec(html)) !== null) {
    ids.add(match[1]);
  }
  return ids;
}

function extractAllFormIds(html: string): string[] {
  const ids: string[] = [];
  
  const formIdPattern = /<form[^>]*id=["']([^"']+)["']/gi;
  let match;
  while ((match = formIdPattern.exec(html)) !== null) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }

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

  const formRelatedIdPattern = /id=["']([^"']*(?:form|card|application|step|input|field|modal|dialog|panel)[^"']*)["']/gi;
  while ((match = formRelatedIdPattern.exec(html)) !== null) {
    if (match[1] && !ids.includes(match[1]) && match[1].length < 50) {
      ids.push(match[1]);
    }
  }

  return ids.slice(0, 30);
}

function extractElementTypesFromHtml(html: string): Set<string> {
  const elements = new Set<string>();
  const tagPattern = /<(\w+)[>\s]/gi;
  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    elements.add(match[1].toLowerCase());
  }
  ['input', 'label', 'button', 'select', 'textarea', 'form', 'fieldset', 'legend'].forEach(el => elements.add(el));
  return elements;
}

function filterRelevantCss(
  css: string,
  formClasses: Set<string>,
  formIds: Set<string>,
  formElements: Set<string>,
  formId: string
): string {
  const relevantRules: string[] = [];
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Always include @font-face and @import
  const fontFacePattern = /@font-face\s*\{[^}]+\}/gi;
  let fontMatch;
  while ((fontMatch = fontFacePattern.exec(css)) !== null) {
    relevantRules.push(fontMatch[0]);
  }

  const importPattern = /@import\s+[^;]+;/gi;
  let importMatch;
  while ((importMatch = importPattern.exec(css)) !== null) {
    relevantRules.push(importMatch[0]);
  }

  // Also include CSS custom property definitions (:root)
  const rootPattern = /:root\s*\{[^}]+\}/gi;
  let rootMatch;
  while ((rootMatch = rootPattern.exec(css)) !== null) {
    relevantRules.push(rootMatch[0]);
  }

  const rulePattern = /([^{}@]+)\{([^{}]+)\}/g;
  let ruleMatch;
  while ((ruleMatch = rulePattern.exec(css)) !== null) {
    const selector = ruleMatch[1].trim();
    const properties = ruleMatch[2];
    if (selector.startsWith('@')) continue;
    if (isRuleRelevant(selector, formClasses, formIds, formElements, formId)) {
      relevantRules.push(`${selector} { ${properties} }`);
    }
  }

  const mediaPattern = /@media[^{]+\{([\s\S]*?)\}\s*\}/gi;
  let mediaMatch;
  while ((mediaMatch = mediaPattern.exec(css)) !== null) {
    const mediaQuery = css.substring(mediaMatch.index, mediaMatch.index + mediaMatch[0].indexOf('{') + 1);
    const mediaContent = mediaMatch[1];
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

function isRuleRelevant(
  selector: string,
  formClasses: Set<string>,
  formIds: Set<string>,
  formElements: Set<string>,
  formId: string
): boolean {
  const selectorLower = selector.toLowerCase();
  if (selectorLower.includes(`#${formId.toLowerCase()}`)) return true;
  for (const id of formIds) {
    if (selectorLower.includes(`#${id.toLowerCase()}`)) return true;
  }
  for (const cls of formClasses) {
    if (selectorLower.includes(`.${cls.toLowerCase()}`)) return true;
  }
  for (const element of formElements) {
    const elementPattern = new RegExp(`(^|[\\s,>+~])${element}([\\s,>+~:.[#]|$)`, 'i');
    if (elementPattern.test(selector)) return true;
  }

  const formKeywords = [
    'input', 'label', 'button', 'select', 'textarea', 'form',
    'field', 'control', 'error', 'valid', 'invalid', 'focus',
    'placeholder', 'disabled', 'required', 'submit', 'checkbox',
    'radio', 'option', 'optgroup',
    // Framework-specific
    'mat-', 'mdc-', 'mui', 'ant-', 'v-input', 'v-text-field',
    'form-control', 'form-group', 'form-floating', 'input-group',
    'form-check', 'form-select', 'form-label',
  ];

  for (const keyword of formKeywords) {
    if (selectorLower.includes(keyword)) return true;
  }

  if (selector.trim() === ':root' || selector.trim() === '*') return true;

  return false;
}

function extractFormStyles(html: string, _formId: string): Record<string, string> {
  const styles: Record<string, string> = {};
  const stylePattern = /style=["']([^"']+)["']/gi;
  let match;
  while ((match = stylePattern.exec(html)) !== null) {
    const pairs = match[1].split(';');
    for (const pair of pairs) {
      const [prop, value] = pair.split(':').map(s => s.trim());
      if (prop && value) {
        styles[prop] = value;
      }
    }
  }
  return styles;
}

async function extractAllCss(html: string, baseUrl: URL): Promise<string> {
  const cssFragments: string[] = [];

  const styleTagPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagPattern.exec(html)) !== null) {
    if (styleMatch[1]) {
      cssFragments.push(convertCssUrls(styleMatch[1], baseUrl));
    }
  }

  const stylesheetUrls = new Set<string>();
  const linkPatterns = [
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/gi,
  ];

  for (const pattern of linkPatterns) {
    let linkMatch;
    while ((linkMatch = pattern.exec(html)) !== null) {
      if (linkMatch[1]) stylesheetUrls.add(linkMatch[1]);
    }
  }

  console.log(`Found ${stylesheetUrls.size} external stylesheets`);

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

function convertCssUrls(css: string, baseUrl: URL): string {
  return css.replace(/url\(["']?([^"')]+)["']?\)/gi, (_match, url) => {
    const absoluteUrl = makeAbsoluteUrl(url.trim(), baseUrl);
    return `url("${absoluteUrl}")`;
  });
}

function makeAbsoluteUrl(url: string, baseUrl: URL): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return baseUrl.origin + url;
  return baseUrl.origin + '/' + url;
}

function isScriptRelevantToForm(
  script: string,
  formId: string,
  formClasses: Set<string>,
  formIds: Set<string>
): boolean {
  const scriptLower = script.toLowerCase();
  if (scriptLower.includes(formId.toLowerCase())) return true;
  for (const id of formIds) {
    if (scriptLower.includes(id.toLowerCase())) return true;
  }
  for (const cls of formClasses) {
    if (scriptLower.includes(`.${cls.toLowerCase()}`)) return true;
    if (scriptLower.includes(`'${cls.toLowerCase()}'`)) return true;
    if (scriptLower.includes(`"${cls.toLowerCase()}"`)) return true;
  }

  const formPatterns = [
    'floating', 'label', 'focus', 'blur', 'input',
    'validate', 'error', 'field', 'form',
    'addeventlistener', 'queryselector', 'getelementby'
  ];
  let matchCount = 0;
  for (const pattern of formPatterns) {
    if (scriptLower.includes(pattern)) matchCount++;
  }
  return matchCount >= 3;
}

// Analyze form patterns
function analyzeFormPatterns(formHtml: string, formCss: string): CapturedFormPatterns {
  const htmlLower = formHtml.toLowerCase();
  const cssLower = formCss.toLowerCase();

  const hasLabels = /<label[^>]*>/i.test(formHtml);
  const labelCount = (formHtml.match(/<label/gi) || []).length;
  const inputCount = (formHtml.match(/<input(?![^>]*type=["'](?:hidden|submit|button)["'])/gi) || []).length;

  const hasFloatingLabelCss =
    /\.floating|label\.active|label\.shrink|\.has-value|\.focused\s+label|:focus\s*\+\s*label|:focus-within.*label/i.test(cssLower) ||
    /transform:\s*translatey\s*\(|transform:\s*scale\s*\(/i.test(cssLower);

  const hasFloatingLabelClasses =
    /class=["'][^"']*(?:floating|material|mdc-text-field|form-floating|float-label|mat-form-field|MuiFormControl|input-field)[^"']*["']/i.test(formHtml);

  const labelsInsideWrapper = /<div[^>]*>[\s\S]*?<input[^>]*>[\s\S]*?<label[^>]*>/i.test(formHtml) ||
    /<div[^>]*>[\s\S]*?<label[^>]*>[\s\S]*?<input[^>]*>/i.test(formHtml);

  const hasPlaceholders = /placeholder=["'][^"']+["']/i.test(formHtml);
  const placeholderCount = (formHtml.match(/placeholder=["'][^"']+["']/gi) || []).length;

  let labelStyle: LabelStyle = 'above';
  let labelPosition: 'top' | 'left' | 'inside' = 'top';

  if (!hasLabels || labelCount === 0) {
    labelStyle = hasPlaceholders ? 'placeholder-only' : 'hidden';
  } else if (hasFloatingLabelCss || hasFloatingLabelClasses) {
    labelStyle = 'floating';
    labelPosition = 'inside';
  } else if (labelsInsideWrapper && hasPlaceholders && placeholderCount >= inputCount * 0.8) {
    labelStyle = 'floating';
    labelPosition = 'inside';
  }

  const hasInlineLabels = /display:\s*(?:inline-flex|inline-block|flex).*label|label.*display:\s*(?:inline|inline-block)/i.test(cssLower) ||
    /class=["'][^"']*(?:inline|horizontal|row)[^"']*["']/i.test(formHtml);

  if (hasInlineLabels && labelStyle === 'above') {
    labelStyle = 'inline';
    labelPosition = 'left';
  }

  let fieldLayout: 'stacked' | 'inline' | 'grid' = 'stacked';
  let fieldsPerRow = 1;

  if (/display:\s*grid|grid-template-columns/i.test(cssLower)) {
    fieldLayout = 'grid';
    const gridMatch = cssLower.match(/grid-template-columns:\s*repeat\s*\(\s*(\d+)/i);
    if (gridMatch) fieldsPerRow = parseInt(gridMatch[1], 10);
  } else if (/display:\s*flex.*flex-direction:\s*row|flex-wrap:\s*wrap/i.test(cssLower)) {
    fieldLayout = 'inline';
    fieldsPerRow = 2;
  }

  let inputStyle: 'bordered' | 'underlined' | 'filled' | 'outline' = 'bordered';
  if (/border-bottom[^;]*:\s*[^n]|border-bottom-width/i.test(cssLower) &&
      !/border(?:-top|-left|-right)?[^-]/i.test(cssLower)) {
    inputStyle = 'underlined';
  } else if (/background-color:\s*(?!transparent|rgba\([^)]*,\s*0\))/i.test(cssLower) &&
             /border:\s*(?:none|0)/i.test(cssLower)) {
    inputStyle = 'filled';
  }

  let focusStyle: 'border-color' | 'shadow' | 'underline' | 'label-shrink' = 'border-color';
  if (labelStyle === 'floating') {
    focusStyle = 'label-shrink';
  } else if (/focus.*box-shadow|:focus-within.*box-shadow/i.test(cssLower)) {
    focusStyle = 'shadow';
  } else if (inputStyle === 'underlined') {
    focusStyle = 'underline';
  }

  const extractColor = (pattern: RegExp): string | undefined => {
    const match = cssLower.match(pattern);
    if (match && match[1]) {
      const originalMatch = formCss.match(new RegExp(pattern.source, 'i'));
      return originalMatch?.[1];
    }
    return undefined;
  };

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

  const detectedFontFamily = extractColor(/(?:body|form|input)[^{]*\{[^}]*font-family:\s*([^;]+)/i);
  const detectedFontSize = extractColor(/input[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i);
  const detectedLabelFontSize = extractColor(/label[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i);
  const detectedLabelFontWeight = extractColor(/label[^{]*\{[^}]*font-weight:\s*([^;}\s]+)/i);

  const detectedInputPadding = extractColor(/input[^{]*\{[^}]*padding:\s*([^;]+)/i);
  const detectedBorderRadius = extractColor(/input[^{]*\{[^}]*border-radius:\s*([^;}\s]+)/i);
  const detectedBorderWidth = extractColor(/input[^{]*\{[^}]*border(?:-width)?:\s*(\d+(?:px)?)/i);

  const hasHelperText = /class=["'][^"']*(?:helper|hint|description|help-text|supporting|mat-hint|MuiFormHelperText)[^"']*["']/i.test(formHtml) ||
    /<small[^>]*>|<span[^>]*class=["'][^"']*help/i.test(formHtml);

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
    detectedInputFontSize: detectedFontSize,
    detectedInputPadding,
    detectedHelperTextSize: undefined,
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

// ==================== FONT RESOURCE EXTRACTION ====================

function extractFontResources(html: string, allCss: string, baseUrl: URL): {
  fontLinks: string[];
  fontFaceRules: string[];
} {
  const fontLinks: string[] = [];
  const fontFaceRules: string[] = [];

  // Extract Google Fonts links
  const googleFontsPattern = /<link[^>]*href=["'](https:\/\/fonts\.googleapis\.com\/[^"']+)["'][^>]*>/gi;
  let match;
  while ((match = googleFontsPattern.exec(html)) !== null) {
    fontLinks.push(match[1]);
  }

  // Extract Google Fonts preconnect
  const gstaticPattern = /<link[^>]*href=["'](https:\/\/fonts\.gstatic\.com[^"']*)["'][^>]*>/gi;
  while ((match = gstaticPattern.exec(html)) !== null) {
    // We need gstatic preconnect for fonts to load
    if (!fontLinks.includes(match[1])) fontLinks.push(match[1]);
  }

  // Extract Adobe Fonts (Typekit) links
  const typekitPattern = /<link[^>]*href=["'](https:\/\/use\.typekit\.net\/[^"']+)["'][^>]*>/gi;
  while ((match = typekitPattern.exec(html)) !== null) {
    fontLinks.push(match[1]);
  }

  // Adobe Fonts script tags
  const typekitScriptPattern = /<script[^>]*src=["'](https:\/\/use\.typekit\.net\/[^"']+)["'][^>]*>/gi;
  while ((match = typekitScriptPattern.exec(html)) !== null) {
    fontLinks.push(match[1]);
  }

  // Extract fonts.bunny.net, fontshare, or other font CDN links
  const fontCdnPattern = /<link[^>]*href=["'](https:\/\/(?:fonts\.bunny\.net|api\.fontshare\.com|cdn\.fonts\.net|fast\.fonts\.net|cloud\.typography\.com)[^"']+)["'][^>]*>/gi;
  while ((match = fontCdnPattern.exec(html)) !== null) {
    fontLinks.push(match[1]);
  }

  // Extract all @font-face rules from CSS
  const fontFacePattern = /@font-face\s*\{[^}]+\}/gi;
  while ((match = fontFacePattern.exec(allCss)) !== null) {
    fontFaceRules.push(match[0]);
  }

  // Also check inline styles in HTML for @font-face
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    const content = block.replace(/<\/?style[^>]*>/gi, '');
    while ((match = fontFacePattern.exec(content)) !== null) {
      fontFaceRules.push(match[0]);
    }
  }

  // Deduplicate
  return {
    fontLinks: [...new Set(fontLinks)],
    fontFaceRules: [...new Set(fontFaceRules)],
  };
}

// ==================== DETAILED TYPOGRAPHY EXTRACTION ====================

function extractDetailedTypography(formHtml: string, formCss: string, allCss: string): {
  fontFamily?: string;
  fontSize?: string;
  inputFontSize?: string;
  labelFontSize?: string;
  labelFontWeight?: string;
  labelColor?: string;
  fontWeights: string[];
  fontStyles: string[];
  letterSpacing?: string;
  lineHeight?: string;
  textTransform?: string;
  labelLetterSpacing?: string;
  labelTextTransform?: string;
  labelLineHeight?: string;
  inputLetterSpacing?: string;
  buttonLetterSpacing?: string;
  buttonTextTransform?: string;
} {
  const cssToSearch = formCss + '\n' + allCss;

  // Extract font-family with priority: form-specific CSS > body > html > :root
  const fontFamilyPatterns = [
    // Form-specific
    /(?:form|\.form|#form)[^{]*\{[^}]*font-family:\s*([^;]+)/i,
    // Input-specific
    /input[^{]*\{[^}]*font-family:\s*([^;]+)/i,
    // Body
    /body[^{]*\{[^}]*font-family:\s*([^;]+)/i,
    // HTML
    /html[^{]*\{[^}]*font-family:\s*([^;]+)/i,
    // :root with CSS variable
    /:root[^{]*\{[^}]*--[a-z-]*font[a-z-]*:\s*([^;]+)/i,
    // Any font-family declaration
    /font-family:\s*([^;]+)/i,
  ];

  let fontFamily: string | undefined;
  for (const pattern of fontFamilyPatterns) {
    const match = cssToSearch.match(pattern);
    if (match?.[1]) {
      fontFamily = match[1].trim().replace(/["']/g, '').replace(/\s*!important/, '');
      break;
    }
  }

  // Also check inline styles on the form HTML for font-family
  if (!fontFamily) {
    const inlineFont = formHtml.match(/style=["'][^"']*font-family:\s*([^;"']+)/i);
    if (inlineFont?.[1]) fontFamily = inlineFont[1].trim();
  }

  // Extract all unique font weights used
  const fontWeights = new Set<string>();
  const fwPattern = /font-weight:\s*([^;}\s]+)/gi;
  let fwMatch;
  while ((fwMatch = fwPattern.exec(formCss)) !== null) {
    fontWeights.add(fwMatch[1].trim());
  }

  // Extract font styles (italic, etc.)
  const fontStyles = new Set<string>();
  const fsPattern = /font-style:\s*([^;}\s]+)/gi;
  let fsMatch;
  while ((fsMatch = fsPattern.exec(formCss)) !== null) {
    fontStyles.add(fsMatch[1].trim());
  }

  // Extract specific typography properties
  const extract = (pattern: RegExp): string | undefined => {
    const m = formCss.match(pattern) || cssToSearch.match(pattern);
    return m?.[1]?.trim();
  };

  return {
    fontFamily,
    fontSize: extract(/input[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i) || extract(/body[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i),
    inputFontSize: extract(/input[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i),
    labelFontSize: extract(/label[^{]*\{[^}]*font-size:\s*([^;}\s]+)/i),
    labelFontWeight: extract(/label[^{]*\{[^}]*font-weight:\s*([^;}\s]+)/i),
    labelColor: extract(/label[^{]*\{[^}]*(?<!background-)color:\s*([^;}\s]+)/i),
    fontWeights: [...fontWeights],
    fontStyles: [...fontStyles],
    letterSpacing: extract(/input[^{]*\{[^}]*letter-spacing:\s*([^;}\s]+)/i) || extract(/body[^{]*\{[^}]*letter-spacing:\s*([^;}\s]+)/i),
    lineHeight: extract(/input[^{]*\{[^}]*line-height:\s*([^;}\s]+)/i) || extract(/body[^{]*\{[^}]*line-height:\s*([^;}\s]+)/i),
    textTransform: extract(/input[^{]*\{[^}]*text-transform:\s*([^;}\s]+)/i),
    labelLetterSpacing: extract(/label[^{]*\{[^}]*letter-spacing:\s*([^;}\s]+)/i),
    labelTextTransform: extract(/label[^{]*\{[^}]*text-transform:\s*([^;}\s]+)/i),
    labelLineHeight: extract(/label[^{]*\{[^}]*line-height:\s*([^;}\s]+)/i),
    inputLetterSpacing: extract(/input[^{]*\{[^}]*letter-spacing:\s*([^;}\s]+)/i),
    buttonLetterSpacing: extract(/button[^{]*\{[^}]*letter-spacing:\s*([^;}\s]+)/i),
    buttonTextTransform: extract(/button[^{]*\{[^}]*text-transform:\s*([^;}\s]+)/i),
  };
}
