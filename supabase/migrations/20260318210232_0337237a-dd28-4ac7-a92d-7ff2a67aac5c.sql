
UPDATE demo_environments
SET
  logo_url = 'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo.png',
  uploaded_logo_url = 'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo.png',
  use_uploaded_logo = true,
  mirror_html_header_html = REPLACE(
    REPLACE(
      REPLACE(
        mirror_html_header_html,
        'https://www.go2bank.com/content/dam/go2bank/images/2021/july/partnership-site/Go2bank_logo.svg',
        'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo.png'
      ),
      'Go2Bank Brand Logo',
      'GBank Logo'
    ),
    'Go2bank',
    'GBank'
  ),
  scraped_header_html = REPLACE(
    REPLACE(
      REPLACE(
        scraped_header_html,
        'https://www.go2bank.com/content/dam/go2bank/images/2021/july/partnership-site/Go2bank_logo.svg',
        'https://dklhiwknxpodxfprwjhn.supabase.co/storage/v1/object/public/demo-logos/gbank_logo.png'
      ),
      'Go2Bank Brand Logo',
      'GBank Logo'
    ),
    'Go2bank',
    'GBank'
  ),
  updated_at = now()
WHERE id = 'd10c92bd-7130-49c2-bf9f-95ebde501b14';
