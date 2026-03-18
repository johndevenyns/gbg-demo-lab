
UPDATE demo_environments
SET
  mirror_html_header_html = REPLACE(
    REPLACE(
      mirror_html_header_html,
      'width="340" height="78"',
      'width="400" height="92" style="vertical-align: middle;"'
    ),
    'class="g2b-header__logo-wrapper"',
    'class="g2b-header__logo-wrapper" style="display: flex; align-items: center;"'
  ),
  mirror_html_css = mirror_html_css || '
.g2b-header { display: flex; align-items: center; }
.g2b-header__logo-wrapper { display: flex !important; align-items: center !important; }
.brand-logo-container { display: flex; align-items: center; margin: 0; }
',
  updated_at = now()
WHERE id = 'd10c92bd-7130-49c2-bf9f-95ebde501b14';
