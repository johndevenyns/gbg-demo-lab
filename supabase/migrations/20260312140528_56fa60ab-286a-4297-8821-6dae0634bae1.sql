
INSERT INTO public.global_use_cases (
  title,
  description,
  icon_name,
  default_verification_type,
  default_form_steps,
  default_page_content,
  display_order,
  is_enabled
) VALUES (
  'Log into Account',
  'Sign in to your account portal',
  'LogIn',
  'none',
  '[
    {
      "id": "login-step",
      "title": "Sign In",
      "titleAlignment": "center",
      "description": "",
      "order": 1,
      "stepType": "form",
      "submitAction": "login",
      "fields": [
        {"id": "f-email", "type": "email", "label": "Email Address", "name": "email", "placeholder": "Enter your email", "required": true, "order": 1},
        {"id": "f-password", "type": "password", "label": "Password", "name": "password", "placeholder": "Enter your password", "required": true, "order": 2}
      ],
      "buttons": [
        {"id": "next", "enabled": true, "label": "Sign In"},
        {"id": "back", "enabled": false, "label": "Back"}
      ]
    },
    {
      "id": "login-success",
      "title": "Welcome",
      "titleAlignment": "center",
      "description": "",
      "order": 2,
      "stepType": "page",
      "fields": [],
      "pageStepConfig": {
        "layout": "centered",
        "elements": [
          {"id": "e1", "type": "heading", "order": 1, "content": "Welcome to Your Account", "size": "xl", "alignment": "center", "variant": "success"},
          {"id": "e2", "type": "text", "order": 2, "content": "You have successfully logged into your account.", "alignment": "center", "variant": "default"},
          {"id": "e3", "type": "text", "order": 3, "content": "Your account portal is being built. Check back soon for a full experience.", "alignment": "center", "variant": "muted"}
        ]
      }
    }
  ]'::jsonb,
  '{"heroTitle": "Account Login", "heroSubtitle": "Sign in to access your account", "ctaLabel": "Sign In", "ctaDescription": "Enter your credentials to continue.", "showLandingPage": false}'::jsonb,
  100,
  true
);
