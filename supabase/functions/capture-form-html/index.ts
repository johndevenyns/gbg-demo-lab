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

    console.log('Analyzing form display patterns...');
    const patterns = analyzeFormPatterns(formHtml, relevantCss);
    patterns.detectedFrameworks = detectedFrameworks;
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
  const jsFragments: string[] = [];
  const frameworkNames = new Set(frameworks.map(f => f.name));

  // First, extract inline scripts relevant to the form
  const scriptPattern = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    const scriptContent = scriptMatch[1].trim();
    if (!scriptContent) continue;
    if (isScriptRelevantToForm(scriptContent, formId, formClasses, formIds)) {
      jsFragments.push(scriptContent);
    }
  }

  // Generate framework-specific interaction handlers

  // Universal floating label support
  jsFragments.push(generateUniversalFloatingLabelScript());

  // Angular Material-specific
  if (frameworkNames.has('angular-material') || frameworkNames.has('angular')) {
    jsFragments.push(generateAngularMaterialScript());
  }

  // Bootstrap-specific
  if (frameworkNames.has('bootstrap')) {
    jsFragments.push(generateBootstrapScript());
  }

  // MUI-specific
  if (frameworkNames.has('mui')) {
    jsFragments.push(generateMUIScript());
  }

  // Materialize-specific
  if (frameworkNames.has('materialize')) {
    jsFragments.push(generateMaterializeScript());
  }

  // Universal form enhancement (works across all frameworks)
  jsFragments.push(generateUniversalFormScript());

  return jsFragments.join('\n\n');
}

function generateUniversalFloatingLabelScript(): string {
  return `
// Universal Floating Label Support
(function() {
  const selectors = [
    // Bootstrap 5
    '.form-floating > .form-control, .form-floating > .form-select',
    // Material Design / Angular Material
    '.mat-form-field input, .mat-form-field textarea, .mat-form-field select',
    '.mdc-text-field__input',
    '.mdc-floating-label',
    // MUI
    '.MuiInputBase-input, .MuiInput-input, .MuiOutlinedInput-input, .MuiFilledInput-input',
    // Materialize
    '.input-field input, .input-field textarea',
    // Generic floating patterns
    '.floating-label input, .float-label input',
    '[data-floating-label] input',
    // Any input inside a wrapper that has a label sibling
    '.form-group input, .field-wrapper input, .input-wrapper input, .form-field input',
  ];

  function initFloatingLabels() {
    const allInputs = document.querySelectorAll(selectors.join(', '));
    
    allInputs.forEach(function(input) {
      const wrapper = input.closest('.form-floating, .mat-form-field, .mdc-text-field, .MuiFormControl-root, .input-field, .form-group, .field-wrapper, .input-wrapper, .form-field, .floating-label, .float-label') || input.parentElement;
      if (!wrapper) return;
      
      const label = wrapper.querySelector('label, .mat-label, .mdc-floating-label, .MuiInputLabel-root, .MuiFormLabel-root');
      
      function activate() {
        wrapper.classList.add('focused', 'has-focus', 'is-focused', 'mat-focused', 'mdc-text-field--focused', 'Mui-focused');
        if (label) label.classList.add('floating', 'active', 'shrink', 'label-active', 'mdc-floating-label--float-above', 'MuiInputLabel-shrink', 'MuiFormLabel-filled');
      }
      
      function deactivate() {
        wrapper.classList.remove('focused', 'has-focus', 'is-focused', 'mat-focused', 'mdc-text-field--focused', 'Mui-focused');
        if (!input.value && !input.placeholder) {
          if (label) label.classList.remove('floating', 'active', 'shrink', 'label-active', 'mdc-floating-label--float-above', 'MuiInputLabel-shrink');
        }
      }
      
      input.addEventListener('focus', activate);
      input.addEventListener('blur', deactivate);
      
      // Initialize state for pre-filled inputs
      if (input.value) activate();
    });
  }

  // Run now and also after a delay for dynamic content
  initFloatingLabels();
  setTimeout(initFloatingLabels, 500);
  setTimeout(initFloatingLabels, 1500);
})();
`.trim();
}

