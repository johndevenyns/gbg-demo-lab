import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DemoEnvironment } from '@/types/demo';
import { DemoFlowRenderer } from '@/components/preview/DemoFlowRenderer';
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from '@/components/preview/ResultPage';
import { 
  Eye, EyeOff, ChevronDown, ChevronUp, RotateCcw, CheckCircle2, XCircle
} from 'lucide-react';

interface FormPreviewPanelProps {
  demo: DemoEnvironment;
}

export function FormPreviewPanel({ demo }: FormPreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  const resetPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  const hasTestData = demo.storedTestData && (
    Object.keys(demo.storedTestData.passData || {}).length > 0 ||
    Object.keys(demo.storedTestData.failData || {}).length > 0
  );

  return (
    <Card className="glass-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  {isOpen ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  Live Form Preview
                </CardTitle>
                {hasTestData && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                    Test Data Configured
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOpen && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      resetPreview();
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                )}
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {/* Test Data Hint */}
            {!hasTestData && (
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Configure test data in the <strong>"Test Data"</strong> tab to enable Fill Pass/Fail buttons.
                </p>
              </div>
            )}

            {/* Preview Container */}
            <div 
              className="bg-background rounded-xl border border-border p-6 max-w-xl mx-auto"
              style={{ 
                fontFamily: demo.formStyle?.fontFamily || 'Inter, system-ui, sans-serif'
              }}
            >
              {demo.formSteps.length > 0 ? (
                <DemoFlowRenderer
                  key={previewKey}
                  steps={demo.formSteps}
                  buttonColor={demo.buttonColor}
                  formStyle={demo.formStyle}
                  successPageConfig={demo.successPageConfig || DEFAULT_SUCCESS_CONFIG}
                  failurePageConfig={demo.failurePageConfig || DEFAULT_FAILURE_CONFIG}
                  approvedUrl={demo.approvedUrl}
                  rejectedUrl={demo.rejectedUrl}
                  customerName={demo.customerName}
                  returnUrl={demo.returnUrl}
                  includeQr={demo.includeQr}
                  referenceIdPrefix={demo.referenceIdPrefix}
                  storedTestData={demo.storedTestData}
                  showTestButtons={true}
                  onComplete={(success, refId) => {
                    console.log('Preview flow complete:', { success, refId });
                  }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No form steps configured</p>
                  <p className="text-sm">Add steps in the Form Builder tab to see a preview.</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
