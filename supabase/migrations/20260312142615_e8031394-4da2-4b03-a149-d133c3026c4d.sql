
ALTER TABLE public.demo_users ADD COLUMN IF NOT EXISTS profile_data jsonb DEFAULT '{}'::jsonb;

-- Update Skip the Counter default form steps to include verify details + verification
UPDATE public.global_use_cases
SET default_form_steps = '[
  {
    "id": "code-entry",
    "title": "Enter Your Code",
    "order": 1,
    "stepType": "form",
    "submitAction": "validate_code",
    "fields": [
      {
        "id": "f-code",
        "type": "registration_code",
        "label": "Registration Code",
        "name": "registrationCode",
        "placeholder": "Enter your 6-digit code",
        "required": true,
        "order": 1
      }
    ],
    "buttons": [
      { "id": "next", "enabled": true, "label": "Verify Code" },
      { "id": "back", "enabled": false, "label": "Back" }
    ]
  },
  {
    "id": "verify-details",
    "title": "Verify Your Details",
    "order": 2,
    "stepType": "form",
    "fields": [
      { "id": "f-fn", "type": "first_name", "label": "First Name", "name": "firstName", "required": true, "order": 1 },
      { "id": "f-ln", "type": "last_name", "label": "Last Name", "name": "lastName", "required": true, "order": 2 },
      { "id": "f-em", "type": "email", "label": "Email", "name": "email", "required": true, "order": 3 },
      { "id": "f-ph", "type": "phone", "label": "Phone", "name": "phone", "required": false, "order": 4 },
      { "id": "f-dob", "type": "date_of_birth", "label": "Date of Birth", "name": "dateOfBirth", "required": false, "order": 5 }
    ],
    "buttons": [
      { "id": "next", "enabled": true, "label": "Continue" },
      { "id": "back", "enabled": true, "label": "Back" }
    ]
  },
  {
    "id": "verification",
    "title": "Identity Verification",
    "order": 3,
    "stepType": "unified_verification",
    "fields": [],
    "unifiedVerificationConfig": {
      "enabledMethods": ["docBio"],
      "defaultMethod": "docBio",
      "showMethodSelector": false
    },
    "buttons": [
      { "id": "back", "enabled": true, "label": "Back" }
    ]
  }
]'::jsonb
WHERE title = 'Skip the Counter';
