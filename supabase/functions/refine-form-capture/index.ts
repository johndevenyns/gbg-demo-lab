import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefineOptions {
  /** base64 screenshot of the original form on the customer site (data URL or raw) */
  originalScreenshot: string;
  /** base64 screenshot of our rendered replica (optional — if absent, AI grades the raw HTML) */
  renderedScreenshot?: string;
  /** the captured form HTML we are refining */
  capturedFormHtml: string;
  /** captured CSS — for context */
  capturedFormCss: string;
  /** mime type of screenshots (default image/png) */
  mimeType?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { originalScreenshot, renderedScreenshot, capturedFormHtml, capturedFormCss, mimeType = 'image/png' } = (await req.json()) as RefineOptions;

    if (!originalScreenshot) {
      return new Response(JSON.stringify({ success: false, error: 'originalScreenshot is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strip data URL prefix if present.
    const cleanOriginal = stripDataUrl(originalScreenshot);
    const cleanRendered = renderedScreenshot ? stripDataUrl(renderedScreenshot) : null;

    const systemPrompt = `You are a CSS expert helping to make a captured web form look pixel-perfect against the original site.
You will receive a screenshot of the ORIGINAL form and (optionally) a screenshot of our RENDERED replica, plus the captured HTML and CSS.
Your job:
1. Compare the visual styling: typography, colors, spacing, borders, button shape/color, label placement, input size, padding.
2. Output additional CSS rules (NEVER replace the existing CSS — only ADD overrides) that move the replica closer to the original.
3. Extract a confidence score (0-100) of how visually similar the replica already is to the original.
4. List the most important changes you'd make.
5. Only target classes/elements that exist in the captured HTML. Use !important sparingly when overriding stubborn framework styles.
Return JSON via the provided tool.`;

    const userParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: 'ORIGINAL form screenshot (the source of truth):' },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${cleanOriginal}` } },
    ];
    if (cleanRendered) {
      userParts.push({ type: 'text', text: 'OUR RENDERED replica (what we currently show):' });
      userParts.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${cleanRendered}` } });
    }
    userParts.push({
      type: 'text',
      text: `Captured form HTML (truncated):\n\n${(capturedFormHtml || '').slice(0, 6000)}\n\nCaptured form CSS (truncated):\n\n${(capturedFormCss || '').slice(0, 4000)}`,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);

    let aiResp: Response;
    try {
      aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userParts },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'submit_refinement',
              description: 'Submit CSS overrides and a match score',
              parameters: {
                type: 'object',
                properties: {
                  matchScore: { type: 'number', description: 'Overall visual match score 0-100' },
                  additionalCss: { type: 'string', description: 'CSS rules to APPEND to the existing CSS' },
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
                      additionalProperties: false,
                    },
                  },
                  detectedColors: {
                    type: 'object',
                    properties: {
                      buttonBgColor: { type: 'string' },
                      buttonTextColor: { type: 'string' },
                      inputBorderColor: { type: 'string' },
                      inputFocusBorderColor: { type: 'string' },
                      labelColor: { type: 'string' },
                      formBgColor: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                },
                required: ['matchScore', 'additionalCss', 'changes'],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'submit_refinement' } },
        }),
      });
    } catch (e) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        return new Response(JSON.stringify({ success: false, error: 'AI refinement timed out (90s)' }), {
          status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw e;
    }
    clearTimeout(timer);

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('[refine-form-capture] AI gateway error:', aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds in workspace settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: false, error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ success: false, error: 'AI did not return a structured response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed: { matchScore: number; additionalCss: string; changes: Array<{ element: string; change: string; severity: string }>; detectedColors?: Record<string, string> };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Failed to parse AI response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[refine-form-capture] error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to refine form';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function stripDataUrl(s: string): string {
  return s.startsWith('data:') ? s.replace(/^data:[^;]+;base64,/, '') : s;
}