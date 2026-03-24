import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, XCircle, ChevronDown, Plus, Trash2, GripVertical,
  MessageSquare, UserPlus, LogIn, ExternalLink, ArrowRight, Settings2
} from 'lucide-react';
import { StepCompletionConfig, StepCompletionAction, StepCompletionActionType } from '@/types/demo';

const ACTION_TYPE_OPTIONS: { value: StepCompletionActionType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'show_message', label: 'Show Message', description: 'Display a success/failure message', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'create_account', label: 'Create Account', description: 'Create user account in the demo', icon: <UserPlus className="w-4 h-4" /> },
  { value: 'login_portal', label: 'Log Into Portal', description: 'Authenticate and open the portal', icon: <LogIn className="w-4 h-4" /> },
  { value: 'redirect', label: 'Redirect to URL', description: 'Navigate to an external URL', icon: <ExternalLink className="w-4 h-4" /> },
  { value: 'next_step', label: 'Continue to Next Step', description: 'Advance to the next form step', icon: <ArrowRight className="w-4 h-4" /> },
];

const DEFAULT_SUCCESS_ACTIONS: StepCompletionAction[] = [
  { id: 'default-success', type: 'show_message', order: 0, messageTitle: 'Verification Complete', message: 'Your identity has been verified successfully.' },
];

const DEFAULT_FAILURE_ACTIONS: StepCompletionAction[] = [
  { id: 'default-failure', type: 'show_message', order: 0, messageTitle: 'Verification Failed', message: 'We were unable to verify your identity. Please try again.' },
];

interface StepCompletionActionsConfigProps {
  config?: StepCompletionConfig;
  onChange: (config: StepCompletionConfig) => void;
}

export function StepCompletionActionsConfig({ config, onChange }: StepCompletionActionsConfigProps) {
  const [isExpanded, setIsExpanded] = useState(!!config);
  const [activeTab, setActiveTab] = useState<'success' | 'failure'>('success');

  const completionConfig: StepCompletionConfig = config || {
    onSuccess: DEFAULT_SUCCESS_ACTIONS,
    onFailure: DEFAULT_FAILURE_ACTIONS,
  };

  const handleActionsChange = (type: 'success' | 'failure', actions: StepCompletionAction[]) => {
    onChange({
      ...completionConfig,
      [type === 'success' ? 'onSuccess' : 'onFailure']: actions,
    });
  };

  const addAction = (type: 'success' | 'failure') => {
    const actions = type === 'success' ? completionConfig.onSuccess : completionConfig.onFailure;
    const newAction: StepCompletionAction = {
      id: `action-${Date.now()}`,
      type: 'show_message',
      order: actions.length,
      messageTitle: type === 'success' ? 'Success' : 'Failed',
      message: '',
    };
    handleActionsChange(type, [...actions, newAction]);
  };

  const removeAction = (type: 'success' | 'failure', actionId: string) => {
    const actions = type === 'success' ? completionConfig.onSuccess : completionConfig.onFailure;
    handleActionsChange(type, actions.filter(a => a.id !== actionId).map((a, i) => ({ ...a, order: i })));
  };

  const updateAction = (type: 'success' | 'failure', actionId: string, updates: Partial<StepCompletionAction>) => {
    const actions = type === 'success' ? completionConfig.onSuccess : completionConfig.onFailure;
    handleActionsChange(type, actions.map(a => a.id === actionId ? { ...a, ...updates } : a));
  };

  const renderActionEditor = (action: StepCompletionAction, type: 'success' | 'failure') => {
    const actionMeta = ACTION_TYPE_OPTIONS.find(o => o.value === action.type);
    
    return (
      <div key={action.id} className="border border-border rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <Select
              value={action.type}
              onValueChange={(v) => updateAction(type, action.id, { type: v as StepCompletionActionType })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {ACTION_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => removeAction(type, action.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{actionMeta?.description}</p>

        {/* show_message fields */}
        {action.type === 'show_message' && (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                value={action.messageTitle || ''}
                onChange={(e) => updateAction(type, action.id, { messageTitle: e.target.value })}
                placeholder={type === 'success' ? 'Verification Complete' : 'Verification Failed'}
                className="h-7 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={action.message || ''}
                onChange={(e) => updateAction(type, action.id, { message: e.target.value })}
                placeholder="Message shown to the user..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* redirect fields */}
        {action.type === 'redirect' && (
          <div className="space-y-1">
            <Label className="text-xs">Redirect URL</Label>
            <Input
              type="url"
              value={action.redirectUrl || ''}
              onChange={(e) => updateAction(type, action.id, { redirectUrl: e.target.value })}
              placeholder="https://example.com/next"
              className="h-7 text-sm"
            />
          </div>
        )}

        {/* login_portal hint */}
        {action.type === 'login_portal' && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            User will be authenticated and redirected to the demo's configured portal (e.g. Banking, Pharmacy).
          </p>
        )}

        {/* create_account hint */}
        {action.type === 'create_account' && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            A demo user account will be created from the collected form data (email, name, etc.).
          </p>
        )}
      </div>
    );
  };

  const renderActionsList = (type: 'success' | 'failure') => {
    const actions = type === 'success' ? completionConfig.onSuccess : completionConfig.onFailure;

    return (
      <div className="space-y-3">
        {actions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3">
            No actions configured. Add an action to define what happens on {type}.
          </p>
        )}

        {actions.map(action => renderActionEditor(action, type))}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => addAction(type)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Action
        </Button>

        {actions.length > 1 && (
          <p className="text-xs text-muted-foreground text-center">
            Actions execute in order from top to bottom.
          </p>
        )}
      </div>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Completion Actions
            {config && (
              <Badge variant="secondary" className="text-xs">
                {completionConfig.onSuccess.length + completionConfig.onFailure.length} actions
              </Badge>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        <Card>
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'success' | 'failure')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="success" className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  On Success ({completionConfig.onSuccess.length})
                </TabsTrigger>
                <TabsTrigger value="failure" className="flex items-center gap-2 text-xs">
                  <XCircle className="w-3 h-3 text-red-500" />
                  On Failure ({completionConfig.onFailure.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="success">
                {renderActionsList('success')}
              </TabsContent>

              <TabsContent value="failure">
                {renderActionsList('failure')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
