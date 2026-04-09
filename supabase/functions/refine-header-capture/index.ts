import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { originalScreenshot, capturedHeaderHtml, capturedFooterHtml, capturedCss, sourceUrl } = await req.json();

    if (!originalScreenshot) {
      return new Response(
        JSON.stringify({ success: false, error: 'Original site screenshot is required' }),
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

    console.log('Refining header capture with AI vision...');
    console.log('Header HTML length:', capturedHeaderHtml?.length || 0);
    console.log('Footer HTML length:', capturedFooterHtml?.length || 0);

    // Truncate HTML to fit context - keep the most important parts
    const maxHtmlLen = 15000;
    const headerHtml = (capturedHeaderHtml || '').substring(0, maxHtmlLen);
    const footerHtml = (capturedFooterHtml || '').substring(0, maxHtmlLen);
    const css = (capturedCss || '').substring(0, 5000);

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
            content: `You are an expert at HTML/CSS header and footer reproduction. You will be shown a screenshot of the ORIGINAL website. Your job is to analyze the captured HTML and CSS, compare it to the screenshot, and provide corrected HTML and CSS that makes the captured version look identical to the original.

Key focus areas:
- Background colors must match exactly (use the screenshot to determine exact colors)
- Logo positioning and sizing
- Navigation link colors, fonts, and spacing  
- Overall layout structure (flex, grid, alignment)
- Font families, sizes, and weights
- Padding and margins
- Any missing elements visible in the screenshot but absent from the HTML
- Remove any elements in the HTML that aren't visible in the screenshot header/footer area

IMPORTANT RULES:
- Keep all inline styles on elements (they contain computed styles from the original)
- Add a corrective <style> block with overrides, don't modify inline styles
- Ensure all image src URLs remain absolute
- Keep data-original-href attributes on links
- The HTML will be rendered in an iframe - make it self-contained
- Focus on the HEADER (top navigation area) and FOOTER only
- If the header background should be a specific color (e.g., blue for FanDuel), ensure that color is applied
- Add any missing font imports as @import rules in CSS`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Here is a screenshot of the original website (${sourceUrl || 'unknown URL'}). Compare it to the captured HTML below and provide corrected versions that match the screenshot exactly.

CAPTURED HEADER HTML:
\`\`\`html
${headerHtml}
\`\`\`

CAPTURED FOOTER HTML:
\`\`\`html
${footerHtml}
\`\`\`

CAPTURED CSS:
\`\`\`css
${css}
\`\`\`

Analyze the screenshot and fix the HTML/CSS so the rendered result matches the original site's appearance. Return corrected header HTML, footer HTML, and additional CSS.`
              },
              {
                type: 'image_url',
                image_url: { url: originalScreenshot.startsWith('data:') ? originalScreenshot : `data:image/png;base64,${originalScreenshot}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_refined_capture',
              description: 'Report the refined header/footer HTML and CSS corrections',
              parameters: {
                type: 'object',
                properties: {
                  refinedHeaderHtml: {
                    type: 'string',
                    description: 'The corrected header HTML. Keep existing inline styles but wrap in a container if needed. If no changes needed, return the original.',
                  },
                  refinedFooterHtml: {
                    type: 'string',
                    description: 'The corrected footer HTML. If no changes needed, return the original.',
                  },
                  additionalCss: {
                    type: 'string',
                    description: 'Additional CSS rules to add/override for correct appearance. Include @import for fonts if needed. Use specific selectors that target header/footer elements.',
                  },
                  matchScore: {
                    type: 'number',
                    description: 'Estimated visual match percentage after fixes (0-100)',
                  },
                  changes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        element: { type: 'string' },
                        change: { type: 'string' },
                        severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
                      },
                      required: ['element', 'change', 'severity'],
                    },
                    description: 'List of changes made to improve accuracy',
                  },
                  extractedColors: {
                    type: 'object',
                    properties: {
                      headerBgColor: { type: 'string', description: 'Header background color as hex' },
                      headerTextColor: { type: 'string', description: 'Header text/link color as hex' },
                      buttonColor: { type: 'string', description: 'Primary button/CTA color as hex' },
                      logoUrl: { type: 'string', description: 'Logo image URL if visible' },
                    },
                    description: 'Colors extracted from the screenshot for branding',
                  },
                },
                required: ['refinedHeaderHtml', 'additionalCss', 'matchScore', 'changes'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'report_refined_capture' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `AI refinement failed (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'report_refined_capture') {
      console.error('Unexpected AI response format');
      return new Response(
        JSON.stringify({ success: false, error: 'AI returned unexpected format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error('Failed to parse AI tool arguments');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI refinement results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Refinement complete: ${result.matchScore}% match, ${result.changes?.length || 0} changes applied`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error refining capture:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Refinement failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
