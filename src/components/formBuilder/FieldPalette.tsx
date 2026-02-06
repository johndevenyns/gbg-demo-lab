import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AVAILABLE_FORM_FIELDS, FormField } from '@/types/demo';
import { 
  User, Mail, Phone, Calendar, Hash, MapPin, Building, DollarSign, 
  FileText, Type, CheckSquare, GripVertical, Search, Heading, AlignLeft, 
  Minus, ShieldCheck
} from 'lucide-react';
import { useState, useMemo } from 'react';

const FIELD_ICONS: Record<string, React.ReactNode> = {
  first_name: <User className="w-4 h-4" />,
  last_name: <User className="w-4 h-4" />,
  middle_name: <User className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  date_of_birth: <Calendar className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  ssn: <Hash className="w-4 h-4" />,
  address_street: <MapPin className="w-4 h-4" />,
  address_city: <MapPin className="w-4 h-4" />,
  address_state: <MapPin className="w-4 h-4" />,
  address_zip: <MapPin className="w-4 h-4" />,
  address_country: <MapPin className="w-4 h-4" />,
  employer: <Building className="w-4 h-4" />,
  income: <DollarSign className="w-4 h-4" />,
  document_type: <FileText className="w-4 h-4" />,
  document_number: <FileText className="w-4 h-4" />,
  text: <Type className="w-4 h-4" />,
  textarea: <Type className="w-4 h-4" />,
  checkbox: <CheckSquare className="w-4 h-4" />,
  select: <FileText className="w-4 h-4" />,
  gender: <User className="w-4 h-4" />,
  nationality: <MapPin className="w-4 h-4" />,
  // Content elements
  heading: <Heading className="w-4 h-4" />,
  paragraph: <AlignLeft className="w-4 h-4" />,
  divider: <Minus className="w-4 h-4" />,
  consent_checkbox: <ShieldCheck className="w-4 h-4" />,
};

const FIELD_CATEGORIES = {
  content: ['heading', 'paragraph', 'divider', 'consent_checkbox'],
  personal: ['first_name', 'last_name', 'middle_name', 'date_of_birth', 'gender', 'nationality'],
  contact: ['email', 'phone'],
  address: ['address_street', 'address_city', 'address_state', 'address_zip', 'address_country'],
  identity: ['ssn', 'document_type', 'document_number'],
  financial: ['employer', 'income'],
  custom: ['text', 'textarea', 'checkbox', 'select'],
};

// Address fields that can be validated by Loqate API
export const ADDRESS_VALIDATION_FIELDS: string[] = ['address_street', 'address_city', 'address_state', 'address_zip', 'address_country'];

// Human-readable field names for validation display
export const ADDRESS_FIELD_LABELS: Record<string, string> = {
  address_street: 'Street',
  address_city: 'City',
  address_state: 'State',
  address_zip: 'ZIP',
  address_country: 'Country',
};

interface DraggableFieldProps {
  field: Omit<FormField, 'id' | 'order'>;
  index: number;
}

function DraggableField({ field, index }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${field.type}-${index}`,
    data: {
      type: 'field',
      field,
      fromPalette: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 p-2 rounded-md border border-border bg-card
        hover:border-primary/50 hover:bg-accent/50 cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}
      `}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground" />
      <span className="text-muted-foreground">
        {FIELD_ICONS[field.type] || <Type className="w-4 h-4" />}
      </span>
      <span className="text-sm font-medium flex-1 truncate">{field.label}</span>
      {field.required && (
        <Badge variant="secondary" className="text-xs px-1">req</Badge>
      )}
    </div>
  );
}

export function FieldPalette() {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('content');

  const filteredFields = useMemo(() => {
    if (!search) return AVAILABLE_FORM_FIELDS;
    const lower = search.toLowerCase();
    return AVAILABLE_FORM_FIELDS.filter(f => 
      f.label.toLowerCase().includes(lower) || 
      f.type.toLowerCase().includes(lower)
    );
  }, [search]);

  const groupedFields = useMemo(() => {
    const groups: Record<string, typeof AVAILABLE_FORM_FIELDS> = {};
    
    Object.entries(FIELD_CATEGORIES).forEach(([category, types]) => {
      const categoryFields = filteredFields.filter(f => types.includes(f.type));
      if (categoryFields.length > 0) {
        groups[category] = categoryFields;
      }
    });
    
    return groups;
  }, [filteredFields]);

  const categoryLabels: Record<string, string> = {
    content: 'Content & Text',
    personal: 'Personal Info',
    contact: 'Contact',
    address: 'Address',
    identity: 'Identity',
    financial: 'Financial',
    custom: 'Custom Fields',
  };

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Form Elements</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
        {/* Field Categories */}
        {Object.entries(groupedFields).map(([category, fields]) => (
          <div key={category}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 transition-colors"
            >
              {categoryLabels[category]}
              <Badge variant="outline" className="text-xs">{fields.length}</Badge>
            </button>
            {(expandedCategory === category || search) && (
              <div className="mt-2 space-y-1.5 pl-1">
                {fields.map((field, index) => (
                  <DraggableField key={`${field.type}-${index}`} field={field} index={index} />
                ))}
              </div>
            )}
          </div>
        ))}
        
        {Object.keys(groupedFields).length === 0 && search && (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No fields match your search</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
