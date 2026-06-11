import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, XCircle, ChevronDown, Plus, Trash2, GripVertical,
  FileText, UserPlus, LogIn, ExternalLink, ArrowRight, Settings2
} from 'lucide-react';
import { StepCompletionConfig, StepCompletionAction, StepCompletionActionType } from '@/types/demo';
import type { ExtraCustomPage } from '@/types/demo';
import type { ResultPageConfig } from '@/components/preview/ResultPage';

const ACTION_TYPE_OPTIONS: { value: StepCompletionActionType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'show_result_page', label: 'Show Result Page', description: 'Display a customizable success/failure result page', icon: <FileText className="w-4 h-4" /> },
  { value: 'create_account', label: 'Create Account', description: 'Create user account in the demo', icon: <UserPlus className="w-4 h-4" /> },
  { value: 'login_portal', label: 'Log Into Portal', description: 'Authenticate and open the portal', icon: <LogIn className="w-4 h-4" /> },
  { value: 'redirect', label: 'Redirect to URL', description: 'Navigate to an external URL', icon: <ExternalLink className="w-4 h-4" /> },
  { value: 'next_step', label: 'Continue to Next Step', description: 'Advance to the next form step', icon: <ArrowRight className="w-4 h-4" /> },
];

const DEFAULT_SUCCESS_ACTIONS: StepCompletionAction[] = [
  { id: 'default-success', type: 'show_result_page', order: 0, messageTitle: 'Verification Complete', message: 'Your identity has been verified successfully.', showIcon: true, showReferenceId: true, buttonText: 'Continue' },
];

const DEFAULT_FAILURE_ACTIONS: StepCompletionAction[] = [
  { id: 'default-failure', type: 'show_result_page', order: 0, messageTitle: 'Verification Failed', message: 'We were unable to verify your identity. Please try again.', showIcon: true, showReferenceId: true, buttonText: 'Try Again' },
];

interface StepCompletionActionsConfigProps {
  config?: StepCompletionConfig;
  onChange: (config: StepCompletionConfig) => void;
  inline?: boolean;
  demoSlug?: string;
  extraCustomPages?: ExtraCustomPage[];
  successPageConfig?: ResultPageConfig;
  failurePageConfig?: ResultPageConfig;
}

export function StepCompletionActionsConfig({
  config,
  onChange,
  inline,
  demoSlug,
  extraCustomPages,
  successPageConfig,
  failurePageConfig,
}: StepCompletionActionsConfigProps) {
  const [isExpanded, setIsExpanded] = useState(!!config || !!inline);
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
      type: 'show_result_page',
      order: actions.length,
      messageTitle: type === 'success' ? 'Success' : 'Failed',
      message: '',
      showIcon: true,
      showReferenceId: true,
      buttonText: type === 'success' ? 'Continue' : 'Try Again',
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

    // Build list of custom-page link targets (Success, Failure, extras)
    const slugBase = demoSlug || ':slug';
    const pageTargets: { id: string; label: string; url: string }[] = [
      ...(successPageConfig ? [{
        id: 'success',
        label: `Success Page${successPageConfig.title ? ` — ${successPageConfig.title}` : ''}`,
        url: `/demo/${slugBase}?previewResult=success`,
      }] : []),
      ...(failurePageConfig ? [{
        id: 'failure',
        label: `Failure Page${failurePageConfig.title ? ` — ${failurePageConfig.title}` : ''}`,
        url: `/demo/${slugBase}?previewResult=failure`,
      }] : []),
      ...((extraCustomPages || []).map((p) => ({
        id: `extra:${p.id}`,
        label: p.name,
        url: `/demo/${slugBase}/page/${p.slug}`,
      }))),
    ];
    const matchedTarget = pageTargets.find((t) => action.buttonUrl === t.url);

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

        {/* show_result_page fields */}
        {action.type === 'show_result_page' && (
          <div className="space-y-3">
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
              <Label className="text-xs">Subtitle</Label>
              <Input
                value={action.subtitle || ''}
                onChange={(e) => updateAction(type, action.id, { subtitle: e.target.value })}
                placeholder="A brief subtitle under the title"
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

            {/* Toggle options */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Icon</Label>
              <Switch
                checked={action.showIcon !== false}
                onCheckedChange={(checked) => updateAction(type, action.id, { showIcon: checked })}
                className="scale-75"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Reference ID</Label>
              <Switch
                checked={action.showReferenceId !== false}
                onCheckedChange={(checked) => updateAction(type, action.id, { showReferenceId: checked })}
                className="scale-75"
              />
            </div>

            {/* Button settings */}
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Button</Label>
              <div className="space-y-1">
                <Label className="text-xs">Button Text</Label>
                <Input
                  value={action.buttonText || ''}
                  onChange={(e) => updateAction(type, action.id, { buttonText: e.target.value })}
                  placeholder={type === 'success' ? 'Continue' : 'Try Again'}
                  className="h-7 text-sm"
                />
              </div>

              {type === 'success' && (
                <div className="space-y-1">
                  <Label className="text-xs">Button Action</Label>
                  <Select
                    value={action.buttonAction || 'url'}
                    onValueChange={(v) => updateAction(type, action.id, { buttonAction: v as 'url' | 'portal' })}
                  >
                    <SelectTrigger className="h-7 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="url">Redirect to URL</SelectItem>
                      <SelectItem value="portal">Go to account portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(action.buttonAction !== 'portal' || type === 'failure') && (
                <div className="space-y-2">
                  {pageTargets.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Link to a custom page</Label>
                      <Select
                        value={matchedTarget?.id || '__custom__'}
                        onValueChange={(v) => {
                          if (v === '__custom__') {
                            updateAction(type, action.id, { buttonUrl: '' });
                          } else {
                            const target = pageTargets.find((t) => t.id === v);
                            if (target) updateAction(type, action.id, { buttonUrl: target.url });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-sm">
                          <SelectValue placeholder="Pick a page or use a custom URL" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          <SelectItem value="__custom__">Use a custom URL (below)</SelectItem>
                          {pageTargets.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Targets are managed in the Custom Pages section.
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Button URL (optional)</Label>
                    <Input
                      type="url"
                      value={action.buttonUrl || ''}
                      onChange={(e) => updateAction(type, action.id, { buttonUrl: e.target.value })}
                      placeholder="https://yoursite.com/next-step"
                      className="h-7 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Custom HTML */}
            <div className="border-t border-border pt-3 space-y-1">
              <Label className="text-xs">Custom HTML Content (optional)</Label>
              <Textarea
                value={action.customContent || ''}
                onChange={(e) => updateAction(type, action.id, { customContent: e.target.value })}
                placeholder="<p>Additional custom HTML content...</p>"
                rows={2}
                className="font-mono text-xs"
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

  const content = (
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
  );

  if (inline) {
    return content;
  }

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
            {content}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
