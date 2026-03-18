
UPDATE demo_environments
SET
  mirror_html_footer_html = REPLACE(
    mirror_html_footer_html,
    '<img class="qr-code" src="https://www.go2bank.com/content/dam/go2bank/images/g2b-refresh/global/footer/QR-code.svg" alt="go2bank-qr-code" width="108" height="108">',
    ''
  ),
  updated_at = now()
WHERE id = 'd10c92bd-7130-49c2-bf9f-95ebde501b14';
