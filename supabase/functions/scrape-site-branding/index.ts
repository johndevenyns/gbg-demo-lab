const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
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

    console.log('Scraping branding from URL:', formattedUrl);

    // Request branding, HTML (raw to get CSS), and screenshot formats
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['html', 'rawHtml', 'screenshot', 'branding'],
        onlyMainContent: false,
        waitFor: 2000,
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

    // Extract header and footer from HTML
    const html = data.data?.html || data.html || '';
    const rawHtml = data.data?.rawHtml || data.rawHtml || html;
    const branding = data.data?.branding || data.branding || null;
    const screenshot = data.data?.screenshot || data.screenshot || null;
    const metadata = data.data?.metadata || data.metadata || {};

    // Parse header and footer from HTML
    const headerHtml = extractHeader(html);
    const footerHtml = extractFooter(html);
    
    // Extract CSS from raw HTML
    const cssContent = extractCss(rawHtml, formattedUrl);
    
    // Extract logo from branding or metadata
    const logoUrl = branding?.images?.logo || 
                    branding?.logo || 
                    metadata.ogImage || 
                    null;

    // Extract colors from branding
    const colors = branding?.colors || {};
    const headerBgColor = colors.background || colors.primary || '#1a1a2e';
    const headerTextColor = colors.textPrimary || '#ffffff';
    const buttonColor = colors.primary || colors.accent || '#6366f1';

    console.log('Scrape successful, extracted branding and CSS');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          headerHtml,
          footerHtml,
          cssContent,
          logoUrl,
          screenshot,
          colors: {
            headerBgColor,
            headerTextColor,
            buttonColor,
          },
          branding,
          sourceUrl: formattedUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractCss(html: string, baseUrl: string): string {
  const cssFragments: string[] = [];
  
  // Extract inline <style> tags
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(html)) !== null) {
    if (styleMatch[1]) {
      cssFragments.push(styleMatch[1]);
    }
  }
  
  // Extract linked stylesheet URLs and create @import rules
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkRegex2 = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  
  const processedUrls = new Set<string>();
  
  for (const regex of [linkRegex, linkRegex2]) {
    let linkMatch;
    while ((linkMatch = regex.exec(html)) !== null) {
      let href = linkMatch[1];
      if (href && !processedUrls.has(href)) {
        processedUrls.add(href);
        // Convert relative URLs to absolute
        if (href.startsWith('//')) {
          href = 'https:' + href;
        } else if (href.startsWith('/')) {
          try {
            const urlObj = new URL(baseUrl);
            href = urlObj.origin + href;
          } catch {
            // Keep as-is if URL parsing fails
          }
        } else if (!href.startsWith('http')) {
          try {
            const urlObj = new URL(baseUrl);
            href = urlObj.origin + '/' + href;
          } catch {
            // Keep as-is if URL parsing fails
          }
        }
        cssFragments.unshift(`@import url("${href}");`);
      }
    }
  }
  
  return cssFragments.join('\n\n');
}

function extractHeader(html: string): string {
  const parts: string[] = [];
  
  // Extract ALL nav elements (top navigation bars)
  const navRegex = /<nav[^>]*>[\s\S]*?<\/nav>/gi;
  let navMatch;
  while ((navMatch = navRegex.exec(html)) !== null) {
    parts.push(navMatch[0]);
  }
  
  // Extract header element
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
  if (headerMatch) {
    // Check if header already contains the navs we found
    const headerHasNav = parts.some(nav => headerMatch[0].includes(nav));
    if (headerHasNav) {
      // Header contains nav, just use header
      return headerMatch[0];
    } else {
      // Add header after navs
      parts.push(headerMatch[0]);
    }
  }
  
  // If no semantic elements found, try div-based patterns
  if (parts.length === 0) {
    // Look for top bar / announcement bar divs
    const topBarRegex = /<div[^>]*class="[^"]*(?:top-bar|announcement|promo-bar|utility-nav)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    let topBarMatch;
    while ((topBarMatch = topBarRegex.exec(html)) !== null) {
      parts.push(topBarMatch[0]);
    }
    
    // Look for navbar/header divs
    const navbarDivRegex = /<div[^>]*class="[^"]*(?:navbar|nav-bar|navigation|header|site-header|main-header)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    let navbarMatch;
    while ((navbarMatch = navbarDivRegex.exec(html)) !== null) {
      parts.push(navbarMatch[0]);
    }
  }
  
  return parts.join('\n');
}

function extractFooter(html: string): string {
  const parts: string[] = [];
  
  // Extract footer element
  const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
  if (footerMatch) {
    parts.push(footerMatch[0]);
  }
  
  // If no semantic footer, try div-based patterns
  if (parts.length === 0) {
    const footerDivRegex = /<div[^>]*class="[^"]*(?:footer|site-footer|main-footer|bottom-bar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    let footerMatch;
    while ((footerMatch = footerDivRegex.exec(html)) !== null) {
      parts.push(footerMatch[0]);
    }
  }
  
  return parts.join('\n');
}
