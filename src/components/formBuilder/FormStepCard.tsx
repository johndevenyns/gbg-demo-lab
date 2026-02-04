import { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FormStep, FormField } from '@/types/demo';
import { VERIFICATION_PATHS } from '@/types/formBuilder';
import { ADDRESS_VALIDATION_FIELDS, ADDRESS_FIELD_LABELS } from './FieldPalette';
import { StepActionsConfig } from './StepActionsConfig';
import { VerificationStepConfig } from './VerificationStepConfig';
import { ApiStepConfig } from './ApiStepConfig';
import { PathStepConfig } from './PathStepConfig';
import { VerificationFlowConfig } from './VerificationFlowConfig';
import { PageStepConfig } from './PageStepConfig';
import { MethodSelectionStepConfig } from './MethodSelectionStepConfig';
import { DecisionStepConfig } from './DecisionStepConfig';
import { 
  GripVertical, Trash2, ChevronDown, ChevronUp, Edit2, Check, X,
  User, Mail, Phone, Calendar, Hash, MapPin, Building, DollarSign, 
  FileText, Type, CheckSquare, MapPinCheck, Send, Smartphone, Database, FileCheck,
  Plug, QrCode, Activity, Workflow, SplitSquareVertical
} from 'lucide-react';

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

const PATH_LABELS: Record<string, string> = {
  docbio: 'Document + Biometric',
  databio: 'Data + Biometric',
  dataonly: 'Data Only',
  mdl: 'Mobile Driver\'s License',
};

interface SortableFieldProps {
  field: FormField;
  stepId: string;
  isAddressValidated?: boolean;
  onRemove: () => void;
  onToggleRequired: () => void;
  onUpdateLabel: (label: string) => void;
}

