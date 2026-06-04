import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormElementStyles {
  inputBgColor: string;
  inputTextColor: string;
  inputBorderColor: string;
  inputBorderWidth: string;
  inputBorderRadius: string;
  inputPadding: string;
  inputFontSize: string;
  inputFontFamily: string;
  inputPlaceholderColor: string;
  inputFocusBorderColor: string;
  inputFocusBoxShadow: string;
  labelColor: string;
  labelFontSize: string;
  labelFontWeight: string;
  labelFontFamily: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonBorderRadius: string;
  buttonFontWeight: string;
  containerBgColor: string;
  containerPadding: string;
  errorColor: string;
}

/**
 * JavaScript to execute ON the target page via Firecrawl's executeJavascript action.
 * This script:
 * 1. Finds header and footer elements
 * 2. Deep-clones them
 * 3. Inlines all computed styles on every element
 * 4. Returns self-contained HTML that looks identical to the original
 */
const INLINE_STYLES_SCRIPT = `
(function() {
  // Default browser styles we skip to keep HTML lean
  var skipProps = new Set([
    'animation', 'animation-delay', 'animation-direction', 'animation-duration',
    'animation-fill-mode', 'animation-iteration-count', 'animation-name',
    'animation-play-state', 'animation-timing-function',
    'transition', 'transition-delay', 'transition-duration', 'transition-property',
    'transition-timing-function', 'will-change', 'perspective', 'perspective-origin',
    'backface-visibility'
  ]);

  // ---- HEADER FIRST (capture before any scrolling) -----------------------
  // Many sites apply a "scrolled" class to the header that compacts it,
  // changes its background, or hides menu items. If we scroll first to
  // trigger footer lazy-load, we'd capture the wrong (scrolled) header.
  // So we measure & remember the header BEFORE we touch the scroll.
  window.scrollTo(0, 0);

  // Force-resolve lazy-loaded images inside the header up front so the
  // logo and any eager hero images render in the iframe preview.
  function resolveLazyImagesIn(root) {
    if (!root) return;
    var lazy = root.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src], img[data-original]');
    for (var i = 0; i < lazy.length; i++) {
      var im = lazy[i];
      im.removeAttribute('loading');
      var ds = im.getAttribute('data-src') || im.getAttribute('data-lazy-src') || im.getAttribute('data-original');
      if (ds && !im.getAttribute('src')) im.setAttribute('src', ds);
    }
    // Flatten <picture> sources to a concrete <img src>. The cloned img loses
    // its <source> siblings' context inside the iframe, so we pick the first
    // viable URL from the largest <source> and drop it onto the <img>.
    var pictures = root.querySelectorAll('picture');
    for (var p = 0; p < pictures.length; p++) {
      var pic = pictures[p];
      var img = pic.querySelector('img');
      if (!img) continue;
      // If the img already has a real, non-lazy src, skip.
      var existing = img.getAttribute('src') || '';
      if (existing && !existing.startsWith('data:image/gif')) continue;
      var sources = pic.querySelectorAll('source[srcset]');
      for (var s = 0; s < sources.length; s++) {
        var srcset = sources[s].getAttribute('srcset') || '';
        var first = srcset.split(',')[0].trim().split(' ')[0];
        if (first) { img.setAttribute('src', first); break; }
      }
    }
    // Pick the first srcset entry as the concrete src for any <img srcset>.
    var srcsetImgs = root.querySelectorAll('img[srcset]');
    for (var si = 0; si < srcsetImgs.length; si++) {
      var sii = srcsetImgs[si];
      var ss = sii.getAttribute('srcset') || '';
      var firstUrl = ss.split(',')[0].trim().split(' ')[0];
      if (firstUrl && !sii.getAttribute('src')) sii.setAttribute('src', firstUrl);
    }
  }
  var preHeaderEl = document.querySelector('header')
    || document.querySelector('[role="banner"]')
    || document.querySelector('[class*="site-header"], [class*="main-header"], [class*="page-header"]')
    || document.querySelector('nav');
  // Resolve header lazy images while we are still at scrollTop=0
  resolveLazyImagesIn(preHeaderEl);

  // Measure header natural height NOW so it reflects the unscrolled,
  // mega-menu / top-bar combined size, not a compacted scrolled state.
  var headerNaturalHeight = 0;
  try {
    if (preHeaderEl) {
      var hr = preHeaderEl.getBoundingClientRect();
      headerNaturalHeight = Math.round(hr.height);
      // Include announcement / utility bar that sits ABOVE the header.
      var prevSib = preHeaderEl.previousElementSibling;
      if (prevSib) {
        var tag = (prevSib.className || '').toLowerCase() + ' ' + (prevSib.id || '').toLowerCase();
        if (tag.match(/top-bar|announcement|promo|utility|alert|banner|ribbon|notification/)) {
          var prevR = prevSib.getBoundingClientRect();
          headerNaturalHeight += Math.round(prevR.height);
        }
      }
    }
  } catch (e) { /* ignore */ }

  // ---- Lazy-load triggering (FOR FOOTER) ---------------------------------
  // Many sites mount footer content only after IntersectionObserver fires
  // when the footer scrolls into view. We force that by jumping to the
  // bottom of the page and back, then waiting a tick for content to render.
  function triggerLazyLoad() {
    try {
      // Jump to the very bottom so footer + lazy images mount
      window.scrollTo(0, document.body.scrollHeight);
      // Force any native lazy-loaded images near the footer to resolve
      var lazyImgs = document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src]');
      for (var li = 0; li < lazyImgs.length; li++) {
        var im = lazyImgs[li];
        im.removeAttribute('loading');
        var ds = im.getAttribute('data-src') || im.getAttribute('data-lazy-src');
        if (ds && !im.getAttribute('src')) im.setAttribute('src', ds);
      }
      // Walk back up to trigger observers in viewport order
      window.scrollTo(0, Math.max(0, document.body.scrollHeight - window.innerHeight));
    } catch (e) { /* ignore */ }
  }
  triggerLazyLoad();
  // Synchronous busy-wait for ~600ms to let lazy content paint.
  // We can't await inside Firecrawl's executeJavascript, so a tight loop is
  // the only portable trick. 600ms is the sweet spot — long enough for most
  // lazy mounts, short enough to stay under the action timeout.
  var lazyDeadline = Date.now() + 600;
  while (Date.now() < lazyDeadline) { /* spin */ }

  // After footer lazy-load, scroll back to top so any "scroll-shrink"
  // header CSS reverts to its unscrolled state before we capture it.
  try { window.scrollTo(0, 0); } catch (e) {}
  // Brief settle to let scroll-driven listeners reset header classes.
  var settleDeadline = Date.now() + 150;
  while (Date.now() < settleDeadline) { /* spin */ }

  // Properties that wreck the iframe layout if kept as-is. We force them
  // to safe values so a fixed/sticky/translate-d header lays out inline.
  var neutralizePositioning = {
    'position': 'static',
    'top': 'auto',
    'left': 'auto',
    'right': 'auto',
    'bottom': 'auto',
    'transform': 'none',
    'translate': 'none',
    'z-index': 'auto'
  };

  // ---- Pseudo-element + SVG sprite capture -------------------------------
  // Many footers depend on ::before / ::after for icons, dividers, and
  // background shapes. We collect them as scoped CSS rules keyed by a
  // data-pe-id we apply to the original element (mirrored on the clone).
  var pseudoIdCounter = 0;
  var pseudoRules = [];
  function collectPseudo(el) {
    var beforeStyle = window.getComputedStyle(el, '::before');
    var afterStyle = window.getComputedStyle(el, '::after');
    var hasBefore = beforeStyle && beforeStyle.content && beforeStyle.content !== 'none' && beforeStyle.content !== 'normal';
    var hasAfter  = afterStyle  && afterStyle.content  && afterStyle.content  !== 'none' && afterStyle.content  !== 'normal';
    if (!hasBefore && !hasAfter) return null;
    var peId = 'pe-' + (++pseudoIdCounter);
    function dump(cs) {
      var out = [];
      for (var i = 0; i < cs.length; i++) {
        var p = cs[i];
        if (skipProps.has(p)) continue;
        var v = cs.getPropertyValue(p);
        if (v) out.push(p + ':' + v);
      }
      return out.join(';');
    }
    if (hasBefore) pseudoRules.push('[data-pe-id="' + peId + '"]::before{' + dump(beforeStyle) + '}');
    if (hasAfter)  pseudoRules.push('[data-pe-id="' + peId + '"]::after{'  + dump(afterStyle)  + '}');
    return peId;
  }

  // Collect inline SVG <symbol> definitions used as sprites via <use href="#id">.
  // We snapshot every inline <svg> that contains <symbol>s once, prepend
  // them to the captured HTML so <use href="#sprite-id"> resolves locally.
  function collectSvgSprites() {
    var sprites = [];
    var seen = {};
    var symbols = document.querySelectorAll('svg symbol[id]');
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      var id = sym.getAttribute('id');
      if (!id || seen[id]) continue;
      seen[id] = true;
      sprites.push(sym.outerHTML);
    }
    if (!sprites.length) return '';
    return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' + sprites.join('') + '</svg>';
  }
  var svgSpriteHtml = collectSvgSprites();

  // Create a reference element to compare defaults
  var refDiv = document.createElement('div');
  document.body.appendChild(refDiv);
  var defaultStyle = window.getComputedStyle(refDiv);
  var defaultMap = {};
  for (var i = 0; i < defaultStyle.length; i++) {
    defaultMap[defaultStyle[i]] = defaultStyle.getPropertyValue(defaultStyle[i]);
  }
  document.body.removeChild(refDiv);

  function extractWithInlinedStyles(selector, fallbackSelectors, neutralizeFixed) {
    var el = document.querySelector(selector);
    if (!el && fallbackSelectors) {
      for (var i = 0; i < fallbackSelectors.length; i++) {
        el = document.querySelector(fallbackSelectors[i]);
        if (el) break;
      }
    }
    if (!el) return '';
    
    // Walk the original and build a map of styles per element index
    var styleMap = [];
    var pseudoMap = []; // idx -> peId (or undefined)
    function collectStyles(origEl, idx) {
      if (origEl.nodeType !== 1) return idx;
      var cs = window.getComputedStyle(origEl);
      var props = [];
      for (var i = 0; i < cs.length; i++) {
        var prop = cs[i];
        if (skipProps.has(prop)) continue;
        var val = cs.getPropertyValue(prop);
        if (val && val !== defaultMap[prop]) {
          props.push(prop + ':' + val);
        }
      }
      // For headers: neutralize fixed/sticky/translate so the cloned tree
      // lays out as a normal block inside the iframe. We do this on EVERY
      // descendant because nav drawers, sticky sub-bars, and transformed
      // logos all break iframe layout if left in place.
      if (neutralizeFixed) {
        var pos = cs.getPropertyValue('position');
        if (pos === 'fixed' || pos === 'sticky' || pos === 'absolute') {
          for (var npn in neutralizePositioning) {
            if (Object.prototype.hasOwnProperty.call(neutralizePositioning, npn)) {
              props.push(npn + ':' + neutralizePositioning[npn]);
            }
          }
        } else {
          var tr = cs.getPropertyValue('transform');
          if (tr && tr !== 'none') props.push('transform:none');
        }
      }
      styleMap[idx] = props.join(';');
      // Capture ::before / ::after on the original element
      var pe = collectPseudo(origEl);
      if (pe) pseudoMap[idx] = pe;
      var nextIdx = idx + 1;
      var children = origEl.children;
      for (var c = 0; c < children.length; c++) {
        nextIdx = collectStyles(children[c], nextIdx);
      }
      return nextIdx;
    }
    collectStyles(el, 0);
    
    // Now apply collected styles to the clone
    var clone = el.cloneNode(true);
    var scripts = clone.querySelectorAll('script');
    for (var s2 = 0; s2 < scripts.length; s2++) scripts[s2].remove();
    
    function applyStyles(cloneEl, idx) {
      if (cloneEl.nodeType !== 1) return idx;
      if (styleMap[idx]) {
        cloneEl.setAttribute('style', styleMap[idx]);
      }
      if (pseudoMap[idx]) {
        cloneEl.setAttribute('data-pe-id', pseudoMap[idx]);
      }
      var nextIdx = idx + 1;
      var children = cloneEl.children;
      for (var c = 0; c < children.length; c++) {
        nextIdx = applyStyles(children[c], nextIdx);
      }
      return nextIdx;
    }
    applyStyles(clone, 0);
    
    // Strip non-chrome content (forms, main content, articles) so we only
    // keep header/footer chrome. On pages like /auth or /login the
    // <header> or fallback selector can contain an actual sign-in form,
    // which then bleeds into the preview behind our demo's overlay form.
    // We capture form STYLING separately via the branding payload, so we
    // never need the form markup itself inside the header/footer HTML.
    var stripSelectors = [
      'form',
      'main', '[role="main"]',
      'article', '[role="article"]',
      '[class*="signin" i]', '[class*="sign-in" i]', '[class*="login" i]',
      '[class*="signup" i]', '[class*="sign-up" i]', '[class*="register" i]',
      '[id*="signin" i]', '[id*="sign-in" i]', '[id*="login" i]',
      '[id*="signup" i]', '[id*="sign-up" i]', '[id*="register" i]',
      'input[type="password"]'
    ];
    for (var ss = 0; ss < stripSelectors.length; ss++) {
      try {
        var matches = clone.querySelectorAll(stripSelectors[ss]);
        for (var mm = 0; mm < matches.length; mm++) {
          // For password inputs, remove the enclosing form ancestor too
          var node = matches[mm];
          var formAncestor = node.closest ? node.closest('form') : null;
          if (formAncestor && formAncestor !== clone) {
            formAncestor.parentNode && formAncestor.parentNode.removeChild(formAncestor);
          } else if (node.parentNode && node !== clone) {
            node.parentNode.removeChild(node);
          }
        }
      } catch(e) { /* invalid selector in some browsers */ }
    }

    // Make all links non-functional but keep href for CTA mapping
    var links = clone.querySelectorAll('a');
    for (var l = 0; l < links.length; l++) {
      links[l].setAttribute('data-original-href', links[l].getAttribute('href') || '');
    }
    
    // Convert images to absolute URLs
    var imgs = clone.querySelectorAll('img');
    for (var im = 0; im < imgs.length; im++) {
      var src = imgs[im].getAttribute('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        try {
          imgs[im].setAttribute('src', new URL(src, window.location.origin).href);
        } catch(e) {}
      }
    }
    
    // Convert SVG use[href] to absolute
    var uses = clone.querySelectorAll('use[href]');
    for (var u = 0; u < uses.length; u++) {
      var href = uses[u].getAttribute('href') || uses[u].getAttribute('xlink:href');
      if (href && href.startsWith('/')) {
        try {
          var absHref = new URL(href, window.location.origin).href;
          if (uses[u].hasAttribute('href')) uses[u].setAttribute('href', absHref);
          if (uses[u].hasAttribute('xlink:href')) uses[u].setAttribute('xlink:href', absHref);
        } catch(e) {}
      }
    }
    
    // Convert background-image urls to absolute
    var allEls = clone.querySelectorAll('*');
    for (var ae = 0; ae < allEls.length; ae++) {
      var st = allEls[ae].getAttribute('style') || '';
      if (st.indexOf('url(') !== -1 && st.indexOf('url(data:') === -1 && st.indexOf('url(http') === -1) {
        // Use string manipulation instead of regex to avoid escaping issues
        var parts = st.split('url(');
        for (var pi = 1; pi < parts.length; pi++) {
          var inner = parts[pi];
          var closeIdx = inner.indexOf(')');
          if (closeIdx === -1) continue;
          var rawUrl = inner.substring(0, closeIdx).replace(/["']/g, '').trim();
          if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
            try {
              var absUrl = new URL(rawUrl, window.location.origin).href;
              parts[pi] = '"' + absUrl + '")' + inner.substring(closeIdx + 1);
            } catch(e) {}
          }
        }
        var newSt = parts.join('url(');
        if (newSt !== st) allEls[ae].setAttribute('style', newSt);
      }
    }
    
    return clone.outerHTML;
  }

  // Also grab any relevant font-face declarations and Google Font links
  var fontInfo = [];
  var sheets = document.styleSheets;
  for (var si = 0; si < sheets.length; si++) {
    try {
      var rules = sheets[si].cssRules || sheets[si].rules;
      if (!rules) continue;
      for (var ri = 0; ri < rules.length; ri++) {
        if (rules[ri].type === 5) { // CSSFontFaceRule
          fontInfo.push(rules[ri].cssText);
        }
      }
    } catch(e) { /* cross-origin */ }
  }
  
  // Get Google Fonts links
  var fontLinks = [];
  var allLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"], link[href*="typekit"], link[href*="use.fontawesome"]');
  for (var fl = 0; fl < allLinks.length; fl++) {
    fontLinks.push(allLinks[fl].outerHTML);
  }

  var headerHtml = extractWithInlinedStyles('header', [
    '[class*="site-header"]', '[class*="main-header"]', '[class*="page-header"]',
    '[id*="header"]', '[role="banner"]', 'nav'
  ], true);
  
  // Check for announcement/top bar above header
  var header = document.querySelector('header') || document.querySelector('[role="banner"]');
  var topBarHtml = '';
  if (header && header.previousElementSibling) {
    var prev = header.previousElementSibling;
    var prevText = (prev.className || '').toLowerCase() + (prev.id || '').toLowerCase();
    if (prevText.match(/top-bar|announcement|promo|utility|alert|banner|ribbon/)) {
      topBarHtml = extractWithInlinedStyles(
        prev.tagName.toLowerCase() + (prev.id ? '#' + prev.id : '') + (prev.className ? '.' + prev.className.split(' ')[0] : ''),
        [],
        true
      );
    }
  }

  var footerHtml = extractWithInlinedStyles('footer', [
    '[class*="site-footer"]', '[class*="main-footer"]', '[class*="page-footer"]',
    '[id*="footer"]', '[role="contentinfo"]'
  ], false);

  // Measure the natural rendered height of the live footer so the iframe
  // in the admin preview can size itself correctly without the user
  // hand-tuning the footer-height badge for every site.
  var footerHeight = 0;
  try {
    var footerEl = document.querySelector('footer')
      || document.querySelector('[role="contentinfo"]')
      || document.querySelector('[class*="site-footer"], [class*="main-footer"], [class*="page-footer"], [id*="footer"]');
    if (footerEl) {
      var rect = footerEl.getBoundingClientRect();
      footerHeight = Math.round(rect.height);
    }
  } catch(e) { /* ignore */ }

  // Extract actual header background color from computed style
  var headerBgColor = '';
  var headerTextColor = '';
  var headerEl = document.querySelector('header') || document.querySelector('[role="banner"]') || document.querySelector('nav');
  if (headerEl) {
    var hcs = window.getComputedStyle(headerEl);
    headerBgColor = hcs.backgroundColor || '';
    headerTextColor = hcs.color || '';
    // If transparent, walk up parents to find an opaque bg
    if (headerBgColor === 'rgba(0, 0, 0, 0)' || headerBgColor === 'transparent') {
      var parent = headerEl.parentElement;
      while (parent && parent !== document.body) {
        var pcs = window.getComputedStyle(parent);
        if (pcs.backgroundColor && pcs.backgroundColor !== 'rgba(0, 0, 0, 0)' && pcs.backgroundColor !== 'transparent') {
          headerBgColor = pcs.backgroundColor;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }

  return JSON.stringify({
    headerHtml: (topBarHtml ? topBarHtml + '\\n' : '') + headerHtml,
    footerHtml: footerHtml,
    pseudoRules: pseudoRules,
    svgSpriteHtml: svgSpriteHtml,
    footerHeight: footerHeight,
    headerHeight: headerNaturalHeight,
    fontFaceRules: fontInfo,
    fontLinks: fontLinks,
    origin: window.location.origin,
    headerBgColor: headerBgColor,
    headerTextColor: headerTextColor
  });
})();
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { url } = await req.json();

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

    let formattedUrl = url.trim()
      .replace(/^hhtps?:\/\//i, 'https://')
      .replace(/^htps:\/\//i, 'https://')
      .replace(/^htttp:\/\//i, 'http://')
      .replace(/^hhtp:\/\//i, 'http://');
    
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(formattedUrl);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid URL format: "${url}". Please enter a valid URL like "example.com" or "https://example.com"` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Scraping branding from URL:', formattedUrl);

    const firecrawlScrape = async (body: Record<string, unknown>) => {
      const doRequest = async (b: Record<string, unknown>) => {
        return fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(b),
        });
      };

      let res = await doRequest(body);
      if (res.ok) return res;

      // Retry without unrecognized keys
      try {
        const cloned = res.clone();
        const data = await cloned.json();
        const errText = (data?.error as string | undefined) || '';
        const unrecognizedKeys: string[] =
          (Array.isArray(data?.details)
            ? data.details.flatMap((d: any) => Array.isArray(d?.keys) ? d.keys : [])
            : [])
            .filter((k: any) => typeof k === 'string');

        if (res.status === 400 && (errText.includes('Unrecognized key') || unrecognizedKeys.length > 0)) {
          if ('screenshot' in body || unrecognizedKeys.includes('screenshot')) {
            const { screenshot: _s, ...rest } = body as any;
            console.warn('Firecrawl rejected screenshot options; retrying without screenshot key');
            res = await doRequest(rest);
            return res;
          }
        }
      } catch {
        // ignore
      }

      return res;
    };

    // Request 1: Simple branding + HTML (no actions, no timeout risk)
    const mainRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['html', 'rawHtml', 'screenshot', 'branding'],
      onlyMainContent: false,
      waitFor: 3000,
      timeout: 30000,
    });

    // Request 2: Lightweight JS extraction for header/footer with inlined styles (separate to avoid timeout)
    const jsRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['rawHtml'],
      onlyMainContent: false,
      waitFor: 3500,
      timeout: 60000,
      actions: [
        // Initial settle for SPA hydration
        { type: 'wait', milliseconds: 2000 },
        // Scroll to bottom so IntersectionObserver-driven footers mount
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 1500 },
        { type: 'executeJavascript', script: INLINE_STYLES_SCRIPT },
      ],
    });

    // Parallel screenshot requests for tablet/mobile
    const tabletRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['screenshot'],
      onlyMainContent: false,
      waitFor: 2000,
      timeout: 30000,
      actions: [
        { type: 'viewport', width: 768, height: 1024 },
        { type: 'wait', milliseconds: 1000 },
      ],
    });

    const mobileRequest = firecrawlScrape({
      url: formattedUrl,
      formats: ['screenshot'],
      onlyMainContent: false,
      waitFor: 2000,
      timeout: 30000,
      actions: [
        { type: 'viewport', width: 390, height: 844 },
        { type: 'wait', milliseconds: 1000 },
      ],
    });

    console.log('Fetching branding + JS extraction + screenshots in parallel...');

    const [mainResponse, jsResponse, tabletResponse, mobileResponse] = await Promise.all([
      mainRequest,
      jsRequest,
      tabletRequest,
      mobileRequest,
    ]);

    const mainData = await mainResponse.json();

    if (!mainResponse.ok) {
      console.error('Firecrawl API error:', mainData);
      return new Response(
        JSON.stringify({ success: false, error: mainData.error || `Request failed with status ${mainResponse.status}` }),
        { status: mainResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tabletScreenshot: string | null = null;
    let mobileScreenshot: string | null = null;

    try {
      const tabletData = await tabletResponse.json();
      tabletScreenshot = tabletData.data?.screenshot || tabletData.screenshot || null;
    } catch (e) {
      console.warn('Failed to get tablet screenshot:', e);
    }

    try {
      const mobileData = await mobileResponse.json();
      mobileScreenshot = mobileData.data?.screenshot || mobileData.screenshot || null;
    } catch (e) {
      console.warn('Failed to get mobile screenshot:', e);
    }

    const html = mainData.data?.html || mainData.html || '';
    const rawHtml = mainData.data?.rawHtml || mainData.rawHtml || html;
    const branding = mainData.data?.branding || mainData.branding || null;
    const desktopScreenshot = mainData.data?.screenshot || mainData.screenshot || null;
    const metadata = mainData.data?.metadata || mainData.metadata || {};

    // Extract the JS-returned header/footer with inlined styles from the separate request
    let jsExtracted:
      | {
          headerHtml: string;
          footerHtml: string;
          fontFaceRules: string[];
          fontLinks: string[];
          origin: string;
          headerBgColor?: string;
          headerTextColor?: string;
          pseudoRules?: string[];
          svgSpriteHtml?: string;
          footerHeight?: number;
          headerHeight?: number;
        }
      | null = null;

    try {
      const jsData = await jsResponse.json();
      if (jsResponse.ok) {
        // Firecrawl may return JS results under different keys depending on version
        const jsReturns = jsData.data?.javascriptReturns || jsData.javascriptReturns || [];
        const actionsResults = jsData.data?.actions?.results || jsData.actions?.results || [];
        console.log('javascriptReturns count:', jsReturns.length, 'actionsResults count:', actionsResults.length);
        // Log available top-level keys for debugging
        console.log('jsData keys:', Object.keys(jsData.data || jsData).join(', '));

        // Try javascriptReturns first, then actions results
        const candidates = [...jsReturns, ...actionsResults];
        for (const candidate of candidates) {
          try {
            const rawValue = typeof candidate === 'string' ? candidate : candidate?.value || candidate?.result || JSON.stringify(candidate);
            if (rawValue && rawValue.includes('headerHtml')) {
              jsExtracted = JSON.parse(rawValue);
              console.log('JS extraction successful - header length:', jsExtracted?.headerHtml?.length || 0, 'footer length:', jsExtracted?.footerHtml?.length || 0);
              break;
            }
          } catch { /* skip unparseable */ }
        }

        if (!jsExtracted) {
          console.log('No parseable JS extraction result found in response');
        }
      } else {
        console.warn('JS extraction request failed:', jsData.error || jsData.code);
      }
    } catch (e) {
      console.warn('Failed to parse JS extraction result:', e);
    }

    // Use JS-extracted header/footer (with inlined styles) if available, otherwise fall back to regex
    let headerHtml = '';
    let footerHtml = '';
    let cssContent = '';
    let usedInlineMethod = false;

    if (jsExtracted && (jsExtracted.headerHtml || jsExtracted.footerHtml)) {
      headerHtml = jsExtracted.headerHtml || '';
      footerHtml = jsExtracted.footerHtml || '';
      usedInlineMethod = true;
      
      // Build minimal CSS: font-face rules + @import for Google Fonts etc.
      const fontParts: string[] = [];
      // Convert <link> tags to @import rules
      if (jsExtracted.fontLinks?.length) {
        for (const linkTag of jsExtracted.fontLinks) {
          const hrefMatch = linkTag.match(/href=["']([^"']+)["']/);
          if (hrefMatch && hrefMatch[1] && !hrefMatch[1].endsWith('.js')) {
            fontParts.push(`@import url("${hrefMatch[1]}");`);
          }
        }
      }
      if (jsExtracted.fontFaceRules?.length) {
        fontParts.push(jsExtracted.fontFaceRules.join('\n'));
      }
      // Pseudo-element rules captured from ::before / ::after
      if (jsExtracted.pseudoRules?.length) {
        fontParts.push(jsExtracted.pseudoRules.join('\n'));
      }
      cssContent = fontParts.join('\n');

      // Prepend inline SVG sprite definitions so <use href="#id"> resolves
      // inside the iframe (sites like banks rely on this for footer icons).
      if (jsExtracted.svgSpriteHtml) {
        if (headerHtml) headerHtml = jsExtracted.svgSpriteHtml + headerHtml;
        if (footerHtml) footerHtml = jsExtracted.svgSpriteHtml + footerHtml;
      }
      
      console.log('Using JS inline-styles method for header/footer');
    } else {
      // Fallback: regex extraction + full CSS (old method)
      console.log('Falling back to regex extraction method');
      // Try processed html first, then rawHtml (SPAs may only have header in rawHtml)
      headerHtml = convertRelativeUrls(extractHeader(html), baseUrl);
      if (!headerHtml && rawHtml !== html) {
        console.log('No header in processed HTML, trying rawHtml...');
        headerHtml = convertRelativeUrls(extractHeader(rawHtml), baseUrl);
      }
      footerHtml = convertRelativeUrls(extractFooter(html), baseUrl);
      if (!footerHtml && rawHtml !== html) {
        console.log('No footer in processed HTML, trying rawHtml...');
        footerHtml = convertRelativeUrls(extractFooter(rawHtml), baseUrl);
      }
      cssContent = await extractAndInlineCss(rawHtml, baseUrl);
    }

    // Extract form styles
    const formStyles = extractFormElementStyles(rawHtml, cssContent, branding);

    // Logo extraction
    const fetchedUrls: string[] = [formattedUrl];
    let logoFoundAt: string | null = null;
    let logoUrl: string | null = null;

    // 1) PREFERRED: pull the actual logo straight out of the captured header HTML.
    //    This is the most reliable source because it's exactly what visitors see
    //    in the chrome of the site. Firecrawl's `branding.images.logo` and
    //    `metadata.ogImage` are unreliable — ogImage in particular is the social
    //    share image (often a hero/marketing graphic), not the site logo.
    const logoFromHeader = extractLogoFromHeader(headerHtml, baseUrl);
    if (logoFromHeader) {
      logoUrl = logoFromHeader;
      logoFoundAt = formattedUrl;
      console.log('Logo extracted from captured header HTML');
    }

    // 2) Fall back to Firecrawl branding (only the explicit logo, NOT ogImage).
    if (!logoUrl) {
      const brandingLogo = branding?.images?.logo || branding?.logo || null;
      if (brandingLogo && !looksLikeHeroImage(brandingLogo)) {
        logoUrl = brandingLogo;
        logoFoundAt = formattedUrl;
        console.log('Logo from Firecrawl branding');
      }
    }

    const rootUrl = `${baseUrl.protocol}//${baseUrl.host}`;
    const isRootUrl = formattedUrl.replace(/\/$/, '') === rootUrl.replace(/\/$/, '');
    
    if (!logoUrl && !isRootUrl) {
      console.log('Trying root domain for logo:', rootUrl);
      fetchedUrls.push(rootUrl);
      try {
        const rootResponse = await firecrawlScrape({
          url: rootUrl,
          formats: ['branding'],
          onlyMainContent: false,
          waitFor: 2000,
        });
        if (rootResponse.ok) {
          const rootData = await rootResponse.json();
          const rootBranding = rootData.data?.branding || rootData.branding || null;
          const rootLogo = rootBranding?.images?.logo || rootBranding?.logo || null;
          if (rootLogo && !looksLikeHeroImage(rootLogo)) {
            logoUrl = rootLogo;
            logoFoundAt = rootUrl;
          }
        }
      } catch (rootError) {
        console.warn('Failed to fetch logo from root:', rootError);
      }
    }

    // 3) Last-resort fallback: ogImage. Flagged in the response so the UI can warn.
    let logoIsFallback = false;
    if (!logoUrl && metadata.ogImage) {
      logoUrl = metadata.ogImage;
      logoFoundAt = formattedUrl;
      logoIsFallback = true;
      console.log('Logo falling back to ogImage (may not be the actual site logo)');
    }

    const colors = branding?.colors || {};

    console.log('Scrape successful. Inline method:', usedInlineMethod);

    // Detect "empty capture" — Firecrawl returned 200 but the page yielded
    // no usable header/footer/CSS. This typically happens on heavy SPAs
    // (Angular/React shells like citi.com) where content is rendered
    // entirely client-side AFTER our wait window, or behind bot detection.
    // We still return the screenshot + colors so the wizard can fall back
    // to the Screenshot mirroring method, but flag it clearly so the UI
    // can surface a useful error + retry instead of silently saving blanks.
    const headerLen = (headerHtml || '').trim().length;
    const footerLen = (footerHtml || '').trim().length;
    const cssLen = (cssContent || '').trim().length;
    const captureIsEmpty = headerLen === 0 && footerLen === 0 && cssLen === 0;

    if (captureIsEmpty) {
      console.warn('Empty HTML capture for', formattedUrl, '— likely SPA / bot protection');
      return new Response(
        JSON.stringify({
          success: false,
          error:
            `We could not capture the HTML structure of ${baseUrl.hostname}. ` +
            `This usually happens on JavaScript-heavy sites (SPAs) or sites with bot protection ` +
            `that render content after our capture window. ` +
            `Try the Screenshot mirroring method instead, or retry — the screenshot capture may still have succeeded.`,
          partialData: {
            screenshot: desktopScreenshot,
            screenshots: {
              desktop: desktopScreenshot,
              tablet: tabletScreenshot,
              mobile: mobileScreenshot,
            },
            logoUrl,
            logoFoundAt,
            colors: {
              headerBgColor: colors.background || colors.primary || '#1a1a2e',
              headerTextColor: colors.textPrimary || '#ffffff',
              buttonColor: colors.primary || colors.accent || '#6366f1',
            },
            branding,
            sourceUrl: formattedUrl,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          headerHtml,
          footerHtml,
          cssContent,
          fontLinks: jsExtracted?.fontLinks || [],
          usedInlineMethod,
          footerHeight: jsExtracted?.footerHeight || 0,
          headerHeight: jsExtracted?.headerHeight || 0,
          logoUrl,
          logoFoundAt,
          logoIsFallback,
          fetchedUrls,
          screenshot: desktopScreenshot,
          screenshots: {
            desktop: desktopScreenshot,
            tablet: tabletScreenshot,
            mobile: mobileScreenshot,
          },
          colors: {
            headerBgColor: jsExtracted?.headerBgColor || colors.background || colors.primary || '#1a1a2e',
            headerTextColor: jsExtracted?.headerTextColor || colors.textPrimary || '#ffffff',
            buttonColor: colors.primary || colors.accent || '#6366f1',
          },
          branding,
          formStyles,
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

// ============== FALLBACK EXTRACTION (used when JS extraction fails) ==============

function extractNestedTag(html: string, tagName: string, startIdx: number): string | null {
  const tagPattern = new RegExp(`<\\/?${tagName}[\\s>]`, 'gi');
  tagPattern.lastIndex = startIdx;
  let depth = 0;
  let m;
  while ((m = tagPattern.exec(html)) !== null) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        const closeEnd = html.indexOf('>', m.index) + 1;
        if (closeEnd > startIdx) return html.substring(startIdx, closeEnd);
        return null;
      }
    } else {
      depth++;
    }
  }
  return null;
}

function extractHeader(html: string): string {
  const headerOpenIdx = html.search(/<header[\s>]/i);
  if (headerOpenIdx !== -1) {
    const extracted = extractNestedTag(html, 'header', headerOpenIdx);
    if (extracted) return extracted;
  }
  // Try common div-based header patterns
  const divPatterns = [
    /<div[^>]*(?:id|class)=["'][^"']*(?:site-header|main-header|page-header|masthead|top-header|global-header)[^"']*["'][^>]*>/i,
  ];
  for (const pattern of divPatterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      const extracted = extractNestedTag(html, 'div', match.index);
      if (extracted) return extracted;
    }
  }
  // Try nav element as last resort (common in SPAs like FanDuel)
  const navIdx = html.search(/<nav[\s>]/i);
  if (navIdx !== -1) {
    const extracted = extractNestedTag(html, 'nav', navIdx);
    if (extracted) return extracted;
  }
  // Try role="banner" div
  const bannerMatch = html.match(/<div[^>]*role=["']banner["'][^>]*>/i);
  if (bannerMatch && bannerMatch.index !== undefined) {
    const extracted = extractNestedTag(html, 'div', bannerMatch.index);
    if (extracted) return extracted;
  }
  return '';
}

function extractFooter(html: string): string {
  const footerOpenIdx = html.search(/<footer[\s>]/i);
  if (footerOpenIdx !== -1) {
    const extracted = extractNestedTag(html, 'footer', footerOpenIdx);
    if (extracted) return extracted;
  }
  const patterns = [
    /<div[^>]*(?:id|class)=["'][^"']*(?:site-footer|main-footer|page-footer)[^"']*["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      const extracted = extractNestedTag(html, 'div', match.index);
      if (extracted) return extracted;
    }
  }
  return '';
}

function convertRelativeUrls(html: string, baseUrl: URL): string {
  if (!html) return html;
  html = html.replace(/src=["']([^"']+)["']/gi, (_match, url) => `src="${makeAbsoluteUrl(url, baseUrl)}"`);
  html = html.replace(/href=["']([^"']+)["']/gi, (match, url) => {
    if (url.startsWith('#') || url.startsWith('javascript:')) return match;
    return `href="${makeAbsoluteUrl(url, baseUrl)}"`;
  });
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (_match, url) => `url("${makeAbsoluteUrl(url, baseUrl)}")`);
  return html;
}

function makeAbsoluteUrl(url: string, baseUrl: URL): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return baseUrl.origin + url;
  return baseUrl.origin + '/' + url;
}

// ============== LOGO EXTRACTION ==============

/**
 * Heuristically detect URLs that are almost certainly NOT a site logo
 * (hero/banner/cover/social images). Used to filter out false positives
 * from Firecrawl's branding payload and from ogImage fallbacks.
 */
function looksLikeHeroImage(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  // Common patterns for marketing / hero / social imagery
  const heroSignals = [
    'hero', 'banner', 'cover', 'background', 'bg-', '/bg/',
    'og-image', 'og_image', 'opengraph', 'social', 'share-image',
    'screenshot', 'preview', 'thumbnail-large', 'feature-image',
    'masthead', 'splash',
  ];
  return heroSignals.some((s) => lower.includes(s));
}

/**
 * Heuristically score a URL/alt/class combo for "logo-ness". Higher = more
 * likely to be the actual logo. We prefer images explicitly labeled "logo",
 * placed inside the home-link (`<a href="/">`), small file names like
 * `logo.svg`, and SVG/PNG formats.
 */
function scoreLogoCandidate(opts: {
  src: string;
  alt?: string;
  className?: string;
  insideHomeLink?: boolean;
  width?: number;
  height?: number;
}): number {
  const src = (opts.src || '').toLowerCase();
  const alt = (opts.alt || '').toLowerCase();
  const cls = (opts.className || '').toLowerCase();
  let score = 0;

  if (looksLikeHeroImage(src)) return -100;

  if (src.includes('logo')) score += 50;
  if (alt.includes('logo')) score += 30;
  if (cls.includes('logo')) score += 30;
  if (alt.includes('home')) score += 5;

  // Inline SVG data URLs are commonly used for header logos. Treat them as
  // valid logo candidates even when the encoded URL itself doesn't include
  // the word "logo" or end in ".svg".
  if (src.startsWith('data:image/svg+xml')) score += 20;

  if (opts.insideHomeLink) score += 25;

  // SVG and small PNGs are typical logo formats
  if (src.endsWith('.svg')) score += 20;
  if (src.endsWith('.png')) score += 5;

  // Penalize obvious non-logo alts/srcs
  if (alt.includes('hero') || alt.includes('banner')) score -= 50;

  // Penalize huge images (likely hero/banner). Only applies if dimensions known.
  if (opts.width && opts.width > 600) score -= 20;
  if (opts.height && opts.height > 200) score -= 20;

  return score;
}

/**
 * Decode the small set of HTML entities that commonly appear inside attribute
 * values when sites inline an SVG as a `data:` URL (e.g. `&#39;` for `'`).
 * Without this, the captured `src` is not a valid data URL and won't render.
 */
function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getHtmlAttr(tag: string, attr: string): string | undefined {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = tag.match(new RegExp('\\b' + escaped + '\\s*=\\s*(["\\'])([\\s\\S]*?)\\1', 'i'));
  if (quoted?.[2] !== undefined) return quoted[2];
  const unquoted = tag.match(new RegExp('\\b' + escaped + '\\s*=\\s*([^\\s>]+)', 'i'));
  return unquoted?.[1];
}

/**
 * Extract the most likely logo from the captured header HTML.
 *
 * Strategy:
 *   1. Find every <img> in the header and score it (src/alt/class hints,
 *      whether it's inside the site's home link, sane dimensions).
 *   2. If no <img> wins, look for an inline <svg> inside the home link and
 *      serialize it as a `data:image/svg+xml;base64,...` URL so the admin
 *      preview still gets a real, accurate logo thumbnail (this is the
 *      common case for sites built on Elementor/WordPress, including
 *      stayntouch.com).
 */
function extractLogoFromHeader(headerHtml: string, baseUrl: URL): string | null {
  if (!headerHtml) return null;

  // Some sites (e.g. TaxAct) inline their logo as
  // `<img src="data:image/svg+xml,%3csvg ... &#39;...&#39; ...">` where the
  // SVG payload contains HTML entities like `&#39;` and `&amp;`. Browsers
  // would normally decode those when parsing the HTML, but our regex sees
  // the raw attribute text. Decode common entities so the resulting data
  // URL is valid and renders in the preview.
  // (helper declared below)

  // Identify the "home link" (anchor pointing to "/" or the site's own root)
  // so we can boost candidates inside it.
  const homeHost = baseUrl.host.replace(/^www\./, '');
  const homeLinkRanges: Array<[number, number]> = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = anchorRegex.exec(headerHtml)) !== null) {
    const href = (aMatch[1] || '').trim();
    if (!href) continue;
    let isHome = false;
    if (href === '/' || href === '#' || href === baseUrl.origin || href === baseUrl.origin + '/') {
      isHome = true;
    } else {
      try {
        const u = new URL(href, baseUrl.origin);
        const host = u.host.replace(/^www\./, '');
        if (host === homeHost && (u.pathname === '/' || u.pathname === '')) {
          isHome = true;
        }
      } catch { /* relative odd href, skip */ }
    }
    if (isHome) {
      const start = aMatch.index;
      const end = start + aMatch[0].length;
      homeLinkRanges.push([start, end]);
    }
  }
  const isInsideHomeLink = (idx: number) =>
    homeLinkRanges.some(([s, e]) => idx >= s && idx <= e);

  // ---- Pass 1: <img> candidates --------------------------------------------
  const imgRegex = /<img\b[^>]*>/gi;
  let best: { url: string; score: number } | null = null;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(headerHtml)) !== null) {
    const tag = imgMatch[0];
    const srcAttr = getHtmlAttr(tag, 'src');
    if (!srcAttr) continue;
    const rawSrc = decodeHtmlEntities(srcAttr);
    if (!rawSrc || rawSrc.startsWith('data:image/gif')) continue;
    const altAttr = getHtmlAttr(tag, 'alt');
    const classAttr = getHtmlAttr(tag, 'class');
    const widthAttr = getHtmlAttr(tag, 'width');
    const heightAttr = getHtmlAttr(tag, 'height');
    const absSrc = makeAbsoluteUrl(rawSrc, baseUrl);

    const score = scoreLogoCandidate({
      src: absSrc,
      alt: altAttr,
      className: classAttr,
      insideHomeLink: isInsideHomeLink(imgMatch.index),
      width: widthAttr ? parseInt(widthAttr, 10) : undefined,
      height: heightAttr ? parseInt(heightAttr, 10) : undefined,
    });

    if (score > 0 && (!best || score > best.score)) {
      best = { url: absSrc, score };
    }
  }

  if (best) return best.url;

  // ---- Pass 2: inline <svg> inside the home link ---------------------------
  // Many modern site builders (Elementor, Webflow, Framer) ship the logo as an
  // inline SVG — there is no <img> at all. Serialize the first <svg> inside
  // the home link as a base64 data URL so the admin still sees the right mark.
  for (const [s, e] of homeLinkRanges) {
    const linkBody = headerHtml.slice(s, e);
    const svgMatch = linkBody.match(/<svg\b[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      const svg = svgMatch[0];
      try {
        // Encode as UTF-8 base64 (Deno supports btoa on Latin1; we go via TextEncoder)
        const bytes = new TextEncoder().encode(svg);
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        const b64 = btoa(bin);
        return `data:image/svg+xml;base64,${b64}`;
      } catch (e) {
        console.warn('Failed to serialize inline SVG logo:', e);
      }
    }
  }

  // ---- Pass 3: any inline <svg> at the top of the header (last resort) ----
  // Only consider the FIRST SVG in the header — later ones tend to be
  // hamburger icons, search glyphs, etc.
  const firstSvgMatch = headerHtml.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (firstSvgMatch) {
    const svg = firstSvgMatch[0];
    // Skip obvious icon SVGs (very small viewBoxes / icon class names)
    const isLikelyIcon = /\bclass=["'][^"']*(icon|menu|toggle|hamburger|search|caret|chevron|arrow)[^"']*["']/i.test(svg);
    if (!isLikelyIcon) {
      try {
        const bytes = new TextEncoder().encode(svg);
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        return `data:image/svg+xml;base64,${btoa(bin)}`;
      } catch { /* ignore */ }
    }
  }

  return null;
}

// ============== CSS EXTRACTION (fallback + form styles) ==============

async function extractAndInlineCss(html: string, baseUrl: URL): Promise<string> {
  const cssFragments: string[] = [];
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleTagRegex.exec(html)) !== null) {
    if (styleMatch[1]) {
      cssFragments.push(convertCssUrls(styleMatch[1], baseUrl));
    }
  }
  
  const stylesheetUrls = new Set<string>();
  const linkRegexes = [
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi,
    /<link[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/gi,
  ];
  for (const regex of linkRegexes) {
    let m;
    while ((m = regex.exec(html)) !== null) {
      if (m[1]) stylesheetUrls.add(m[1]);
    }
  }
  
  const fetched = await Promise.all(Array.from(stylesheetUrls).map(async (href) => {
    try {
      const abs = makeAbsoluteUrl(href, baseUrl);
      const res = await fetch(abs, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/css,*/*' } });
      if (res.ok) {
        const text = await res.text();
        return convertCssUrls(text, new URL(abs));
      }
    } catch {}
    return '';
  }));
  
  return [...fetched.filter(Boolean), ...cssFragments].join('\n\n');
}

function convertCssUrls(css: string, baseUrl: URL): string {
  return css.replace(/url\(["']?([^"')]+)["']?\)/gi, (_m, url) => `url("${makeAbsoluteUrl(url.trim(), baseUrl)}")`);
}

// ============== FORM STYLE EXTRACTION ==============

function extractFormElementStyles(html: string, css: string, branding: any): FormElementStyles {
  const styles: Partial<FormElementStyles> = {};
  const cssRules = parseCssRules(css);
  
  const inputSelectors = ['input[type="text"]', 'input[type="email"]', 'input', '.form-control', '.input'];
  for (const sel of inputSelectors) {
    const rules = findMatchingRules(cssRules, sel);
    if (rules.length > 0) {
      const m = mergeRules(rules);
      if (m['background-color']) styles.inputBgColor = m['background-color'];
      if (m['color']) styles.inputTextColor = m['color'];
      if (m['border-color']) styles.inputBorderColor = m['border-color'];
      if (m['border']) { const bp = parseBorderShorthand(m['border']); if (bp.color) styles.inputBorderColor = bp.color; if (bp.width) styles.inputBorderWidth = bp.width; }
      if (m['border-radius']) styles.inputBorderRadius = m['border-radius'];
      if (m['padding']) styles.inputPadding = m['padding'];
      if (m['font-size']) styles.inputFontSize = m['font-size'];
      if (m['font-family']) styles.inputFontFamily = m['font-family'];
      break;
    }
  }
  
  const buttonSelectors = ['button[type="submit"]', '.btn-primary', '.btn', 'button'];
  for (const sel of buttonSelectors) {
    const rules = findMatchingRules(cssRules, sel);
    if (rules.length > 0) {
      const m = mergeRules(rules);
      if (m['background-color']) styles.buttonBgColor = m['background-color'];
      if (m['color']) styles.buttonTextColor = m['color'];
      if (m['border-radius']) styles.buttonBorderRadius = m['border-radius'];
      if (m['font-weight']) styles.buttonFontWeight = m['font-weight'];
      break;
    }
  }

  return mergeWithBrandingDefaults(styles, branding);
}

function parseCssRules(css: string): Array<{ selector: string; properties: Record<string, string> }> {
  const rules: Array<{ selector: string; properties: Record<string, string> }> = [];
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selectors = match[1].split(',').map(s => s.trim()).filter(s => s);
    const properties: Record<string, string> = {};
    match[2].split(';').filter(p => p.trim()).forEach(pair => {
      const ci = pair.indexOf(':');
      if (ci > 0) {
        const prop = pair.substring(0, ci).trim().toLowerCase();
        const val = pair.substring(ci + 1).trim();
        if (prop && val) properties[prop] = val;
      }
    });
    for (const s of selectors) {
      if (Object.keys(properties).length > 0) rules.push({ selector: s, properties });
    }
  }
  return rules;
}

function findMatchingRules(rules: Array<{ selector: string; properties: Record<string, string> }>, target: string): Array<Record<string, string>> {
  const tl = target.toLowerCase();
  return rules.filter(r => {
    const rl = r.selector.toLowerCase();
    return rl === tl || rl.includes(tl) || tl.includes(rl);
  }).map(r => r.properties);
}

function mergeRules(rules: Array<Record<string, string>>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const r of rules) Object.assign(merged, r);
  return merged;
}

function parseBorderShorthand(border: string): { width?: string; color?: string } {
  const parts: { width?: string; color?: string } = {};
  const wm = border.match(/(\d+(?:\.\d+)?(?:px|em|rem))/i);
  if (wm) parts.width = wm[1];
  const hm = border.match(/#[0-9a-fA-F]{3,8}/);
  if (hm) parts.color = hm[0];
  else { const rm = border.match(/rgba?\([^)]+\)/); if (rm) parts.color = rm[0]; }
  return parts;
}

function mergeWithBrandingDefaults(styles: Partial<FormElementStyles>, branding: any): FormElementStyles {
  const defaults: FormElementStyles = {
    inputBgColor: '#ffffff', inputTextColor: '#1a1a2e', inputBorderColor: '#e2e8f0',
    inputBorderWidth: '1px', inputBorderRadius: '6px', inputPadding: '12px 16px',
    inputFontSize: '16px', inputFontFamily: 'system-ui, -apple-system, sans-serif',
    inputPlaceholderColor: '#9ca3af', inputFocusBorderColor: '#6366f1',
    inputFocusBoxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
    labelColor: '#374151', labelFontSize: '14px', labelFontWeight: '500',
    labelFontFamily: 'system-ui, -apple-system, sans-serif',
    buttonBgColor: '#6366f1', buttonTextColor: '#ffffff', buttonBorderRadius: '6px',
    buttonFontWeight: '600', containerBgColor: '#ffffff', containerPadding: '24px',
    errorColor: '#ef4444',
  };
  if (branding?.colors) {
    if (branding.colors.primary && !styles.inputFocusBorderColor) defaults.inputFocusBorderColor = branding.colors.primary;
    if (branding.colors.primary && !styles.buttonBgColor) defaults.buttonBgColor = branding.colors.primary;
  }
  if (branding?.fonts?.length > 0) {
    const ff = branding.fonts.map((f: any) => f.family).join(', ') + ', sans-serif';
    if (!styles.inputFontFamily) defaults.inputFontFamily = ff;
    if (!styles.labelFontFamily) defaults.labelFontFamily = ff;
  }
  return { ...defaults, ...Object.fromEntries(Object.entries(styles).filter(([_, v]) => v != null)) } as FormElementStyles;
}
