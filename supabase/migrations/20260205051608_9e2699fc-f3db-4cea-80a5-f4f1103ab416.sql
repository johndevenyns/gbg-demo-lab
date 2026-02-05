-- Add separate storage for HTML vs Screenshot mirror captures and a selector for which capture is active.

ALTER TABLE public.demo_environments
ADD COLUMN IF NOT EXISTS mirror_active_method text NOT NULL DEFAULT 'html',
ADD COLUMN IF NOT EXISTS mirror_html_header_html text,
ADD COLUMN IF NOT EXISTS mirror_html_footer_html text,
ADD COLUMN IF NOT EXISTS mirror_html_css text,
ADD COLUMN IF NOT EXISTS mirror_screenshot_header_html text,
ADD COLUMN IF NOT EXISTS mirror_screenshot_footer_html text,
ADD COLUMN IF NOT EXISTS mirror_screenshot_css text;

-- Backfill from legacy scraped_* fields so existing demos keep working.
DO $$
BEGIN
  -- If legacy looks like screenshot (contains <img src=), store into screenshot fields.
  UPDATE public.demo_environments
  SET
    mirror_screenshot_header_html = COALESCE(mirror_screenshot_header_html, scraped_header_html),
    mirror_screenshot_footer_html = COALESCE(mirror_screenshot_footer_html, scraped_footer_html),
    mirror_screenshot_css = COALESCE(mirror_screenshot_css, ''),
    mirror_active_method = COALESCE(mirror_active_method, 'screenshot')
  WHERE
    scraped_header_html IS NOT NULL
    AND scraped_header_html <> ''
    AND position('<img' in scraped_header_html) > 0;

  -- Otherwise treat as HTML/CSS capture.
  UPDATE public.demo_environments
  SET
    mirror_html_header_html = COALESCE(mirror_html_header_html, scraped_header_html),
    mirror_html_footer_html = COALESCE(mirror_html_footer_html, scraped_footer_html),
    mirror_html_css = COALESCE(mirror_html_css, scraped_css),
    mirror_active_method = COALESCE(mirror_active_method, 'html')
  WHERE
    scraped_header_html IS NOT NULL
    AND scraped_header_html <> ''
    AND (position('<img' in scraped_header_html) = 0);
END $$;