import { requireAdmin, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoverOptions {
  url: string;
  /** Hint about what kind of form to look for. Influences URL filtering and scoring. */
  formType?: 'application' | 'contact' | 'signup' | 'any';
  /** Max number of candidate pages to scrape (default 6). */
  maxPages?: number;
}

interface FormCandidate {
  pageUrl: string;
  formId: string | null;
  selector: string | null;
  fieldCount: number;
  inputTypes: string[];
  hasSubmitButton: boolean;
  detectedKind: 'application' | 'contact' | 'signup' | 'login' | 'newsletter' | 'search' | 'unknown';
  score: number;
  reason: string;
}

const APPLICATION_KEYWORDS = ['apply', 'application', 'membership', 'enroll', 'join', 'register', 'open-account', 'open_account', 'signup', 'sign-up', 'sign_up', 'get-started', 'request', 'quote', 'onboard'];
const CONTACT_KEYWORDS = ['contact', 'contact-us', 'reach', 'support', 'inquiry', 'enquiry', 'get-in-touch', 'help'];
const LOGIN_KEYWORDS = ['login', 'log-in', 'log_in', 'signin', 'sign-in', 'sign_in', 'auth'];
const NEWSLETTER_KEYWORDS = ['newsletter', 'subscribe', 'mailing'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { url, formType = 'any', maxPages = 6 } = (await req.json()) as DiscoverOptions;
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const baseUrl = new URL(formattedUrl);

    console.log(`[discover-forms] Starting form discovery on ${baseUrl.origin}, formType=${formType}, maxPages=${maxPages}`);

    // Step 1: Map the site to discover all URLs.
    const mapResp = await fetch('https://api.firecrawl.dev/v2/map', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: baseUrl.origin, limit: 200, includeSubdomains: false }),
    });
    const mapData = await mapResp.json();
    if (!mapResp.ok) {
      console.error('[discover-forms] map failed:', mapData);
      return new Response(JSON.stringify({ success: false, error: mapData.error || 'Failed to map site' }), {
        status: mapResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allLinks: string[] = (mapData.links || mapData.data?.links || [])
      .map((l: unknown) => (typeof l === 'string' ? l : (l as { url?: string })?.url))
      .filter((l: unknown): l is string => typeof l === 'string');

    console.log(`[discover-forms] Mapped ${allLinks.length} URLs`);

    // Step 2: Score URLs based on path keywords and pick top candidates.
    const candidates = scoreCandidateUrls(allLinks, baseUrl, formType);
    // Always include the entry URL as a candidate.
    if (!candidates.find((c) => c.url === formattedUrl)) candidates.unshift({ url: formattedUrl, score: 50, kind: 'unknown' });
    const topCandidates = candidates.slice(0, maxPages);
    console.log(`[discover-forms] Top ${topCandidates.length} URL candidates:`, topCandidates.map((c) => `${c.url} (${c.score})`));

    // Step 3: Scrape each candidate page in parallel and analyze forms.
    const scrapeResults = await Promise.allSettled(topCandidates.map((c) => scrapeAndExtractForms(c.url, c.kind, apiKey)));

    const allForms: FormCandidate[] = [];
    for (const r of scrapeResults) {
      if (r.status === 'fulfilled' && r.value) {
        allForms.push(...r.value);
      }
    }

    if (allForms.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No forms found on this site. Try entering a specific page URL with the form (e.g., /apply or /contact).',
        searchedUrls: topCandidates.map((c) => c.url),
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 4: Apply formType bias and pick the best.
    rescoreForFormType(allForms, formType);
    allForms.sort((a, b) => b.score - a.score);
    const best = allForms[0];

    console.log(`[discover-forms] Best form: ${best.pageUrl} #${best.formId || '(no-id)'} score=${best.score} kind=${best.detectedKind} fields=${best.fieldCount}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        best,
        candidates: allForms.slice(0, 10),
        scannedUrls: topCandidates.map((c) => c.url),
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[discover-forms] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to discover forms';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================
// URL scoring
// ============================================================
function scoreCandidateUrls(
  links: string[],
  baseUrl: URL,
  formType: 'application' | 'contact' | 'signup' | 'any',
): Array<{ url: string; score: number; kind: 'application' | 'contact' | 'signup' | 'login' | 'newsletter' | 'unknown' }> {
  const seen = new Set<string>();
  const scored: Array<{ url: string; score: number; kind: ReturnType<typeof detectUrlKind> }> = [];

  for (const link of links) {
    let parsed: URL;
    try { parsed = new URL(link, baseUrl.origin); } catch { continue; }
    if (parsed.origin !== baseUrl.origin) continue; // same-origin only
    const normalized = parsed.origin + parsed.pathname.replace(/\/$/, '');
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const path = parsed.pathname.toLowerCase();
    const kind = detectUrlKind(path);
    let score = 10;

    if (kind === 'application') score += 80;
    else if (kind === 'contact') score += 60;
    else if (kind === 'signup') score += 70;
    else if (kind === 'login') score += 25;
    else if (kind === 'newsletter') score -= 20;

    // Slight bias for shorter paths (top-level pages are usually the canonical forms).
    const depth = (path.match(/\//g) || []).length;
    score -= Math.min(depth * 3, 15);

    // Heavy penalty for blog/news/article/legal/help-center pages — rarely have apply/contact forms.
    if (/\b(blog|news|article|press|story|stories|legal|terms|privacy|policy|cookie|sitemap|404)\b/.test(path)) score -= 50;

    // Apply formType filter (don't drop, just bias).
    if (formType === 'application' && kind === 'application') score += 30;
    if (formType === 'contact' && kind === 'contact') score += 30;
    if (formType === 'signup' && (kind === 'signup' || kind === 'application')) score += 30;

    scored.push({ url: parsed.toString(), score, kind });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function detectUrlKind(path: string): 'application' | 'contact' | 'signup' | 'login' | 'newsletter' | 'unknown' {
  if (CONTACT_KEYWORDS.some((k) => path.includes(k))) return 'contact';
  if (APPLICATION_KEYWORDS.some((k) => path.includes(k))) return 'application';
  if (LOGIN_KEYWORDS.some((k) => path.includes(k))) return 'login';
  if (NEWSLETTER_KEYWORDS.some((k) => path.includes(k))) return 'newsletter';
  return 'unknown';
}

// ============================================================
// Page scraping + form detection
// ============================================================
async function scrapeAndExtractForms(
  pageUrl: string,
  urlKind: ReturnType<typeof detectUrlKind>,
  apiKey: string,
): Promise<FormCandidate[]> {
  try {
    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: pageUrl,
        formats: ['rawHtml'],
        onlyMainContent: false,
        waitFor: 2500,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.warn(`[discover-forms] scrape failed for ${pageUrl}:`, data?.error);
      return [];
    }
    const html: string = data.data?.rawHtml || data.rawHtml || '';
    if (!html) return [];

    const forms = extractFormsFromHtml(html);
    return forms.map((f) => ({
      pageUrl,
      formId: f.formId,
      selector: f.selector,
      fieldCount: f.fieldCount,
      inputTypes: f.inputTypes,
      hasSubmitButton: f.hasSubmitButton,
      detectedKind: classifyForm(f, urlKind),
      score: scoreForm(f, urlKind),
      reason: f.reason,
    }));
  } catch (e) {
    console.warn(`[discover-forms] scrape error for ${pageUrl}:`, e);
    return [];
  }
}

interface RawForm {
  formId: string | null;
  selector: string | null;
  fieldCount: number;
  inputTypes: string[];
  hasSubmitButton: boolean;
  innerText: string;
  reason: string;
}

function extractFormsFromHtml(html: string): RawForm[] {
  const forms: RawForm[] = [];

  // Find every <form> tag (with balanced extraction).
  const formRegex = /<form\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = formRegex.exec(html)) !== null) {
    const startIndex = m.index;
    const tagOpen = m[0];
    const block = extractBlock(html, startIndex, 'form');
    if (!block) continue;

    const idMatch = tagOpen.match(/\sid=["']([^"']+)["']/i);
    const formId = idMatch?.[1] || null;
    const nameMatch = tagOpen.match(/\sname=["']([^"']+)["']/i);
    const classMatch = tagOpen.match(/\sclass=["']([^"']+)["']/i);

    const inputs = analyzeFormBlock(block);
    if (inputs.fieldCount === 0) continue;

    forms.push({
      formId,
      selector: formId ? `#${formId}` : (nameMatch ? `form[name="${nameMatch[1]}"]` : (classMatch ? `form.${classMatch[1].split(/\s+/)[0]}` : 'form')),
      fieldCount: inputs.fieldCount,
      inputTypes: inputs.types,
      hasSubmitButton: inputs.hasSubmit,
      innerText: stripTags(block).slice(0, 800).toLowerCase(),
      reason: `<form> with ${inputs.fieldCount} fields`,
    });
  }

  // Also look for "form-like" containers (divs/sections with multiple inputs but no <form> wrapper — common in modern SPA forms).
  const containerRegex = /<(?:div|section)\b[^>]*\s(?:id|class|data-testid)=["'][^"']*(?:form|signup|signin|login|apply|application|contact|register|enroll)[^"']*["'][^>]*>/gi;
  while ((m = containerRegex.exec(html)) !== null) {
    const startIndex = m.index;
    const tagMatch = m[0].match(/^<(\w+)/);
    if (!tagMatch) continue;
    const block = extractBlock(html, startIndex, tagMatch[1]);
    if (!block) continue;
    // Skip if this container is already inside a <form> we captured.
    if (forms.some((f) => block.length < 50 || f.fieldCount > 0 && block.includes(`id="${f.formId}"`))) continue;

    const idMatch = m[0].match(/\sid=["']([^"']+)["']/i);
    const containerId = idMatch?.[1] || null;
    const inputs = analyzeFormBlock(block);
    if (inputs.fieldCount < 2) continue; // need at least 2 fields to count as a form

    forms.push({
      formId: containerId,
      selector: containerId ? `#${containerId}` : null,
      fieldCount: inputs.fieldCount,
      inputTypes: inputs.types,
      hasSubmitButton: inputs.hasSubmit,
      innerText: stripTags(block).slice(0, 800).toLowerCase(),
      reason: `form-like container with ${inputs.fieldCount} fields`,
    });
  }

  return forms;
}

function analyzeFormBlock(block: string): { fieldCount: number; types: string[]; hasSubmit: boolean } {
  const types: string[] = [];
  let count = 0;

  // <input type="X"> (default text)
  const inputRe = /<input\b[^>]*>/gi;
  let im: RegExpExecArray | null;
  while ((im = inputRe.exec(block)) !== null) {
    const tag = im[0];
    const typeMatch = tag.match(/\stype=["']?([a-z-]+)["']?/i);
    const t = (typeMatch?.[1] || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(t)) continue;
    types.push(t);
    count++;
  }

  // <select>, <textarea>
  const selectCount = (block.match(/<select\b/gi) || []).length;
  const textareaCount = (block.match(/<textarea\b/gi) || []).length;
  for (let i = 0; i < selectCount; i++) types.push('select');
  for (let i = 0; i < textareaCount; i++) types.push('textarea');
  count += selectCount + textareaCount;

  const hasSubmit = /<button\b[^>]*type=["']submit["']|<input\b[^>]*type=["']submit["']|<button\b[^>]*>(?:[^<]*(?:submit|send|apply|register|sign\s*up|continue|next|get\s*started))/i.test(block);

  return { fieldCount: count, types, hasSubmit };
}

function classifyForm(f: RawForm, urlKind: ReturnType<typeof detectUrlKind>): FormCandidate['detectedKind'] {
  const t = f.innerText;
  if (urlKind === 'contact' || /\b(contact|message|how can we help|inquiry|enquiry)\b/.test(t)) return 'contact';
  if (urlKind === 'application' || /\b(apply|application|membership|enroll|open an account|get started|request a quote)\b/.test(t)) return 'application';
  if (urlKind === 'signup' || /\b(sign up|signup|create (an )?account|register|join)\b/.test(t)) return 'signup';
  if (urlKind === 'login' || /\b(log\s*in|sign\s*in|forgot password)\b/.test(t)) return 'login';
  if (urlKind === 'newsletter' || /\b(newsletter|subscribe to|stay updated|join our list)\b/.test(t)) return 'newsletter';
  if (f.fieldCount === 1 && f.inputTypes.includes('search')) return 'search';
  return 'unknown';
}

function scoreForm(f: RawForm, urlKind: ReturnType<typeof detectUrlKind>): number {
  let score = 0;
  // Field count is the strongest signal — real forms have many fields, search/newsletter have 1-2.
  score += Math.min(f.fieldCount, 15) * 8;
  if (f.hasSubmitButton) score += 15;
  if (f.formId) score += 10;

  // Variety of field types (real forms collect varied data).
  const uniqueTypes = new Set(f.inputTypes).size;
  score += uniqueTypes * 3;

  // Penalize search/newsletter signals.
  if (f.inputTypes.length === 1 && f.inputTypes[0] === 'search') score -= 80;
  if (f.fieldCount === 1 && f.inputTypes.includes('email')) score -= 30; // newsletter
  if (/\b(search|newsletter|subscribe)\b/.test(f.innerText) && f.fieldCount <= 3) score -= 25;

  // Bonus for application/contact keywords in innerText.
  if (/\b(apply|application|enroll|membership|sign up|open an account|create account)\b/.test(f.innerText)) score += 30;
  if (/\b(contact|inquiry|enquiry|reach out)\b/.test(f.innerText)) score += 20;

  // Bonus aligned with URL kind.
  if (urlKind === 'application' || urlKind === 'signup' || urlKind === 'contact') score += 20;

  return score;
}

function rescoreForFormType(forms: FormCandidate[], formType: 'application' | 'contact' | 'signup' | 'any') {
  if (formType === 'any') return;
  for (const f of forms) {
    if (formType === 'contact' && f.detectedKind === 'contact') f.score += 50;
    if (formType === 'application' && (f.detectedKind === 'application' || f.detectedKind === 'signup')) f.score += 50;
    if (formType === 'signup' && (f.detectedKind === 'signup' || f.detectedKind === 'application')) f.score += 50;
    if (formType !== 'any' && (f.detectedKind === 'login' || f.detectedKind === 'newsletter' || f.detectedKind === 'search')) f.score -= 30;
  }
}

// ============================================================
// Helpers
// ============================================================
function extractBlock(html: string, startIndex: number, tagName: string): string | null {
  const open = html.substring(startIndex).match(new RegExp(`^<${tagName}\\b[^>]*>`, 'i'));
  if (!open) return null;
  if (open[0].endsWith('/>')) return open[0];
  let depth = 1;
  let pos = startIndex + open[0].length;
  const openRe = new RegExp(`<${tagName}\\b[\\s>]`, 'gi');
  const closeRe = new RegExp(`</${tagName}>`, 'gi');
  while (depth > 0 && pos < html.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const o = openRe.exec(html);
    const c = closeRe.exec(html);
    if (!c) break;
    if (!o || c.index < o.index) {
      depth--;
      pos = c.index + c[0].length;
    } else {
      depth++;
      pos = o.index + o[0].length;
    }
  }
  if (depth !== 0) return null;
  return html.substring(startIndex, pos);
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}