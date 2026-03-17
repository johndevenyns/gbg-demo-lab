import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormStep, PageStepConfig as PageStepConfigType, PageElement, PageElementType } from '@/types/demo';
import { 
  FileText, QrCode, Link, CheckCircle, Type, MousePointer, 
  Trash2, GripVertical, ChevronUp, ChevronDown, Clock
} from 'lucide-react';

const ELEMENT_TYPES: { type: PageElementType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'heading', label: 'Heading', icon: <Type className="w-4 h-4" />, description: 'Large title text' },
  { type: 'text', label: 'Text', icon: <FileText className="w-4 h-4" />, description: 'Paragraph or description' },
  { type: 'qr_code', label: 'QR Code', icon: <QrCode className="w-4 h-4" />, description: 'Display QR from API response' },
  { type: 'url_link', label: 'URL Link', icon: <Link className="w-4 h-4" />, description: 'Clickable link from API response' },
  { type: 'status_badge', label: 'Status Badge', icon: <CheckCircle className="w-4 h-4" />, description: 'Status indicator' },
  { type: 'data_field', label: 'Data Field', icon: <FileText className="w-4 h-4" />, description: 'Display API response field' },
  { type: 'button', label: 'Button', icon: <MousePointer className="w-4 h-4" />, description: 'Action button' },
];

interface PageStepConfigProps {
  step: FormStep;
  onUpdateStep: (updates: Partial<FormStep>) => void;
}

