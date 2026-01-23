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

    const baseUrl = new URL(formattedUrl);
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

    // Extract data from response
    const html = data.data?.html || data.html || '';
    const rawHtml = data.data?.rawHtml || data.rawHtml || html;
    const branding = data.data?.branding || data.branding || null;
    const screenshot = data.data?.screenshot || data.screenshot || null;
    const metadata = data.data?.metadata || data.metadata || {};

    // Parse header and footer from HTML
    const headerHtml = convertRelativeUrls(extractHeader(html), baseUrl);
    const footerHtml = convertRelativeUrls(extractFooter(html), baseUrl);
    
    // Extract and inline all CSS
    console.log('Extracting and inlining CSS...');
    const cssContent = await extractAndInlineCss(rawHtml, baseUrl);
    console.log(`Extracted ${cssContent.length} characters of CSS`);
    
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

    console.log('Scrape successful, extracted branding and inlined CSS');

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

// Convert relative URLs to absolute in HTML content
function convertRelativeUrls(html: string, baseUrl: URL): string {
  if (!html) return html;
  
  // Convert src attributes
  html = html.replace(/src=["']([^"']+)["']/gi, (match, url) => {
    return `src="${makeAbsoluteUrl(url, baseUrl)}"`;
  });
  
  // Convert href attributes
  html = html.replace(/href=["']([^"']+)["']/gi, (match, url) => {
    // Skip anchor links and javascript
    if (url.startsWith('#') || url.startsWith('javascript:')) {
      return match;
    }
    return `href="${makeAbsoluteUrl(url, baseUrl)}"`;
  });
  
  // Convert background-image in inline styles
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    return `url("${makeAbsoluteUrl(url, baseUrl)}")`;
  });
  
  return html;
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
  
  // Relative URL
  return baseUrl.origin + '/' + url;
}

// Extract and inline all CSS from the page
async function extractAndInlineCss(html: string, baseUrl: URL): Promise<string> {
  const cssFragments: string[] = [];
  
  // Extract inline <style> tags first
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(html)) !== null) {
    if (styleMatch[1]) {
      const processedCss = convertCssUrls(styleMatch[1], baseUrl);
      cssFragments.push(`/* Inline style */\n${processedCss}`);
    }
  }
  
  // Extract linked stylesheet URLs
  const stylesheetUrls = new Set<string>();
  
  // Match <link rel="stylesheet" href="...">
  const linkRegex1 = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkRegex2 = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;
  // Also match <link href="..." type="text/css">
  const linkRegex3 = /<link[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/gi;
  
  for (const regex of [linkRegex1, linkRegex2, linkRegex3]) {
    let linkMatch;
    while ((linkMatch = regex.exec(html)) !== null) {
      if (linkMatch[1]) {
        stylesheetUrls.add(linkMatch[1]);
      }
    }
  }
  
  console.log(`Found ${stylesheetUrls.size} external stylesheets to fetch`);
  
  // Fetch all external stylesheets in parallel
  const fetchPromises = Array.from(stylesheetUrls).map(async (href) => {
    try {
      const absoluteUrl = makeAbsoluteUrl(href, baseUrl);
      console.log(`Fetching stylesheet: ${absoluteUrl}`);
      
      const response = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/css,*/*;q=0.1',
        },
      });
      
      if (response.ok) {
        const cssText = await response.text();
        // Process the CSS to convert relative URLs
        const processedCss = convertCssUrls(cssText, new URL(absoluteUrl));
        // Handle @import rules recursively (one level deep)
        const withImports = await resolveImports(processedCss, new URL(absoluteUrl));
        return `/* From: ${absoluteUrl} */\n${withImports}`;
      } else {
        console.warn(`Failed to fetch ${absoluteUrl}: ${response.status}`);
        return `/* Failed to fetch: ${absoluteUrl} (${response.status}) */`;
      }
    } catch (error) {
      console.warn(`Error fetching stylesheet ${href}:`, error);
      return `/* Error fetching: ${href} */`;
    }
  });
  
  const fetchedStyles = await Promise.all(fetchPromises);
  
  // Add fetched stylesheets before inline styles (so inline styles can override)
  return [...fetchedStyles, ...cssFragments].join('\n\n');
}

// Convert relative URLs within CSS to absolute
function convertCssUrls(css: string, baseUrl: URL): string {
  // Convert url() references
  return css.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    const absoluteUrl = makeAbsoluteUrl(url.trim(), baseUrl);
    return `url("${absoluteUrl}")`;
  });
}

// Resolve @import rules in CSS (one level deep)
async function resolveImports(css: string, baseUrl: URL): Promise<string> {
  const importRegex = /@import\s+(?:url\()?["']?([^"'\)]+)["']?\)?[^;]*;/gi;
  const imports: { match: string; url: string }[] = [];
  
  let importMatch;
  while ((importMatch = importRegex.exec(css)) !== null) {
    imports.push({ match: importMatch[0], url: importMatch[1] });
  }
  
  if (imports.length === 0) {
    return css;
  }
  
  console.log(`Resolving ${imports.length} @import rules`);
  
  // Fetch imported stylesheets
  const importedCss: string[] = [];
  for (const imp of imports) {
    try {
      const absoluteUrl = makeAbsoluteUrl(imp.url, baseUrl);
      const response = await fetch(absoluteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/css,*/*;q=0.1',
        },
      });
      
      if (response.ok) {
        const importedText = await response.text();
        const processed = convertCssUrls(importedText, new URL(absoluteUrl));
        importedCss.push(`/* @import from: ${absoluteUrl} */\n${processed}`);
      }
    } catch (error) {
      console.warn(`Error resolving @import ${imp.url}:`, error);
    }
    
    // Remove the @import rule from original CSS
    css = css.replace(imp.match, '');
  }
  
  // Prepend imported CSS
  return importedCss.join('\n\n') + '\n\n' + css;
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