function SortableField({ field, stepId, isAddressValidated, onRemove, onToggleRequired, onUpdateLabel }: SortableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(field.label);
  const isAddressField = ADDRESS_VALIDATION_FIELDS.includes(field.type);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: 'field',
      field,
      stepId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveLabel = () => {
    onUpdateLabel(editLabel);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-md border bg-card
        hover:border-primary/30 group transition-all
        ${isDragging ? 'opacity-50 ring-2 ring-primary shadow-lg' : ''}
        ${isAddressValidated && isAddressField 
          ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/30' 
          : 'border-border'
        }
      `}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-accent rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <span className={`${isAddressValidated && isAddressField ? 'text-green-600' : 'text-muted-foreground'}`}>
        {FIELD_ICONS[field.type] || <Type className="w-4 h-4" />}
      </span>
      
      {isAddressValidated && isAddressField && (
        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
          Validated
        </Badge>
      )}
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel();
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveLabel}>
            <Check className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className="text-sm font-medium flex-1">{field.label}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        </>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Req</span>
          <Switch
            checked={field.required}
            onCheckedChange={onToggleRequired}
            className="scale-75"
          />
        </div>
        
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

interface FormStepCardProps {
  step: FormStep;
  stepNumber: number;
  totalSteps: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateStep: (updates: Partial<FormStep>) => void;
  onRemoveStep: () => void;
  onRemoveField: (fieldId: string) => void;
  onToggleFieldRequired: (fieldId: string) => void;
  onUpdateFieldLabel: (fieldId: string, label: string) => void;
  canDelete: boolean;
}

export function FormStepCard({
  step,
  stepNumber,
  totalSteps,
  isExpanded,
  onToggleExpand,
  onUpdateStep,
  onRemoveStep,
  onRemoveField,
  onToggleFieldRequired,
  onUpdateFieldLabel,
  canDelete,
}: FormStepCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `step-${step.id}`,
    data: {
      type: 'step',
      stepId: step.id,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `step-drag-${step.id}`,
    data: {
      type: 'step-reorder',
      stepId: step.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSaveTitle = () => {
    onUpdateStep({ title: editTitle });
    setIsEditingTitle(false);
  };

  return (
    <Card
      ref={setDragRef}
      style={style}
      className={`
        glass-card transition-all duration-200
        ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}
        ${isOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
      `}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <Badge variant="outline" className="font-mono">
            Step {stepNumber}
          </Badge>
          
          {isEditingTitle ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              className="flex-1 text-left font-semibold hover:text-primary transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {step.title}
            </button>
          )}
          
          {/* Address Validation Toggle - Only show if step has address fields */}
          {(() => {
            const addressFieldsInStep = step.fields.filter(f => ADDRESS_VALIDATION_FIELDS.includes(f.type));
            const hasAddressFields = addressFieldsInStep.length > 0;
            
            if (!hasAddressFields) return null;
            
            return (
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={step.addressValidationEnabled || false}
                  onCheckedChange={(checked) => onUpdateStep({ addressValidationEnabled: checked })}
                  className="scale-75"
                />
                <span 
                  className={`text-xs flex items-center gap-1 ${step.addressValidationEnabled ? 'text-green-600' : 'text-muted-foreground'}`}
                  title={step.addressValidationEnabled 
                    ? `Validating: ${addressFieldsInStep.map(f => ADDRESS_FIELD_LABELS[f.type] || f.label).join(', ')}`
                    : 'Enable to validate address fields with Loqate API'
                  }
                >
                  <MapPinCheck className="w-3 h-3" />
                  Address
                  {step.addressValidationEnabled && (
                    <span className="text-[10px] text-green-500 ml-0.5">
                      ({addressFieldsInStep.length})
                    </span>
                  )}
                </span>
              </div>
            );
          })()}
          {step.stepType === 'verification' && (
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
              <QrCode className="w-3 h-3 mr-1" />
              Verification (Legacy)
            </Badge>
          )}
          {step.stepType === 'api' && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
              <Plug className="w-3 h-3 mr-1" />
              API Step
            </Badge>
          )}
          {step.stepType === 'path' && (
            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 border-cyan-500/30">
              <Workflow className="w-3 h-3 mr-1" />
              Path (Legacy)
            </Badge>
          )}
          {step.stepType === 'verification_flow' && (
            <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 border-cyan-500/30">
              <Workflow className="w-3 h-3 mr-1" />
              {step.verificationFlowConfig?.pathType === 'docbio' && 'Doc + Bio'}
              {step.verificationFlowConfig?.pathType === 'databio' && 'Data + Bio'}
              {step.verificationFlowConfig?.pathType === 'dataonly' && 'Data Only'}
              {step.verificationFlowConfig?.pathType === 'mdl' && 'Mobile ID'}
              {!step.verificationFlowConfig?.pathType && 'Verification'}
            </Badge>
          )}
          {step.stepType === 'page' && (
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
              <FileText className="w-3 h-3 mr-1" />
              Page
            </Badge>
          )}
          {step.stepType === 'decision' && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              <SplitSquareVertical className="w-3 h-3 mr-1" />
              Decision ({step.decisionStepConfig?.choices?.length || 0} choices)
            </Badge>
          )}
          {step.stepType === 'method_selection' && (
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
              <SplitSquareVertical className="w-3 h-3 mr-1" />
              Method Selection
            </Badge>
          )}
          {step.verificationPath && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              {PATH_ICONS[step.verificationPath]}
              <span className="ml-1">{PATH_LABELS[step.verificationPath]}</span>
            </Badge>
          )}
          {step.submitButton && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
              <Send className="w-3 h-3 mr-1" />
              Submit
            </Badge>
          )}
          {step.apiConfig?.enabled && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
              <Plug className="w-3 h-3 mr-1" />
              API
            </Badge>
          )}
          
          <Badge variant="secondary" className="text-xs">
            {step.fields.length} fields
          </Badge>
          
          <div className="flex items-center gap-1">
            {canDelete && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onRemoveStep}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent
          ref={setNodeRef}
          className={`
            pt-0 pb-4 space-y-2 min-h-[100px] transition-colors
            ${isOver ? 'bg-primary/5' : ''}
          `}
        >
          {/* Verification Step Type */}
          {step.stepType === 'verification' ? (
            <div className="space-y-4">
              {/* Verification Preview */}
              <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-6 bg-purple-500/5">
                <div className="flex items-center justify-center gap-8">
                  {step.verificationConfig?.qrCodeEnabled && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                        <QrCode className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-purple-600">
                        {step.verificationConfig?.qrCodeTitle || 'QR Code'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        URL from: {step.verificationConfig?.qrCodeUrlField || '(configure field)'}
                      </p>
                    </div>
                  )}
                  
                  {step.verificationConfig?.statusEnabled && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                        <Activity className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-blue-600">Status Display</p>
                      <p className="text-xs text-muted-foreground">
                        Field: {step.verificationConfig?.statusField || '(configure field)'}
                      </p>
                    </div>
                  )}
                  
                  {step.verificationConfig?.mobileIdEnabled && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                        <Smartphone className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        {step.verificationConfig?.mobileIdTitle || 'Mobile ID'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        URL from: {step.verificationConfig?.mobileIdUrlField || '(configure field)'}
                      </p>
                    </div>
                  )}
                  
                  {!step.verificationConfig?.qrCodeEnabled && 
                   !step.verificationConfig?.statusEnabled && 
                   !step.verificationConfig?.mobileIdEnabled && (
                    <div className="text-center text-muted-foreground">
                      <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Configure verification display options below</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Verification Configuration */}
              <VerificationStepConfig step={step} onUpdateStep={onUpdateStep} />
            </div>
          ) : step.stepType === 'api' ? (
            /* API Step Type */
            <ApiStepConfig step={step} onUpdateStep={onUpdateStep} />
          ) : step.stepType === 'path' ? (
            /* Path Step Type (Legacy) */
            <PathStepConfig step={step} onUpdateStep={onUpdateStep} />
          ) : step.stepType === 'verification_flow' ? (
            /* Verification Flow Step Type */
            <VerificationFlowConfig step={step} onUpdateStep={onUpdateStep} />
          ) : step.stepType === 'page' ? (
            /* Page Step Type */
            <PageStepConfig step={step} onUpdateStep={onUpdateStep} />
          ) : step.stepType === 'method_selection' ? (
            /* Method Selection Step Type */
            <div className="space-y-4">
              {/* Method Selection Preview */}
              <div className="border-2 border-dashed border-indigo-500/30 rounded-lg p-6 bg-indigo-500/5">
                <div className="text-center space-y-4">
                  <SplitSquareVertical className="w-12 h-12 mx-auto text-indigo-500/50" />
                  <div>
                    <p className="font-medium text-indigo-600">
                      {step.methodSelectionConfig?.title || 'Choose your verification method'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {step.methodSelectionConfig?.subtitle || 'Select how you\'d like to verify your identity'}
                    </p>
                  </div>
                  <div className="flex justify-center gap-4 text-sm">
                    {step.methodSelectionConfig?.documentScanEnabled && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <FileText className="w-4 h-4" />
                        <span>Document Scan</span>
                      </div>
                    )}
                    {step.methodSelectionConfig?.mobileIdEnabled && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Smartphone className="w-4 h-4" />
                        <span>Mobile ID ({(step.methodSelectionConfig?.mobileIdProviders || []).filter(p => p.enabled).length} providers)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Method Selection Configuration */}
              <MethodSelectionStepConfig step={step} onUpdateStep={onUpdateStep} />
            </div>
          ) : step.stepType === 'decision' ? (
            /* Decision Step Type */
            <DecisionStepConfig step={step} allSteps={[]} onUpdateStep={onUpdateStep} />
          ) : (
            <>
              {/* Regular Form Step */}
              {step.fields.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
                  <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Drag fields here</p>
                </div>
              ) : (
                <SortableContext
                  items={step.fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {step.fields.map((field) => (
                    <SortableField
                      key={field.id}
                      field={field}
                      stepId={step.id}
                      isAddressValidated={step.addressValidationEnabled}
                      onRemove={() => onRemoveField(field.id)}
                      onToggleRequired={() => onToggleFieldRequired(field.id)}
                      onUpdateLabel={(label) => onUpdateFieldLabel(field.id, label)}
                    />
                  ))}
                </SortableContext>
              )}
              
              {/* Step Actions Configuration */}
              <div className="mt-4 pt-4 border-t border-border">
                <StepActionsConfig
                  step={step}
                  stepNumber={stepNumber}
                  isFirstStep={stepNumber === 1}
                  isLastStep={stepNumber === totalSteps}
                  onUpdateStep={onUpdateStep}
                />
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