export function PageStepConfig({ step, onUpdateStep }: PageStepConfigProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  const config: PageStepConfigType = step.pageStepConfig || {
    layout: 'centered',
    elements: [],
  };

  const handleConfigChange = (updates: Partial<PageStepConfigType>) => {
    onUpdateStep({
      pageStepConfig: { ...config, ...updates }
    });
  };

  const addElement = (type: PageElementType) => {
    const newElement: PageElement = {
      id: crypto.randomUUID(),
      type,
      order: config.elements.length,
      alignment: 'center',
      size: 'md',
      variant: 'default',
    };
    
    if (type === 'heading') {
      newElement.content = 'Page Title';
      newElement.size = 'xl';
    } else if (type === 'text') {
      newElement.content = 'Description text here. Use {{fieldName}} to insert API response data.';
    } else if (type === 'qr_code') {
      newElement.qrSize = 200;
    } else if (type === 'button') {
      newElement.content = 'Continue';
      newElement.buttonAction = 'next';
      newElement.variant = 'primary';
    }
    
    handleConfigChange({ elements: [...config.elements, newElement] });
    setSelectedElement(newElement.id);
  };

  const updateElement = (elementId: string, updates: Partial<PageElement>) => {
    handleConfigChange({
      elements: config.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    });
  };

  const removeElement = (elementId: string) => {
    handleConfigChange({
      elements: config.elements
        .filter(el => el.id !== elementId)
        .map((el, i) => ({ ...el, order: i }))
    });
    if (selectedElement === elementId) setSelectedElement(null);
  };

  const moveElement = (elementId: string, direction: 'up' | 'down') => {
    const index = config.elements.findIndex(el => el.id === elementId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.elements.length) return;
    
    const newElements = [...config.elements];
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    handleConfigChange({
      elements: newElements.map((el, i) => ({ ...el, order: i }))
    });
  };

  const selectedEl = config.elements.find(el => el.id === selectedElement);

  const renderElementPreview = (element: PageElement) => {
    switch (element.type) {
      case 'heading':
        return (
          <p className={`font-bold ${element.size === 'xl' ? 'text-2xl' : element.size === 'lg' ? 'text-xl' : 'text-lg'}`}>
            {element.content || 'Heading'}
          </p>
        );
      case 'text':
        return <p className="text-sm text-muted-foreground">{element.content || 'Text content'}</p>;
      case 'qr_code':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
              <QrCode className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="ml-3 text-xs text-muted-foreground">
              From: {element.qrUrlField || '(set field)'}
            </p>
          </div>
        );
      case 'url_link':
        return (
          <p className="text-sm text-primary underline">
            {element.linkText || element.urlField || 'Link'}
          </p>
        );
      case 'status_badge':
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-600">
            {element.content || 'Status'}
          </Badge>
        );
      case 'data_field':
        return (
          <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
            {element.content || '{{fieldName}}'}
          </p>
        );
      case 'button':
        return (
          <Button size="sm" variant={element.variant === 'primary' ? 'default' : 'outline'}>
            {element.content || 'Button'}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Preview */}
      <div className="border-2 border-dashed border-orange-500/30 rounded-lg p-6 bg-orange-500/5 min-h-[200px]">
        {config.elements.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add elements to design your page</p>
            <p className="text-xs">Use {"{{fieldName}}"} syntax to reference API response data</p>
          </div>
        ) : (
          <div className={`space-y-3 ${config.layout === 'centered' ? 'max-w-md mx-auto' : ''}`}>
            {config.elements.map((element) => (
              <div
                key={element.id}
                onClick={() => setSelectedElement(element.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedElement === element.id 
                    ? 'border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/10' 
                    : 'border-border hover:border-orange-500/50 bg-card'
                }`}
                style={{ textAlign: element.alignment || 'center' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    {ELEMENT_TYPES.find(t => t.type === element.type)?.label}
                  </Badge>
                </div>
                {renderElementPreview(element)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Element Toolbar */}
      <div className="flex flex-wrap gap-2">
        {ELEMENT_TYPES.map((type) => (
          <Button
            key={type.type}
            variant="outline"
            size="sm"
            onClick={() => addElement(type.type)}
            className="gap-1"
          >
            {type.icon}
            {type.label}
          </Button>
        ))}
      </div>

      {/* Element Editor */}
      {selectedEl && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold flex items-center gap-2">
                {ELEMENT_TYPES.find(t => t.type === selectedEl.type)?.icon}
                Edit {ELEMENT_TYPES.find(t => t.type === selectedEl.type)?.label}
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => moveElement(selectedEl.id, 'up')}
                  disabled={config.elements.findIndex(el => el.id === selectedEl.id) === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => moveElement(selectedEl.id, 'down')}
                  disabled={config.elements.findIndex(el => el.id === selectedEl.id) === config.elements.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeElement(selectedEl.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content field for text-based elements */}
            {['heading', 'text', 'status_badge', 'data_field', 'button'].includes(selectedEl.type) && (
              <div className="space-y-2">
                <Label className="text-sm">Content</Label>
                <Input
                  value={selectedEl.content || ''}
                  onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                  placeholder="Use {{fieldName}} for API data"
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{fieldName}}"} to insert values from previous API responses
                </p>
              </div>
            )}

            {/* QR Code specific fields */}
            {selectedEl.type === 'qr_code' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">URL Field (from API response)</Label>
                  <Input
                    value={selectedEl.qrUrlField || ''}
                    onChange={(e) => updateElement(selectedEl.id, { qrUrlField: e.target.value })}
                    placeholder="e.g., verificationUrl, qrCodeUrl"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">QR Size (px)</Label>
                  <Input
                    type="number"
                    value={selectedEl.qrSize || 200}
                    onChange={(e) => updateElement(selectedEl.id, { qrSize: parseInt(e.target.value) || 200 })}
                    className="bg-background w-24"
                  />
                </div>
              </>
            )}

            {/* URL Link specific fields */}
            {selectedEl.type === 'url_link' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">URL Field (from API response)</Label>
                  <Input
                    value={selectedEl.urlField || ''}
                    onChange={(e) => updateElement(selectedEl.id, { urlField: e.target.value })}
                    placeholder="e.g., redirectUrl, deepLink"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Link Text</Label>
                  <Input
                    value={selectedEl.linkText || ''}
                    onChange={(e) => updateElement(selectedEl.id, { linkText: e.target.value })}
                    placeholder="Click here"
                    className="bg-background"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Open in New Tab</Label>
                  <Switch
                    checked={selectedEl.openInNewTab ?? true}
                    onCheckedChange={(v) => updateElement(selectedEl.id, { openInNewTab: v })}
                  />
                </div>
              </>
            )}

            {/* Button specific fields */}
            {selectedEl.type === 'button' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Button Action</Label>
                  <Select
                    value={selectedEl.buttonAction || 'next'}
                    onValueChange={(v) => updateElement(selectedEl.id, { buttonAction: v as 'next' | 'redirect' | 'copy' | 'portal' })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="next">Go to Next Step</SelectItem>
                      <SelectItem value="redirect">Redirect to URL</SelectItem>
                      <SelectItem value="copy">Copy to Clipboard</SelectItem>
                      <SelectItem value="portal">Go to Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedEl.buttonAction === 'redirect' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Redirect URL</Label>
                    <Input
                      value={selectedEl.buttonUrl || ''}
                      onChange={(e) => updateElement(selectedEl.id, { buttonUrl: e.target.value })}
                      placeholder="https://... or {{redirectUrl}}"
                      className="bg-background"
                    />
                  </div>
                )}
                {selectedEl.buttonAction === 'copy' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Field to Copy</Label>
                    <Input
                      value={selectedEl.copyField || ''}
                      onChange={(e) => updateElement(selectedEl.id, { copyField: e.target.value })}
                      placeholder="e.g., referenceId"
                      className="bg-background"
                    />
                  </div>
                )}
                {selectedEl.buttonAction === 'portal' && (
                  <p className="text-xs text-muted-foreground">
                    Navigates the user to the industry portal (e.g., Banking Dashboard). The portal type is determined by the demo's industry setting.
                  </p>
                )}
              </>
            )}

            {/* Common styling options */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label className="text-sm">Alignment</Label>
                <Select
                  value={selectedEl.alignment || 'center'}
                  onValueChange={(v) => updateElement(selectedEl.id, { alignment: v as 'left' | 'center' | 'right' })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Size</Label>
                <Select
                  value={selectedEl.size || 'md'}
                  onValueChange={(v) => updateElement(selectedEl.id, { size: v as 'sm' | 'md' | 'lg' | 'xl' })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-advance Settings */}
      <Card className="border-border">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Auto-advance Settings
            </Label>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Auto-advance after delay</Label>
            <Switch
              checked={config.autoAdvance ?? false}
              onCheckedChange={(v) => handleConfigChange({ autoAdvance: v })}
            />
          </div>
          
          {config.autoAdvance && (
            <div className="space-y-2">
              <Label className="text-sm">Delay (seconds)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.autoAdvanceDelay ?? 5}
                onChange={(e) => handleConfigChange({ autoAdvanceDelay: parseInt(e.target.value) || 5 })}
                className="w-24"
              />
            </div>
          )}
          
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-sm">Or advance when field matches value</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={config.autoAdvanceOnField || ''}
                onChange={(e) => handleConfigChange({ autoAdvanceOnField: e.target.value })}
                placeholder="Field name"
              />
              <Input
                value={config.autoAdvanceFieldValue || ''}
                onChange={(e) => handleConfigChange({ autoAdvanceFieldValue: e.target.value })}
                placeholder="Expected value"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When polling API response, advance if this field equals the expected value
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
