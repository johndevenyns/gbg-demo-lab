UPDATE demo_environments 
SET mirror_html_footer_html = REPLACE(
  mirror_html_footer_html,
  '<div class="grid-row g2b-footer__links-social">',
  '<div class="grid-row g2b-footer__links-social" style="justify-content: center;">'
)
WHERE id = 'd10c92bd-7130-49c2-bf9f-95ebde501b14';