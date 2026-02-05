 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 interface ExtractedFormStyles {
   inputBgColor: string;
   inputTextColor: string;
   inputBorderColor: string;
   inputBorderWidth: string;
   inputBorderRadius: string;
   inputFocusBorderColor: string;
   labelColor: string;
   labelFontWeight: string;
   fontFamily: string;
   fontSize: string;
   errorColor: string;
   buttonBgColor?: string;
   buttonTextColor?: string;
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
 
     console.log('Analyzing form screenshot with AI vision...');
 
     const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${LOVABLE_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         model: 'google/gemini-3-flash-preview',
         messages: [
           {
             role: 'system',
             content: `You are a UI/UX designer expert at analyzing form designs. When given a screenshot of a form, you must extract precise styling information and return it as a function call. Be very precise with colors - use hex codes. For fonts, identify the font family or describe it (serif, sans-serif, monospace). Analyze:
 - Input field backgrounds, borders, and text colors
 - Border widths and corner radius (rounded vs square)
 - Label colors and weights
 - Font families and sizes
 - Button colors if visible
 - Focus/active state colors if visible`
           },
           {
             role: 'user',
             content: [
               {
                 type: 'text',
                 text: 'Analyze this form screenshot and extract the exact styling properties. Look at input fields, labels, borders, colors, fonts, and any buttons. Be precise with hex color codes.',
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
               name: 'extract_form_styles',
               description: 'Extract form styling properties from the analyzed screenshot',
               parameters: {
                 type: 'object',
                 properties: {
                   inputBgColor: {
                     type: 'string',
                     description: 'Background color of input fields (hex code, e.g. #ffffff)',
                   },
                   inputTextColor: {
                     type: 'string',
                     description: 'Text color inside input fields (hex code)',
                   },
                   inputBorderColor: {
                     type: 'string',
                     description: 'Border color of input fields (hex code)',
                   },
                   inputBorderWidth: {
                     type: 'string',
                     description: 'Border width (e.g. "1px", "2px")',
                   },
                   inputBorderRadius: {
                     type: 'string',
                     description: 'Border radius style: "none" (0px), "sm" (4px), "md" (8px), "lg" (12px), or "full" (pill shape)',
                   },
                   inputFocusBorderColor: {
                     type: 'string',
                     description: 'Border color when input is focused (hex code, often a brand color)',
                   },
                   labelColor: {
                     type: 'string',
                     description: 'Color of form labels (hex code)',
                   },
                   labelFontWeight: {
                     type: 'string',
                     description: 'Font weight of labels: "normal" (400), "medium" (500), or "semibold" (600)',
                   },
                   fontFamily: {
                     type: 'string',
                     description: 'Font family used (e.g. "Inter, sans-serif", "Georgia, serif", "system-ui")',
                   },
                   fontSize: {
                     type: 'string',
                     description: 'Base font size: "sm" (14px), "base" (16px), or "lg" (18px)',
                   },
                   errorColor: {
                     type: 'string',
                     description: 'Color used for error states (hex code, typically red)',
                   },
                   buttonBgColor: {
                     type: 'string',
                     description: 'Background color of submit/action buttons (hex code)',
                   },
                   buttonTextColor: {
                     type: 'string',
                     description: 'Text color of submit/action buttons (hex code)',
                   },
                 },
                 required: ['inputBgColor', 'inputTextColor', 'inputBorderColor', 'inputBorderRadius', 'labelColor', 'fontFamily'],
               },
             },
           },
         ],
         tool_choice: { type: 'function', function: { name: 'extract_form_styles' } },
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
     if (!toolCall || toolCall.function.name !== 'extract_form_styles') {
       console.error('No valid tool call in response:', JSON.stringify(data));
       return new Response(
         JSON.stringify({ success: false, error: 'AI could not extract form styles' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const extractedStyles: ExtractedFormStyles = JSON.parse(toolCall.function.arguments);
     console.log('Extracted styles:', extractedStyles);
 
     return new Response(
       JSON.stringify({
         success: true,
         data: {
           styles: extractedStyles,
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