function generateAngularMaterialScript(): string {
  return `
// Angular Material Compatibility Layer
(function() {
  // Style mat-form-field containers
  document.querySelectorAll('.mat-form-field').forEach(function(field) {
    field.style.display = 'block';
    field.style.marginBottom = '16px';
    field.style.position = 'relative';
    
    const label = field.querySelector('label, .mat-label');
    const input = field.querySelector('input, textarea, select, .mat-input-element');
    
    if (label && input) {
      // Position label for floating effect
      label.style.position = 'absolute';
      label.style.top = '50%';
      label.style.left = '12px';
      label.style.transform = 'translateY(-50%)';
      label.style.transition = 'all 0.15s ease';
      label.style.pointerEvents = 'none';
      label.style.fontSize = '16px';
      label.style.color = 'rgba(0,0,0,0.6)';
      
      // Style the input
      input.style.width = '100%';
      input.style.padding = '20px 12px 6px';
      input.style.fontSize = '16px';
      input.style.border = '1px solid rgba(0,0,0,0.23)';
      input.style.borderRadius = '4px';
      input.style.outline = 'none';
      input.style.boxSizing = 'border-box';
      input.style.backgroundColor = 'transparent';
      
      function floatLabel() {
        label.style.top = '6px';
        label.style.transform = 'translateY(0) scale(0.75)';
        label.style.transformOrigin = 'top left';
        label.style.color = '#1976d2';
        input.style.borderColor = '#1976d2';
        input.style.borderWidth = '2px';
      }
      
      function unfloatLabel() {
        if (!input.value) {
          label.style.top = '50%';
          label.style.transform = 'translateY(-50%) scale(1)';
        }
        label.style.color = 'rgba(0,0,0,0.6)';
        input.style.borderColor = 'rgba(0,0,0,0.23)';
        input.style.borderWidth = '1px';
      }
      
      input.addEventListener('focus', floatLabel);
      input.addEventListener('blur', unfloatLabel);
      if (input.value) floatLabel();
    }
  });
  
  // Style Material Icons
  document.querySelectorAll('.material-icons').forEach(function(icon) {
    icon.style.fontFamily = 'Material Icons';
    icon.style.fontSize = '24px';
    icon.style.verticalAlign = 'middle';
  });
})();
`.trim();
}

function generateBootstrapScript(): string {
  return `
// Bootstrap Form Enhancement
(function() {
  // Handle Bootstrap 5 floating labels
  document.querySelectorAll('.form-floating').forEach(function(container) {
    const input = container.querySelector('.form-control, .form-select');
    const label = container.querySelector('label');
    if (input && label) {
      input.addEventListener('focus', function() {
        label.style.opacity = '0.65';
        label.style.transform = 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)';
      });
      input.addEventListener('blur', function() {
        if (!input.value) {
          label.style.opacity = '1';
          label.style.transform = 'none';
        }
      });
      if (input.value) {
        label.style.opacity = '0.65';
        label.style.transform = 'scale(0.85) translateY(-0.5rem) translateX(0.15rem)';
      }
    }
  });
  
  // Handle Bootstrap validation states
  document.querySelectorAll('.was-validated .form-control, .is-invalid, .is-valid').forEach(function(input) {
    if (input.classList.contains('is-invalid')) {
      input.style.borderColor = '#dc3545';
    } else if (input.classList.contains('is-valid')) {
      input.style.borderColor = '#198754';
    }
  });
  
  // Handle input-group addons
  document.querySelectorAll('.input-group').forEach(function(group) {
    group.style.display = 'flex';
    group.style.alignItems = 'stretch';
    const prepend = group.querySelector('.input-group-text');
    if (prepend) {
      prepend.style.display = 'flex';
      prepend.style.alignItems = 'center';
      prepend.style.padding = '6px 12px';
      prepend.style.backgroundColor = '#e9ecef';
      prepend.style.border = '1px solid #ced4da';
      prepend.style.borderRadius = '4px 0 0 4px';
    }
  });
})();
`.trim();
}

