import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AVAILABLE_FORM_FIELDS, FormField } from '@/types/demo';
import { VERIFICATION_PATHS } from '@/types/formBuilder';
import { 
  User, Mail, Phone, Calendar, Hash, MapPin, Building, DollarSign, 
  FileText, Type, CheckSquare, GripVertical, Search,
  Smartphone, Database, FileCheck, Workflow, Plug
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
};

const PATH_ICONS: Record<string, React.ReactNode> = {
  docbio: <FileCheck className="w-4 h-4" />,
  databio: <Database className="w-4 h-4" />,
  dataonly: <Database className="w-4 h-4" />,
  mdl: <Smartphone className="w-4 h-4" />,
};

const FIELD_CATEGORIES = {
  personal: ['first_name', 'last_name', 'middle_name', 'date_of_birth', 'gender', 'nationality'],
  contact: ['email', 'phone'],
  address: ['address_street', 'address_city', 'address_state', 'address_zip', 'address_country'],
  identity: ['ssn', 'document_type', 'document_number'],
  financial: ['employer', 'income'],
  custom: ['text', 'textarea', 'checkbox', 'select'],
};

// Address fields that can be validated by Loqate API
// These map to: address1, locality, administrativeArea, postalCode, country
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

// Draggable special element (Paths, Verification Flow, API Step, Page Step)
interface DraggableSpecialProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'address_validation' | 'verification_path' | 'verification_step' | 'api_step' | 'path_step' | 'verification_flow_step' | 'page_step' | 'method_selection_step';
  pathId?: string;
  description?: string;
  variant?: 'default' | 'purple' | 'blue' | 'green' | 'cyan' | 'orange' | 'indigo';
}

function DraggableSpecial({ id, label, icon, type, pathId, description, variant = 'default' }: DraggableSpecialProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `special-${id}`,
    data: {
      type,
      pathId,
      fromPalette: true,
    },
  });

  const variantStyles = {
    default: 'hover:border-primary/50',
    purple: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50',
    blue: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50',
    green: 'border-green-500/30 bg-green-500/5 hover:border-green-500/50',
    cyan: 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50',
    orange: 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50',
    indigo: 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50',
  };

  const iconColors = {
    default: 'text-primary',
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    cyan: 'text-cyan-600',
    orange: 'text-orange-600',
    indigo: 'text-indigo-600',
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 p-2 rounded-md border bg-card
        hover:bg-accent/50 cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${variantStyles[variant]}
        ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}
      `}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground" />
      <span className={iconColors[variant]}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground truncate block">{description}</span>
        )}
      </div>
    </div>
  );
}

export function FieldPalette() {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('personal');

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
        {/* Step Types Section */}
        {!search && (
          <div>
            <button
              onClick={() => setExpandedCategory(expandedCategory === 'step-types' ? null : 'step-types')}
              className="w-full flex items-center justify-between py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Step Types
              </span>
              <Badge variant="outline" className="text-xs">3</Badge>
            </button>
            {expandedCategory === 'step-types' && (
              <div className="mt-2 space-y-1.5 pl-1">
                <DraggableSpecial
                  id="verification-flow-step"
                  label="Verification Flow"
                  icon={<Workflow className="w-4 h-4" />}
                  type="verification_flow_step"
                  description="Full verification with QR & status"
                  variant="cyan"
                />
                <DraggableSpecial
                  id="api-step"
                  label="API Step"
                  icon={<Plug className="w-4 h-4" />}
                  type="api_step"
                  description="API submission between steps"
                  variant="green"
                />
                <DraggableSpecial
                  id="page-step"
                  label="Page Step"
                  icon={<FileText className="w-4 h-4" />}
                  type="page_step"
                  description="Custom display page with API data"
                  variant="orange"
                />
              </div>
            )}
          </div>
        )}

        {/* Verification Paths Section */}
        {!search && (
          <div>
            <button
              onClick={() => setExpandedCategory(expandedCategory === 'paths' ? null : 'paths')}
              className="w-full flex items-center justify-between py-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Verification Paths
              </span>
              <Badge variant="outline" className="text-xs">{VERIFICATION_PATHS.length}</Badge>
            </button>
            {expandedCategory === 'paths' && (
              <div className="mt-2 space-y-1.5 pl-1">
                {VERIFICATION_PATHS.map(path => (
                  <DraggableSpecial
                    key={path.id}
                    id={`path-${path.id}`}
                    label={path.name}
                    icon={PATH_ICONS[path.id]}
                    type="verification_path"
                    pathId={path.id}
                    description={path.description}
                  />
                ))}
              </div>
            )}
          </div>
        )}

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
