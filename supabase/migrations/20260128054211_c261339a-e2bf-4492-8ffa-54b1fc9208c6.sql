-- Add form_style column to store styling configuration
ALTER TABLE public.demo_environments
ADD COLUMN form_style jsonb DEFAULT '{
  "source": "default",
  "fontFamily": "Inter, system-ui, sans-serif",
  "fontSize": "base",
  "borderRadius": "md",
  "borderWidth": "1",
  "inputBgColor": "#ffffff",
  "inputTextColor": "#1a1a2e",
  "inputBorderColor": "#e2e8f0",
  "inputFocusBorderColor": "#6366f1",
  "labelColor": "#374151",
  "errorColor": "#ef4444",
  "successColor": "#22c55e"
}'::jsonb;