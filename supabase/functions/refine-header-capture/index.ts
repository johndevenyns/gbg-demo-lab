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

    const hasHeader = capturedHeaderHtml && capturedHeaderHtml.trim().length > 50;
    const hasFooter = capturedFooterHtml && capturedFooterHtml.trim().length > 50;

    console.log('Refining header capture with AI vision...');
    console.log('Header HTML length:', capturedHeaderHtml?.length || 0, 'has substantial header:', hasHeader);
    console.log('Footer HTML length:', capturedFooterHtml?.length || 0, 'has substantial footer:', hasFooter);

    const maxHtmlLen = 15000;
    const headerHtml = (capturedHeaderHtml || '').substring(0, maxHtmlLen);
    const footerHtml = (capturedFooterHtml || '').substring(0, maxHtmlLen);
    const css = (capturedCss || '').substring(0, 5000);

    // Different prompts depending on whether we have existing HTML or need to generate from scratch
    const systemPrompt = hasHeader
      ? `You are an expert at HTML/CSS header and footer reproduction. You will be shown a screenshot of the ORIGINAL website and the captured HTML/CSS. Your job is to compare them and provide corrected HTML and CSS that makes the captured version look identical to the original.

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
- If the header background should be a specific color, ensure that color is applied
- Add any missing font imports as @import rules in CSS`
      : `You are an expert at HTML/CSS header and footer reproduction. You will be shown a screenshot of the ORIGINAL website. Since the automated HTML capture failed or produced minimal content, your job is to GENERATE clean, accurate header and footer HTML from the screenshot.

Your task:
1. Look at the screenshot carefully and identify the header/navigation area and footer area
2. Generate semantic HTML that visually reproduces what you see
3. Include inline styles for colors, fonts, layout, spacing
4. Use flexbox for layout
5. For logos, use an <img> tag with the site's likely logo URL (based on the source URL domain)
6. For navigation links, create <a> tags with the visible text
7. Match colors, backgrounds, fonts as closely as possible to the screenshot

IMPORTANT RULES:
- Generate self-contained HTML with inline styles
- Use absolute positioning/flexbox for layout matching
- Include @import for Google Fonts if you can identify the font from the screenshot
- Set exact background colors you see in the screenshot
- The HTML will be rendered in an iframe
- Make links non-functional (add data-original-href instead of href)
- If the site URL is known, use it to construct likely logo/asset URLs`;

    const userContent = hasHeader
      ? `Here is a screenshot of the original website (${sourceUrl || 'unknown URL'}). Compare it to the captured HTML below and provide corrected versions that match the screenshot exactly.

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

Analyze the screenshot and fix the HTML/CSS so the rendered result matches the original site's appearance.`
      : `Here is a screenshot of the original website (${sourceUrl || 'unknown URL'}). The automated HTML capture failed to extract meaningful header/footer content. Please GENERATE header and footer HTML from the screenshot that reproduces what you see.

${headerHtml ? `Partial captured header (may be incomplete/broken):\n\`\`\`html\n${headerHtml}\n\`\`\`` : 'No header HTML was captured.'}

${footerHtml ? `Partial captured footer:\n\`\`\`html\n${footerHtml}\n\`\`\`` : 'No footer HTML was captured.'}

Generate clean header and footer HTML with inline styles that matches the screenshot.`;

    // Ensure screenshot is base64 data, not a URL
    let screenshotDataUrl = originalScreenshot;
    if (originalScreenshot.startsWith('http://') || originalScreenshot.startsWith('https://')) {
      try {
        console.log('Screenshot is a URL, fetching and converting to base64...');
        const imgResp = await fetch(originalScreenshot);
        if (!imgResp.ok) {
          console.error('Failed to fetch screenshot URL:', imgResp.status);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to fetch screenshot image from URL', fallback: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const imgBuffer = await imgResp.arrayBuffer();
        const uint8 = new Uint8Array(imgBuffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);
        const contentType = imgResp.headers.get('content-type') || 'image/png';
        screenshotDataUrl = `data:${contentType};base64,${base64}`;
      } catch (fetchErr) {
        console.error('Error fetching screenshot URL:', fetchErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Could not download screenshot image', fallback: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (!originalScreenshot.startsWith('data:')) {
      screenshotDataUrl = `data:image/png;base64,${originalScreenshot}`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userContent },
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
              description: 'Report the refined/generated header/footer HTML and CSS',
              parameters: {
                type: 'object',
                properties: {
                  refinedHeaderHtml: {
                    type: 'string',
                    description: 'The corrected or generated header HTML with inline styles. Must be self-contained and renderable in an iframe.',
                  },
                  refinedFooterHtml: {
                    type: 'string',
                    description: 'The corrected or generated footer HTML. If no footer visible in screenshot, return empty string.',
                  },
                  additionalCss: {
                    type: 'string',
                    description: 'Additional CSS rules including @import for fonts. Use specific selectors.',
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
                    description: 'List of changes made or elements generated',
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

    console.log(`Refinement complete: ${result.matchScore}% match, ${result.changes?.length || 0} changes, mode: ${hasHeader ? 'refine' : 'generate'}`);

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
