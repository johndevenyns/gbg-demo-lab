import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authentication
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { originalScreenshot, renderedScreenshot, currentCss, mimeType } = await req.json();

    if (!originalScreenshot || !renderedScreenshot) {
      return new Response(
        JSON.stringify({ success: false, error: 'Both original and rendered screenshots are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Comparing form screenshots...');
    const mime = mimeType || 'image/png';

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
            content: `You are an expert CSS developer specializing in pixel-perfect form replication. You will be shown two images:
1. The ORIGINAL form (the target to match)
2. The RENDERED form (the current reproduction attempt)

Your job is to identify ALL visual differences and provide CSS fixes. Focus on:
- Font family, size, weight, color, letter-spacing, line-height, text-transform
- Input field styling: background, borders, padding, height, border-radius
- Label positioning, color, size, weight
- Button styling: background, text, border-radius, padding, shadow
- Spacing between fields, margins, padding
- Container background, borders, shadows
- Color accuracy (exact hex values)
- Layout: alignment, width, grid/flex properties

Be extremely precise with CSS values. Output ONLY CSS that needs to be ADDED or CHANGED to make the rendered form match the original.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Compare these two form images. The first is the ORIGINAL (target), the second is our RENDERED version. Identify every visual difference and provide CSS corrections.

Current CSS being applied:
\`\`\`css
${(currentCss || '').substring(0, 3000)}
\`\`\`

Provide corrections as a JSON object with:
- cssFixe: A complete CSS string with corrective rules to add/override
- differences: Array of specific differences found (max 15)
- matchScore: Estimated visual match percentage (0-100)
- fontFix: If font doesn't match, the exact font-family declaration needed
- colorFixes: Object mapping element types to corrected hex colors`
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mime};base64,${originalScreenshot}` },
              },
              {
                type: 'image_url',
                image_url: { url: `data:${mime};base64,${renderedScreenshot}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_form_comparison',
              description: 'Report the visual comparison results and CSS fixes',
              parameters: {
                type: 'object',
                properties: {
                  matchScore: {
                    type: 'number',
                    description: 'Visual match percentage 0-100. 100 = identical.',
                  },
                  differences: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        element: { type: 'string', description: 'What element differs (e.g. "input fields", "submit button", "labels")' },
                        issue: { type: 'string', description: 'What is wrong (e.g. "font is Arial instead of Roboto", "border-radius too large")' },
                        severity: { type: 'string', enum: ['critical', 'major', 'minor'], description: 'How noticeable the difference is' },
                      },
                      required: ['element', 'issue', 'severity'],
                    },
                    description: 'List of visual differences found',
                  },
                  cssFixes: {
                    type: 'string',
                    description: 'Complete CSS string with all corrective rules. Use specific selectors. Include @import for Google Fonts if needed.',
                  },
                  fontFix: {
                    type: 'object',
                    properties: {
                      fontFamily: { type: 'string', description: 'Correct font-family value with fallbacks' },
                      googleFontsUrl: { type: 'string', description: 'Google Fonts URL to import, if applicable (e.g. https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap)' },
                    },
                    description: 'Font correction if fonts dont match',
                  },
                  colorFixes: {
                    type: 'object',
                    properties: {
                      inputBg: { type: 'string' },
                      inputBorder: { type: 'string' },
                      inputText: { type: 'string' },
                      labelColor: { type: 'string' },
                      buttonBg: { type: 'string' },
                      buttonText: { type: 'string' },
                      containerBg: { type: 'string' },
                      placeholderColor: { type: 'string' },
                      errorColor: { type: 'string' },
                    },
                    description: 'Corrected colors as hex values. Only include colors that need changing.',
                  },
                  typographyFixes: {
                    type: 'object',
                    properties: {
                      inputFontSize: { type: 'string' },
                      inputFontWeight: { type: 'string' },
                      inputLetterSpacing: { type: 'string' },
                      inputLineHeight: { type: 'string' },
                      labelFontSize: { type: 'string' },
                      labelFontWeight: { type: 'string' },
                      labelLetterSpacing: { type: 'string' },
                      labelTextTransform: { type: 'string' },
                      buttonFontSize: { type: 'string' },
                      buttonFontWeight: { type: 'string' },
                      buttonTextTransform: { type: 'string' },
                      buttonLetterSpacing: { type: 'string' },
                    },
                    description: 'Typography corrections. Only include values that need changing.',
                  },
                  spacingFixes: {
                    type: 'object',
                    properties: {
                      fieldSpacing: { type: 'string', description: 'Gap between form fields' },
                      inputPadding: { type: 'string', description: 'Input internal padding' },
                      inputHeight: { type: 'string', description: 'Input height' },
                      buttonPadding: { type: 'string', description: 'Button padding' },
                      formPadding: { type: 'string', description: 'Form container padding' },
                      labelMarginBottom: { type: 'string', description: 'Space between label and input' },
                    },
                    description: 'Spacing corrections. Only include values that need changing.',
                  },
                },
                required: ['matchScore', 'differences', 'cssFixes'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'report_form_comparison' } },
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
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI comparison failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'report_form_comparison') {
      console.error('Unexpected AI response format');
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned unexpected response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error('Failed to parse AI tool arguments');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI comparison results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Comparison complete: ${result.matchScore}% match, ${result.differences?.length || 0} differences`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error comparing forms:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Comparison failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
