UPDATE public.global_use_cases
SET default_form_steps = '[
  {
    "id": "step-1",
    "title": "Personal Information",
    "order": 1,
    "stepType": "form",
    "fields": [
      {"id": "f1", "type": "first_name", "label": "First Name", "name": "firstName", "required": true, "order": 1},
      {"id": "f2", "type": "last_name", "label": "Last Name", "name": "lastName", "required": true, "order": 2},
      {"id": "f3", "type": "email", "label": "Email", "name": "email", "required": true, "order": 3},
      {"id": "f4", "type": "phone", "label": "Phone", "name": "phone", "required": true, "order": 4}
    ],
    "buttons": [
      {"id": "next", "label": "Continue", "enabled": true},
      {"id": "back", "label": "Back", "enabled": false}
    ]
  },
  {
    "id": "step-2",
    "title": "Identity Verification",
    "order": 2,
    "stepType": "form",
    "fields": [
      {"id": "f5", "type": "date_of_birth", "label": "Date of Birth", "name": "dateOfBirth", "required": true, "order": 1},
      {"id": "f6", "type": "ssn", "label": "SSN (Last 4)", "name": "ssn4", "required": true, "order": 2}
    ],
    "buttons": [
      {"id": "next", "label": "Continue", "enabled": true},
      {"id": "back", "label": "Back", "enabled": true}
    ]
  },
  {
    "id": "step-3",
    "title": "Address",
    "order": 3,
    "stepType": "form",
    "fields": [
      {"id": "f7", "type": "address_street", "label": "Street Address", "name": "streetAddress", "required": true, "order": 1},
      {"id": "f8", "type": "address_city", "label": "City", "name": "city", "required": true, "order": 2},
      {"id": "f9", "type": "address_state", "label": "State", "name": "state", "required": true, "order": 3},
      {"id": "f10", "type": "address_zip", "label": "ZIP Code", "name": "zipCode", "required": true, "order": 4}
    ],
    "buttons": [
      {"id": "next", "label": "Continue", "enabled": true},
      {"id": "back", "label": "Back", "enabled": true}
    ]
  },
  {
    "id": "step-4",
    "title": "Identity Verification",
    "order": 4,
    "stepType": "unified_verification",
    "fields": [],
    "unifiedVerificationConfig": {
      "defaultMethod": "docBio",
      "enabledMethods": ["docBio"],
      "showMethodSelector": false
    },
    "buttons": [
      {"id": "back", "label": "Back", "enabled": true}
    ]
  }
]'::jsonb,
updated_at = now()
WHERE id = '97557dfd-96bc-414e-b5bc-5dd60c9ab06e';