import { supabase } from '@/integrations/supabase/client';
import type { ExtraCustomPage } from '@/types/demo';
import type { ResultPageConfig } from '@/components/preview/ResultPage';

export const HOMEPAGE_PAGE_SLUG = 'home';

export interface HomepageCaptureResult {
  success: boolean;
  page?: ExtraCustomPage;
  error?: string;
}

/** Turn whatever Firecrawl returned (data URL, raw base64, or hosted URL) into a Blob. */
async function screenshotToBlob(screenshot: string): Promise<Blob> {
  if (/^https?:\/\//i.test(screenshot)) {
    const res = await fetch(screenshot);
    if (!res.ok) throw new Error(`Could not download the captured image (${res.status})`);
    return await res.blob();
  }

  const base64 = screenshot.includes(',') ? screenshot.split(',')[1] : screenshot;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

function buildHomepageConfig(
  customerName: string,
  imageUrl: string,
  bgColor: string,
  existing?: ResultPageConfig,
): ResultPageConfig {
  return {
    ...(existing || {}),
    type: 'success',
    title: `${customerName} Home`,
    showIcon: false,
    showButton: false,
    pageMode: 'single_screenshot',
    singleScreenshotUrl: imageUrl,
    singleScreenshotBgColor: existing?.singleScreenshotBgColor || bgColor || '#ffffff',
    singleScreenshotPaddingTop: existing?.singleScreenshotPaddingTop ?? 0,
    singleScreenshotPaddingBottom: existing?.singleScreenshotPaddingBottom ?? 0,
    singleScreenshotFitMode: existing?.singleScreenshotFitMode || 'contain',
    headerSource: existing?.headerSource || 'none',
    footerSource: existing?.footerSource || 'none',
    hotspots: existing?.hotspots || [],
  };
}

/**
 * Captures the customer's homepage, stores the image, and returns a custom page
 * configured to display it. Reuses/refreshes the existing "home" page when present
 * so hotspots and manual tweaks survive a re-capture.
 */
export async function captureCustomerHomepage(params: {
  demoId: string;
  customerName: string;
  siteUrl: string;
  bgColor?: string;
  existingPages?: ExtraCustomPage[];
}): Promise<HomepageCaptureResult> {
  const { demoId, customerName, siteUrl, bgColor, existingPages } = params;

  if (!siteUrl?.trim()) {
    return { success: false, error: 'No customer site URL is set for this demo' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('capture-homepage', {
      body: { url: siteUrl },
    });

    if (error) {
      const details = 'context' in error && error.context ? await error.context.text().catch(() => '') : '';
      return { success: false, error: details || error.message || 'Homepage capture failed' };
    }
    if (!data?.success || !data?.data?.screenshot) {
      return { success: false, error: data?.error || 'No homepage image was returned' };
    }

    const blob = await screenshotToBlob(data.data.screenshot as string);
    const path = `${demoId}/homepage-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('demo-logos')
      .upload(path, blob, { upsert: true, contentType: 'image/png' });
    if (uploadError) {
      return { success: false, error: `Could not store the homepage image: ${uploadError.message}` };
    }
    const imageUrl = supabase.storage.from('demo-logos').getPublicUrl(path).data.publicUrl;

    const existing = (existingPages || []).find((p) => p.slug === HOMEPAGE_PAGE_SLUG);
    const page: ExtraCustomPage = {
      id: existing?.id || `home-${demoId}`,
      slug: HOMEPAGE_PAGE_SLUG,
      name: existing?.name || `${customerName} Home`,
      config: buildHomepageConfig(customerName, imageUrl, bgColor || '#ffffff', existing?.config),
    };

    return { success: true, page };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Homepage capture failed' };
  }
}

/** Merge a captured homepage page into an existing custom page list. */
export function mergeHomepagePage(pages: ExtraCustomPage[] | undefined, page: ExtraCustomPage): ExtraCustomPage[] {
  const list = pages || [];
  const idx = list.findIndex((p) => p.slug === page.slug);
  if (idx === -1) return [...list, page];
  const next = [...list];
  next[idx] = page;
  return next;
}
