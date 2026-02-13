const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractedFormStyles {
  // Typography - be very specific
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
  
  // Label styling - detailed
  labelColor: string;
  labelFontSize: string;
  labelFontWeight: string;
  labelFontFamily: string;
  labelPosition: 'above' | 'floating' | 'inline' | 'placeholder-only' | 'hidden';
  labelMarginBottom: string;
  labelTextTransform: string;
  
  // Error/validation styling
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
  
  // Container styling
  containerBgColor: string;
  containerBorderRadius: string;
  containerShadow: string;
}

interface ExtractedFormContent {
  // Sample placeholder text detected in fields
  placeholders: Array<{
    fieldType: string;
    placeholderText: string;
  }>;
  
  // Sample label text detected
  labels: Array<{
    fieldType: string;
    labelText: string;
  }>;
  
  // Button text
  buttonTexts: string[];
  
  // Helper/description text patterns
  helperTextExamples: string[];
  
  // Form title if visible
  formTitle: string | null;
  
  // Field types detected (email, phone, name, address, etc.)
  detectedFieldTypes: string[];
  
  // Layout pattern
  layoutPattern: 'single-column' | 'two-column' | 'multi-column' | 'inline';
  fieldsPerRow: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing form screenshot with enhanced AI vision...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert UI/UX designer, CSS specialist, and TYPOGRAPHY EXPERT. When analyzing form screenshots, you must extract PRECISE styling information with extreme accuracy. 

KEY REQUIREMENTS:
1. FONT IDENTIFICATION (CRITICAL - be extremely precise):
   - Look carefully at letterforms, x-height, ascender/descender proportions, terminal styles, aperture widths
   - Common sans-serif fonts to distinguish between:
     * Inter: Slightly tall x-height, open apertures, distinct lowercase 'a' with curved tail, 'l' has slight curve at bottom
     * Roboto: Mechanical skeleton with friendly curves, wider than Inter, distinctive 'R' with curved leg
     * Open Sans: Humanist design, generous x-height, open letterforms, slightly rounded
     * Lato: Semi-rounded details, warm, slightly condensed compared to Open Sans
     * Montserrat: Geometric, larger x-height, based on urban typography, wider 'e' and 'a'
     * Helvetica/Arial: Neo-grotesque, horizontal stroke terminals, narrow apertures
     * SF Pro / -apple-system: Apple's system font, similar to Helvetica but with larger x-height
     * Segoe UI: Microsoft's UI font, humanist design, slightly narrower than Open Sans
     * Source Sans Pro: Adobe's first open source, clean readability, distinct 'i' dot
     * Nunito: Rounded terminal, friendly, balanced proportions
     * Poppins: Geometric, circular letterforms, even stroke width
     * DM Sans: Low contrast, geometric, slightly playful
     * Plus Jakarta Sans: Modern geometric, slightly squarish proportions
     * Figtree: Friendly geometric, open counters
   - Common serif fonts: Georgia, Times New Roman, Merriweather, Playfair Display, Lora, PT Serif
   - Monospace: JetBrains Mono, Fira Code, SF Mono, Consolas, Monaco
   - ALWAYS provide fallback stack (e.g., "Inter, -apple-system, BlinkMacSystemFont, sans-serif")
   - If uncertain between 2-3 fonts, describe visual characteristics: "Geometric sans-serif with rounded terminals, most likely Nunito or DM Sans"

2. FONT SIZES: Provide exact pixel values based on visual proportions
3. FONT WEIGHT: Be precise - 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
4. LETTER SPACING: Note if text appears tightly or loosely spaced (e.g., "-0.01em", "0.05em", "normal")
5. LINE HEIGHT: Estimate based on vertical spacing between text lines
6. TEXT TRANSFORM: Note uppercase, capitalize, or normal case usage in labels and buttons
7. TEXT DECORATION: Note any underline, strikethrough, etc.

8. LABEL POSITIONING: Identify exactly how labels are displayed:
   - "above": Labels sit above inputs with clear separation
   - "floating": Labels animate/float when input is focused
   - "inline": Labels sit to the left of inputs
   - "placeholder-only": No visible labels, only placeholder text
   - "hidden": No labels or placeholders visible

9. PLACEHOLDER TEXT: Read and transcribe exact placeholder text
10. COLORS: Extract exact hex color codes. Be precise - #f5f5f5 is different from #ffffff
11. SPACING: Estimate padding and margins in pixels
12. BUTTON STYLING: Note everything - background, text color, border-radius, padding, shadow, text transform
13. LAYOUT: Single column? Two column? Inline fields?`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this form screenshot with EXTREME PRECISION. Focus especially on TYPOGRAPHY:

1. The EXACT font family - look at letter shapes, terminals, x-height. Compare to known web fonts.
2. EXACT font weights for labels, inputs, buttons, headings (use numeric values: 300, 400, 500, 600, 700)
3. EXACT font sizes in pixels for every text element
4. Letter spacing - tight, normal, or loose? Provide em or px values
5. Line height for multi-line text
6. Text transform (uppercase labels? capitalized buttons?)
7. Text decoration (underlined links?)
8. Font style (any italic text?)
9. All colors as precise hex codes
10. Label positioning relative to inputs
11. All placeholder text and label text verbatim
12. Button text and complete styling
13. Layout pattern
14. Any helper text or descriptions

This will be used to replicate the EXACT form design including pixel-perfect typography.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/png'};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_detailed_form_styles',
              description: 'Extract comprehensive form styling and content from the analyzed screenshot',
              parameters: {
                type: 'object',
                properties: {
                  // Typography
                  fontFamily: {
                    type: 'string',
                    description: 'Exact font family name with fallbacks (e.g., "Inter, -apple-system, sans-serif" or "Roboto, Arial, sans-serif"). Be specific!',
                  },
                  fontSize: {
                    type: 'string',
                    description: 'Base input text font size in pixels (e.g., "16px", "14px")',
                  },
                  fontWeight: {
                    type: 'string',
                    description: 'Input text font weight (e.g., "400", "normal", "500")',
                  },
                  lineHeight: {
                    type: 'string',
                    description: 'Line height (e.g., "1.5", "24px", "normal")',
                  },
                  letterSpacing: {
                    type: 'string',
                    description: 'Letter spacing (e.g., "normal", "0.5px", "-0.01em")',
                  },
                  
                  // Input styling
                  inputBgColor: {
                    type: 'string',
                    description: 'Input background color as hex (e.g., "#ffffff", "#f5f5f5")',
                  },
                  inputTextColor: {
                    type: 'string',
                    description: 'Input text color as hex',
                  },
                  inputBorderColor: {
                    type: 'string',
                    description: 'Input border color as hex',
                  },
                  inputBorderWidth: {
                    type: 'string',
                    description: 'Border width (e.g., "1px", "2px")',
                  },
                  inputBorderRadius: {
                    type: 'string',
                    description: 'Border radius in pixels or description (e.g., "4px", "8px", "0px", "full")',
                  },
                  inputPadding: {
                    type: 'string',
                    description: 'Input padding (e.g., "12px 16px", "10px")',
                  },
                  inputHeight: {
                    type: 'string',
                    description: 'Input height if determinable (e.g., "40px", "48px", "auto")',
                  },
                  inputFocusBorderColor: {
                    type: 'string',
                    description: 'Border color on focus as hex (often a brand/accent color)',
                  },
                  inputFocusBoxShadow: {
                    type: 'string',
                    description: 'Box shadow on focus (e.g., "0 0 0 3px rgba(59, 130, 246, 0.1)", "none")',
                  },
                  inputPlaceholderColor: {
                    type: 'string',
                    description: 'Placeholder text color as hex',
                  },
                  
                  // Label styling
                  labelColor: {
                    type: 'string',
                    description: 'Label text color as hex',
                  },
                  labelFontSize: {
                    type: 'string',
                    description: 'Label font size in pixels (e.g., "12px", "14px")',
                  },
                  labelFontWeight: {
                    type: 'string',
                    description: 'Label font weight (e.g., "500", "600", "medium", "semibold")',
                  },
                  labelFontFamily: {
                    type: 'string',
                    description: 'Label font family if different from input (otherwise same as fontFamily)',
                  },
                  labelPosition: {
                    type: 'string',
                    enum: ['above', 'floating', 'inline', 'placeholder-only', 'hidden'],
                    description: 'How labels are positioned: above inputs, floating animation, inline/left of inputs, only placeholder text, or hidden',
                  },
                  labelMarginBottom: {
                    type: 'string',
                    description: 'Space between label and input (e.g., "4px", "8px")',
                  },
                  labelTextTransform: {
                    type: 'string',
                    description: 'Text transform (e.g., "none", "uppercase", "capitalize")',
                  },
                  
                  // Error styling
                  errorColor: {
                    type: 'string',
                    description: 'Error/validation text color as hex (typically red)',
                  },
                  
                  // Button styling
                  buttonBgColor: {
                    type: 'string',
                    description: 'Button background color as hex',
                  },
                  buttonTextColor: {
                    type: 'string',
                    description: 'Button text color as hex',
                  },
                  buttonBorderRadius: {
                    type: 'string',
                    description: 'Button border radius (e.g., "4px", "8px", "full")',
                  },
                  buttonPadding: {
                    type: 'string',
                    description: 'Button padding (e.g., "12px 24px")',
                  },
                  buttonFontWeight: {
                    type: 'string',
                    description: 'Button font weight (e.g., "500", "600", "bold")',
                  },
                  buttonFontSize: {
                    type: 'string',
                    description: 'Button font size (e.g., "14px", "16px")',
                  },
                  buttonTextTransform: {
                    type: 'string',
                    description: 'Button text transform (e.g., "none", "uppercase")',
                  },
                  buttonBorderWidth: {
                    type: 'string',
                    description: 'Button border width (e.g., "0", "1px", "2px")',
                  },
                  buttonBorderColor: {
                    type: 'string',
                    description: 'Button border color as hex',
                  },
                  buttonShadow: {
                    type: 'string',
                    description: 'Button box shadow (e.g., "none", "0 2px 4px rgba(0,0,0,0.1)")',
                  },
                  
                  // Spacing
                  fieldSpacing: {
                    type: 'string',
                    description: 'Vertical space between form fields (e.g., "16px", "20px", "24px")',
                  },
                  formPadding: {
                    type: 'string',
                    description: 'Form container padding (e.g., "24px", "32px")',
                  },
                  
                  // Container
                  containerBgColor: {
                    type: 'string',
                    description: 'Form container background color as hex',
                  },
                  containerBorderRadius: {
                    type: 'string',
                    description: 'Form container border radius',
                  },
                  containerShadow: {
                    type: 'string',
                    description: 'Form container box shadow',
                  },
                  
                  // Content extraction
                  placeholders: {
                    type: 'array',
                    description: 'All placeholder text visible in input fields',
                    items: {
                      type: 'object',
                      properties: {
                        fieldType: { type: 'string', description: 'Type of field (email, phone, name, etc.)' },
                        placeholderText: { type: 'string', description: 'Exact placeholder text shown' },
                      },
                    },
                  },
                  labels: {
                    type: 'array',
                    description: 'All label text visible',
                    items: {
                      type: 'object',
                      properties: {
                        fieldType: { type: 'string', description: 'Type of field' },
                        labelText: { type: 'string', description: 'Exact label text' },
                      },
                    },
                  },
                  buttonTexts: {
                    type: 'array',
                    description: 'All button text visible (e.g., ["Submit", "Continue", "Next"])',
                    items: { type: 'string' },
                  },
                  helperTextExamples: {
                    type: 'array',
                    description: 'Any helper/description text under fields',
                    items: { type: 'string' },
                  },
                  formTitle: {
                    type: 'string',
                    description: 'Form title/heading if visible',
                  },
                  detectedFieldTypes: {
                    type: 'array',
                    description: 'Types of fields detected (email, password, phone, firstName, lastName, address, etc.)',
                    items: { type: 'string' },
                  },
                  layoutPattern: {
                    type: 'string',
                    enum: ['single-column', 'two-column', 'multi-column', 'inline'],
                    description: 'Overall form layout pattern',
                  },
                  fieldsPerRow: {
                    type: 'number',
                    description: 'Number of fields per row (1 for single column, 2 for two column, etc.)',
                  },
                },
                required: [
                  'fontFamily', 'fontSize', 'inputBgColor', 'inputTextColor', 'inputBorderColor',
                  'inputBorderRadius', 'labelColor', 'labelFontSize', 'labelPosition',
                  'buttonBgColor', 'buttonTextColor', 'layoutPattern'
                ],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_detailed_form_styles' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_detailed_form_styles') {
      console.error('No valid tool call in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: 'AI could not extract form styles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted detailed form data:', extractedData);

    // Separate styles from content
    const styles: ExtractedFormStyles = {
      fontFamily: extractedData.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: extractedData.fontSize || '16px',
      fontWeight: extractedData.fontWeight || '400',
      lineHeight: extractedData.lineHeight || '1.5',
      letterSpacing: extractedData.letterSpacing || 'normal',
      inputBgColor: extractedData.inputBgColor || '#ffffff',
      inputTextColor: extractedData.inputTextColor || '#333333',
      inputBorderColor: extractedData.inputBorderColor || '#cccccc',
      inputBorderWidth: extractedData.inputBorderWidth || '1px',
      inputBorderRadius: extractedData.inputBorderRadius || '4px',
      inputPadding: extractedData.inputPadding || '12px',
      inputHeight: extractedData.inputHeight || 'auto',
      inputFocusBorderColor: extractedData.inputFocusBorderColor || extractedData.buttonBgColor || '#3b82f6',
      inputFocusBoxShadow: extractedData.inputFocusBoxShadow || 'none',
      inputPlaceholderColor: extractedData.inputPlaceholderColor || '#9ca3af',
      labelColor: extractedData.labelColor || '#374151',
      labelFontSize: extractedData.labelFontSize || '14px',
      labelFontWeight: extractedData.labelFontWeight || '500',
      labelFontFamily: extractedData.labelFontFamily || extractedData.fontFamily || 'Inter, system-ui, sans-serif',
      labelPosition: extractedData.labelPosition || 'above',
      labelMarginBottom: extractedData.labelMarginBottom || '4px',
      labelTextTransform: extractedData.labelTextTransform || 'none',
      errorColor: extractedData.errorColor || '#ef4444',
      buttonBgColor: extractedData.buttonBgColor || '#3b82f6',
      buttonTextColor: extractedData.buttonTextColor || '#ffffff',
      buttonBorderRadius: extractedData.buttonBorderRadius || '4px',
      buttonPadding: extractedData.buttonPadding || '12px 24px',
      buttonFontWeight: extractedData.buttonFontWeight || '600',
      buttonFontSize: extractedData.buttonFontSize || '16px',
      buttonTextTransform: extractedData.buttonTextTransform || 'none',
      buttonBorderWidth: extractedData.buttonBorderWidth || '0',
      buttonBorderColor: extractedData.buttonBorderColor || 'transparent',
      buttonShadow: extractedData.buttonShadow || 'none',
      fieldSpacing: extractedData.fieldSpacing || '16px',
      formPadding: extractedData.formPadding || '24px',
      containerBgColor: extractedData.containerBgColor || '#ffffff',
      containerBorderRadius: extractedData.containerBorderRadius || '8px',
      containerShadow: extractedData.containerShadow || 'none',
    };

    const content: ExtractedFormContent = {
      placeholders: extractedData.placeholders || [],
      labels: extractedData.labels || [],
      buttonTexts: extractedData.buttonTexts || [],
      helperTextExamples: extractedData.helperTextExamples || [],
      formTitle: extractedData.formTitle || null,
      detectedFieldTypes: extractedData.detectedFieldTypes || [],
      layoutPattern: extractedData.layoutPattern || 'single-column',
      fieldsPerRow: extractedData.fieldsPerRow || 1,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          styles,
          content,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing form screenshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze screenshot';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
