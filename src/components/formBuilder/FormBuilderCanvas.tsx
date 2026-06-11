import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePersistedStringSet } from '@/hooks/usePersistedState';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { FormStep, FormField, DemoEnvironment } from '@/types/demo';
import { FormStepCard } from './FormStepCard';
import { FieldPalette } from './FieldPalette';
import { AddStepDialog, StepTypeOption } from './AddStepDialog';
import { DecisionBranchesView } from './DecisionBranchesView';
import { Plus, GripVertical } from 'lucide-react';

interface FormBuilderCanvasProps {
  steps: FormStep[];
  onUpdateSteps: (steps: FormStep[]) => void;
  demo?: DemoEnvironment;
}

export function FormBuilderCanvas({ steps, onUpdateSteps, demo }: FormBuilderCanvasProps) {
  const persistKey = `formBuilder.expandedSteps.${demo?.id ?? 'default'}`;
  const [expandedSteps, setExpandedSteps] = usePersistedStringSet(
    persistKey,
    steps.map(s => s.id),
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeData, setActiveData] = useState<any>(null);
  const [addStepDialogOpen, setAddStepDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const generateId = () => crypto.randomUUID();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setActiveData(event.active.data.current);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Preview logic could go here
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveData(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle dropping special elements (submit, paths, verification flow, api step, page step)

    // Handle Verification Flow step - adds a new verification flow step (combines old path + verification)
    if (activeData?.fromPalette && activeData?.type === 'verification_flow_step') {
      const newStep: FormStep = {
        id: generateId(),
        title: 'Identity Verification',
        order: steps.length + 1,
        stepType: 'verification_flow',
        fields: [],
        verificationFlowConfig: {
          pathType: 'docbio',
          qrCodeEnabled: true,
          qrCodeTitle: 'Scan to Verify',
          qrCodeInstructions: 'Scan this QR code with your mobile device to complete verification',
          statusEnabled: true,
          statusPollingInterval: 5,
          mobileIdEnabled: false,
          autoAdvanceOnComplete: true,
          showBackButton: true,
          backButtonLabel: 'Back',
        },
      };
      onUpdateSteps([...steps, newStep]);
      setExpandedSteps(prev => new Set([...prev, newStep.id]));
      return;
    }

    // Handle Page step - adds a new customizable page step
    if (activeData?.fromPalette && activeData?.type === 'page_step') {
      const newStep: FormStep = {
        id: generateId(),
        title: 'Display Page',
        order: steps.length + 1,
        stepType: 'page',
        fields: [],
        pageStepConfig: {
          layout: 'centered',
          elements: [
            {
              id: generateId(),
              type: 'heading',
              order: 0,
              content: 'Verification Complete',
              size: 'xl',
              alignment: 'center',
            },
            {
              id: generateId(),
              type: 'text',
              order: 1,
              content: 'Your reference ID is {{referenceId}}',
              alignment: 'center',
            },
          ],
        },
      };
      onUpdateSteps([...steps, newStep]);
      setExpandedSteps(prev => new Set([...prev, newStep.id]));
      return;
    }

    // Handle API step - adds a new API submission step
    if (activeData?.fromPalette && activeData?.type === 'api_step') {
      const newStep: FormStep = {
        id: generateId(),
        title: 'API Submission',
        order: steps.length + 1,
        stepType: 'api',
        fields: [],
        apiStepConfig: {
          method: 'POST',
          autoAdvanceOnSuccess: true,
          autoAdvanceDelay: 2,
        },
      };
      onUpdateSteps([...steps, newStep]);
      setExpandedSteps(prev => new Set([...prev, newStep.id]));
      return;
    }

    // Legacy: Handle Path step - adds a new verification path step (deprecated)
    if (activeData?.fromPalette && activeData?.type === 'path_step') {
      const newStep: FormStep = {
        id: generateId(),
        title: 'Verification Path',
        order: steps.length + 1,
        stepType: 'path',
        fields: [],
        pathStepConfig: {
          pathType: 'docbio',
          autoAdvance: true,
        },
      };
      onUpdateSteps([...steps, newStep]);
      setExpandedSteps(prev => new Set([...prev, newStep.id]));
      return;
    }

    // Legacy: Handle verification step - adds a new verification step (deprecated)
    if (activeData?.fromPalette && activeData?.type === 'verification_step') {
      const newStep: FormStep = {
        id: generateId(),
        title: 'Verification',
        order: steps.length + 1,
        stepType: 'verification',
        fields: [],
        verificationConfig: {
          qrCodeEnabled: true,
          qrCodeTitle: 'Scan to Verify',
          qrCodeInstructions: 'Scan this QR code with your mobile device to complete verification',
          statusEnabled: true,
          statusPollingInterval: 5,
          mobileIdEnabled: false,
          autoAdvanceOnComplete: true,
        },
      };
      onUpdateSteps([...steps, newStep]);
      setExpandedSteps(prev => new Set([...prev, newStep.id]));
      return;
    }

    // Legacy: Handle method selection step (deprecated)
    if (activeData?.fromPalette && activeData?.type === 'method_selection_step') {
      const newStep: FormStep = {
        id: generateId(),
        title: 'Choose Verification Method',
        order: steps.length + 1,
        stepType: 'method_selection',
        fields: [],
        methodSelectionConfig: {
          title: 'Choose your verification method',
          subtitle: 'Select how you\'d like to verify your identity',
          documentScanEnabled: true,
          documentScanTitle: 'Document Verification',
          documentScanDescription: 'Scan your driver\'s license or ID and take a selfie',
          documentScanPath: 'docbio',
          mobileIdEnabled: true,
          mobileIdProviders: [],
        },
      };
      onUpdateSteps([...steps, newStep]);
      setExpandedSteps(prev => new Set([...prev, newStep.id]));
      return;
    }

    if (activeData?.fromPalette && activeData?.type === 'submit_button' && overData?.type === 'step') {
      const targetStepId = overData.stepId;
      onUpdateSteps(steps.map(step => 
        step.id === targetStepId 
          ? { ...step, submitButton: true }
          : step
      ));
      return;
    }

    if (activeData?.fromPalette && activeData?.type === 'verification_path' && overData?.type === 'step') {
      const targetStepId = overData.stepId;
      const pathId = activeData.pathId as 'docbio' | 'databio' | 'dataonly' | 'did';
      onUpdateSteps(steps.map(step => 
        step.id === targetStepId 
          ? { ...step, verificationPath: pathId }
          : step
      ));
      return;
    }

    // Handle dropping a field from palette
    if (activeData?.fromPalette && activeData?.type === 'field' && overData?.type === 'step') {
      const targetStepId = overData.stepId;
      const field = activeData.field;
      
      const newField: FormField = {
        ...field,
        id: generateId(),
        order: steps.find(s => s.id === targetStepId)?.fields.length || 0,
      };

      const newSteps = steps.map(step => {
        if (step.id === targetStepId) {
          return {
            ...step,
            fields: [...step.fields, newField],
          };
        }
        return step;
      });

      onUpdateSteps(newSteps);
      return;
    }

    // Handle reordering fields within or between steps
    if (activeData?.type === 'field' && activeData?.stepId) {
      const sourceStepId = activeData.stepId;
      const activeFieldId = active.id as string;
      
      // Find target step - could be from over.data or from the over.id prefix
      let targetStepId = overData?.stepId;
      if (!targetStepId && typeof over.id === 'string') {
        if (over.id.startsWith('step-')) {
          targetStepId = over.id.replace('step-', '');
        } else {
          // Field dropped on another field - find which step that field belongs to
          for (const step of steps) {
            if (step.fields.some(f => f.id === over.id)) {
              targetStepId = step.id;
              break;
            }
          }
        }
      }

      if (!targetStepId) return;

      if (sourceStepId === targetStepId) {
        // Reordering within same step
        const step = steps.find(s => s.id === sourceStepId);
        if (!step) return;

        const activeIndex = step.fields.findIndex(f => f.id === activeFieldId);
        const overIndex = step.fields.findIndex(f => f.id === over.id);

        if (activeIndex === -1 || overIndex === -1) return;

        const newFields = [...step.fields];
        const [removed] = newFields.splice(activeIndex, 1);
        newFields.splice(overIndex, 0, removed);

        const reorderedFields = newFields.map((f, i) => ({ ...f, order: i }));

        onUpdateSteps(
          steps.map(s => s.id === sourceStepId ? { ...s, fields: reorderedFields } : s)
        );
      } else {
        // Moving between steps
        const sourceStep = steps.find(s => s.id === sourceStepId);
        const targetStep = steps.find(s => s.id === targetStepId);
        if (!sourceStep || !targetStep) return;

        const fieldToMove = sourceStep.fields.find(f => f.id === activeFieldId);
        if (!fieldToMove) return;

        const newSourceFields = sourceStep.fields
          .filter(f => f.id !== activeFieldId)
          .map((f, i) => ({ ...f, order: i }));

        let insertIndex = targetStep.fields.length;
        if (overData?.type === 'field') {
          insertIndex = targetStep.fields.findIndex(f => f.id === over.id);
          if (insertIndex === -1) insertIndex = targetStep.fields.length;
        }

        const newTargetFields = [...targetStep.fields];
        newTargetFields.splice(insertIndex, 0, { ...fieldToMove, order: insertIndex });
        const reorderedTargetFields = newTargetFields.map((f, i) => ({ ...f, order: i }));

        onUpdateSteps(
          steps.map(s => {
            if (s.id === sourceStepId) return { ...s, fields: newSourceFields };
            if (s.id === targetStepId) return { ...s, fields: reorderedTargetFields };
            return s;
          })
        );
      }
    }

    // Handle reordering steps
    if (activeData?.type === 'step-reorder' && overData?.type === 'step-reorder') {
      const activeStepId = activeData.stepId;
      const overStepId = overData.stepId;

      if (activeStepId === overStepId) return;

      const activeIndex = steps.findIndex(s => s.id === activeStepId);
      const overIndex = steps.findIndex(s => s.id === overStepId);

      if (activeIndex === -1 || overIndex === -1) return;

      const newSteps = [...steps];
      const [removed] = newSteps.splice(activeIndex, 1);
      newSteps.splice(overIndex, 0, removed);

      const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i + 1 }));
      onUpdateSteps(reorderedSteps);
    }
  };

  const handleAddStep = useCallback((type: StepTypeOption, title: string) => {
    const stepId = generateId();
    let newStep: FormStep;

    if (type === 'form') {
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'form',
        fields: [],
      };
    } else if (type === 'verification') {
      // Single verification option - defaults to docbio, user can change type in the step config
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'verification_flow',
        fields: [],
        verificationFlowConfig: {
          pathType: 'docbio',
          qrCodeEnabled: true,
          qrCodeTitle: 'Scan to Verify',
          qrCodeInstructions: 'Scan this QR code with your mobile device to complete verification',
          statusEnabled: true,
          statusPollingInterval: 5,
          mobileIdEnabled: false,
          autoAdvanceOnComplete: true,
          showBackButton: true,
          backButtonLabel: 'Back',
        },
      };
    } else if (type === 'api') {
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'api',
        fields: [],
        apiStepConfig: {
          method: 'POST',
          autoAdvanceOnSuccess: true,
          autoAdvanceDelay: 2,
        },
      };
    } else if (type === 'page') {
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'page',
        fields: [],
        pageStepConfig: {
          layout: 'centered',
          elements: [
            {
              id: generateId(),
              type: 'heading',
              order: 0,
              content: 'Page Title',
              size: 'xl',
              alignment: 'center',
            },
            {
              id: generateId(),
              type: 'text',
              order: 1,
              content: 'Add your content here',
              alignment: 'center',
            },
          ],
        },
      };
    } else if (type === 'hosted_journey') {
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'hosted_journey',
        fields: [],
        hostedJourneyConfig: {
          url: '',
          height: '600px',
          allowFullScreen: true,
        },
      };
    } else if (type === 'decision') {
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'decision',
        fields: [],
        decisionStepConfig: {
          title: 'Choose Your Path',
          subtitle: 'Select how you would like to proceed',
          choices: [
            {
              id: generateId(),
              label: 'Document Scan',
              description: 'Scan your ID and take a selfie',
              icon: 'document',
              collapsedByDefault: false,
              destinationType: 'verification',
              verificationType: 'docbio',
              useCustomResultPages: false,
            },
            {
              id: generateId(),
              label: 'Digital ID',
              description: 'Use your Digital ID',
              icon: 'smartphone',
              collapsedByDefault: false,
              destinationType: 'verification',
              verificationType: 'did',
              useCustomResultPages: false,
            },
          ],
          defaultExpanded: true,
          showBackButton: true,
          backButtonLabel: 'Back',
        },
      };
    } else if (type === 'unified_verification') {
      // New unified verification step
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'unified_verification',
        fields: [],
        unifiedVerificationConfig: {
          methodSelection: 'admin_preselect',
          enabledTypes: ['docbio'],
          typeConfigs: {},
          successDestination: 'default',
          failureDestination: 'default',
          showBackButton: true,
          backButtonLabel: 'Back',
          showNextButton: false,
          nextButtonLabel: 'Continue',
        },
      };
    } else {
      // Fallback to form step
      newStep = {
        id: stepId,
        title,
        order: steps.length + 1,
        stepType: 'form',
        fields: [],
      };
    }

    onUpdateSteps([...steps, newStep]);
    setExpandedSteps(prev => new Set([...prev, stepId]));
  }, [steps, onUpdateSteps]);

  const removeStep = useCallback((stepId: string) => {
    const newSteps = steps
      .filter(s => s.id !== stepId)
      .map((s, i) => ({ ...s, order: i + 1 }));
    onUpdateSteps(newSteps);
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }, [steps, onUpdateSteps]);

  const updateStep = useCallback((stepId: string, updates: Partial<FormStep>) => {
    onUpdateSteps(
      steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    );
  }, [steps, onUpdateSteps]);

  const removeField = useCallback((stepId: string, fieldId: string) => {
    onUpdateSteps(
      steps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields
            .filter(f => f.id !== fieldId)
            .map((f, i) => ({ ...f, order: i })),
        };
      })
    );
  }, [steps, onUpdateSteps]);

  const toggleFieldRequired = useCallback((stepId: string, fieldId: string) => {
    onUpdateSteps(
      steps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...f, required: !f.required } : f
          ),
        };
      })
    );
  }, [steps, onUpdateSteps]);

  const updateFieldLabel = useCallback((stepId: string, fieldId: string, label: string) => {
    onUpdateSteps(
      steps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...f, label } : f
          ),
        };
      })
    );
  }, [steps, onUpdateSteps]);

  const updateFieldContent = useCallback((stepId: string, fieldId: string, content: string) => {
    onUpdateSteps(
      steps.map(s => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id !== fieldId) return f;
            // For consent_checkbox, update consentText; for yes_no, update questionText; for checkbox, update checkboxText; for others, update content
            if (f.type === 'consent_checkbox') {
              return { ...f, consentText: content };
            }
            if (f.type === 'yes_no') {
              return { ...f, questionText: content };
            }
            if (f.type === 'checkbox') {
              return { ...f, checkboxText: content };
            }
            return { ...f, content };
          }),
        };
      })
    );
  }, [steps, onUpdateSteps]);

  const toggleExpand = useCallback((stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Field Palette - Sticky */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)]">
            <FieldPalette />
          </div>
        </div>

        {/* Steps Canvas */}
        <div className="lg:col-span-3 order-1 lg:order-2 space-y-4">
          <SortableContext
            items={steps.map(s => `step-drag-${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {steps.map((step, index) => (
              step.stepType === 'decision' ? (
                <div key={step.id} className="space-y-4">
                  {/* Decision step rendered as branching view */}
                  <DecisionBranchesView
                    step={step}
                    allSteps={steps}
                    demo={demo}
                    onUpdateStep={(updates) => updateStep(step.id, updates)}
                  />
                  
                  {/* Option to remove the decision step */}
                  {steps.length > 1 && (
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs"
                        onClick={() => removeStep(step.id)}
                      >
                        Remove Decision Point
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <FormStepCard
                  key={step.id}
                  step={step}
                  stepNumber={index + 1}
                  totalSteps={steps.length}
                  isExpanded={expandedSteps.has(step.id)}
                  allSteps={steps}
                  demo={demo}
                  onToggleExpand={() => toggleExpand(step.id)}
                  onUpdateStep={(updates) => updateStep(step.id, updates)}
                  onRemoveStep={() => removeStep(step.id)}
                  onRemoveField={(fieldId) => removeField(step.id, fieldId)}
                  onToggleFieldRequired={(fieldId) => toggleFieldRequired(step.id, fieldId)}
                  onUpdateFieldLabel={(fieldId, label) => updateFieldLabel(step.id, fieldId, label)}
                  onUpdateFieldContent={(fieldId, content) => updateFieldContent(step.id, fieldId, content)}
                  canDelete={steps.length > 1}
                />
              )
            ))}
          </SortableContext>

          <Button
            variant="outline"
            className="w-full border-dashed h-14"
            onClick={() => setAddStepDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Step
          </Button>
          
          <AddStepDialog
            open={addStepDialogOpen}
            onOpenChange={setAddStepDialogOpen}
            onAddStep={handleAddStep}
          />
        </div>
      </div>

      {/* Drag Overlay - rendered in portal to avoid transform issues */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeId && activeData?.fromPalette && activeData?.type === 'field' && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-primary bg-card shadow-lg">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{activeData.field?.label}</span>
            </div>
          )}
          {activeId && activeData?.fromPalette && (activeData?.type === 'submit_button' || activeData?.type === 'verification_path' || activeData?.type === 'verification_step' || activeData?.type === 'api_step' || activeData?.type === 'path_step' || activeData?.type === 'verification_flow_step' || activeData?.type === 'page_step' || activeData?.type === 'method_selection_step') && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-primary bg-card shadow-lg">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {activeData.type === 'submit_button' && 'Submit Button'}
                {activeData.type === 'verification_path' && 'Verification Path'}
                {activeData.type === 'verification_step' && 'Verification Step'}
                {activeData.type === 'api_step' && 'API Step'}
                {activeData.type === 'path_step' && 'Path Step'}
                {activeData.type === 'verification_flow_step' && 'Verification Flow'}
                {activeData.type === 'page_step' && 'Page Step'}
                {activeData.type === 'method_selection_step' && 'Method Selection'}
              </span>
            </div>
          )}
          {activeId && activeData?.type === 'field' && !activeData.fromPalette && (
            <div className="flex items-center gap-2 p-3 rounded-md border border-primary bg-card shadow-lg">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{activeData.field?.label}</span>
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
