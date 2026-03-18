
UPDATE demo_environments
SET
  logo_url = 'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo-2.png',
  uploaded_logo_url = 'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo-2.png',
  use_uploaded_logo = true,
  mirror_html_header_html = REPLACE(
    REPLACE(
      mirror_html_header_html,
      'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo.png',
      'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo-2.png'
    ),
    'width="260" height="60"',
    'width="340" height="78"'
  ),
  scraped_header_html = REPLACE(
    REPLACE(
      scraped_header_html,
      'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo.png',
      'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo-2.png'
    ),
    'width="260" height="60"',
    'width="340" height="78"'
  ),
  updated_at = now()
WHERE id = 'd10c92bd-7130-49c2-bf9f-95ebde501b14';