function generateMUIScript(): string {
  return `
// MUI (Material UI) Compatibility Layer
(function() {
  document.querySelectorAll('.MuiFormControl-root, [class*="MuiTextField"]').forEach(function(field) {
    const input = field.querySelector('input, textarea, select');
    const label = field.querySelector('.MuiInputLabel-root, .MuiFormLabel-root, label');
    
    if (input && label) {
      // MUI outlined variant floating label
      input.addEventListener('focus', function() {
        label.classList.add('MuiInputLabel-shrink', 'Mui-focused');
        field.classList.add('Mui-focused');
        const fieldset = field.querySelector('fieldset');
        if (fieldset) fieldset.style.borderColor = '#1976d2';
      });
      
      input.addEventListener('blur', function() {
        label.classList.remove('Mui-focused');
        field.classList.remove('Mui-focused');
        if (!input.value) {
          label.classList.remove('MuiInputLabel-shrink');
        }
        const fieldset = field.querySelector('fieldset');
        if (fieldset) fieldset.style.borderColor = 'rgba(0,0,0,0.23)';
      });
      
      if (input.value) {
        label.classList.add('MuiInputLabel-shrink', 'MuiFormLabel-filled');
      }
    }
  });
})();
`.trim();
}

function generateMaterializeScript(): string {
  return `
// Materialize CSS Compatibility Layer
(function() {
  document.querySelectorAll('.input-field').forEach(function(field) {
    const input = field.querySelector('input, textarea');
    const label = field.querySelector('label');
    
    if (input && label) {
      label.style.position = 'absolute';
      label.style.top = '0';
      label.style.left = '0';
      label.style.transition = 'all 0.2s ease';
      label.style.pointerEvents = 'none';
      
      input.addEventListener('focus', function() {
        label.classList.add('active');
        label.style.transform = 'translateY(-14px) scale(0.8)';
        label.style.color = '#26a69a';
      });
      
      input.addEventListener('blur', function() {
        if (!input.value) {
          label.classList.remove('active');
          label.style.transform = 'none';
          label.style.color = '#9e9e9e';
        }
      });
      
      if (input.value) {
        label.classList.add('active');
        label.style.transform = 'translateY(-14px) scale(0.8)';
      }
    }
  });
})();
`.trim();
}

function generateUniversalFormScript(): string {
  return `
// Universal Form Enhancement
(function() {
  // Prevent actual form submission
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Form submission prevented in preview mode');
  });
  
  // Handle password visibility toggles
  document.querySelectorAll('[data-toggle="password"], .password-toggle, .toggle-password, [type="password"] + button, [type="password"] + span').forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      const wrapper = toggle.closest('.form-group, .input-group, .field-wrapper, .password-field') || toggle.parentElement;
      const input = wrapper ? wrapper.querySelector('input[type="password"], input[type="text"]') : null;
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });
  
  // Handle custom select dropdowns
  document.querySelectorAll('select').forEach(function(select) {
    select.style.appearance = 'auto';
    select.style.webkitAppearance = 'auto';
  });
  
  // Handle checkbox and radio visual states
  document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(function(input) {
    input.addEventListener('change', function() {
      const label = document.querySelector('label[for="' + input.id + '"]') || input.closest('label');
      if (label) {
        if (input.checked) {
          label.classList.add('checked', 'is-checked', 'active');
        } else {
          label.classList.remove('checked', 'is-checked', 'active');
        }
      }
    });
  });

  // Ensure all links are non-functional in preview
  document.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
    });
  });
})();
`.trim();
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
