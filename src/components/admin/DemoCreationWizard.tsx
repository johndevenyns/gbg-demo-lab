import { useState, useEffect, useCallback } from "react";
import { Check, Globe, ArrowRight, ArrowLeft, Loader2, Monitor, Eye, EyeOff, Image, Code } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateDemo, useUpdateDemo } from "@/hooks/useDemos";
import { useGlobalUseCases, useAddDemoUseCaseLink } from "@/hooks/useUseCases";
import { useIndustries } from "@/hooks/useIndustries";
import { useEnabledPortalTypes } from "@/hooks/usePortalTypes";
import { IndustryTemplate, DemoEnvironment } from "@/types/demo";
import { scrapingApi, ScrapedBranding, headerRefinementApi } from "@/lib/api/scraping";
import { formElementStylesToConfig, generatePreviewDocument, generateFormHtml } from "@/lib/formStyleUtils";
import { DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface DemoCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

type WizardStep = 'details' | 'industry' | 'portal' | 'use-cases' | 'processing' | 'review';

interface ProcessingTask {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
}

// Helper to generate screenshot-based header/footer HTML
function getScreenshotSrc(screenshot: string): string {
  const s = screenshot.trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  return `data:image/png;base64,${s}`;
}

function generateScreenshotHeaderHtml(src: string, naturalHeight: number): string {
  const headerHeightPercent = (180 / naturalHeight) * 100;
  return `<div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${headerHeightPercent}%;"><img src="${src}" style="position: absolute; width: 100%; top: 0; left: 0;" alt="Site header" /></div>`;
}

function generateScreenshotFooterHtml(src: string, naturalHeight: number): string {
  const footerHeightPercent = (180 / naturalHeight) * 100;
  const footerTopPercent = 100 - footerHeightPercent;
  return `<div style="width: 100%; overflow: hidden; position: relative; height: 0; padding-bottom: ${footerHeightPercent}%;"><img src="${src}" style="position: absolute; width: 100%; top: -${footerTopPercent}%; left: 0;" alt="Site footer" /></div>`;
}

export function DemoCreationWizard({ open, onOpenChange, onCreated }: DemoCreationWizardProps) {
  const createDemo = useCreateDemo();
  const updateDemo = useUpdateDemo();
  const addUseCaseLink = useAddDemoUseCaseLink();
  
  const { data: industries = [], isLoading: loadingIndustries } = useIndustries();
  const { data: globalUseCases = [], isLoading: loadingUseCases } = useGlobalUseCases();
  const { data: portalTypes = [] } = useEnabledPortalTypes();
  
  const [step, setStep] = useState<WizardStep>('details');
  const [customerName, setCustomerName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [enableMirroring, setEnableMirroring] = useState(false);
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [hiddenFromLanding, setHiddenFromLanding] = useState<Set<string>>(new Set());
  const [useCasesInitialized, setUseCasesInitialized] = useState(false);
  
  // Portal step state
  const [hasPortal, setHasPortal] = useState(false);
  const [selectedPortalType, setSelectedPortalType] = useState<string>('');
  
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [createdDemoId, setCreatedDemoId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Review step state - stores both capture results for comparison
  const [htmlPreviewDoc, setHtmlPreviewDoc] = useState<string>('');
  const [screenshotPreviewDoc, setScreenshotPreviewDoc] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'html' | 'screenshot'>('html');
  const [htmlCaptureData, setHtmlCaptureData] = useState<{
    headerHtml: string; footerHtml: string; css: string;
  } | null>(null);
  const [screenshotCaptureData, setScreenshotCaptureData] = useState<{
    headerHtml: string; footerHtml: string; css: string;
  } | null>(null);
  const [htmlAvailable, setHtmlAvailable] = useState(false);
  const [screenshotAvailable, setScreenshotAvailable] = useState(false);

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  // When industry is selected, auto-select all its use cases
  useEffect(() => {
    if (selectedIndustryId && !useCasesInitialized) {
      const industryUseCases = globalUseCases
        .filter(uc => uc.isEnabled)
        .map(uc => uc.id);
      setSelectedUseCases(industryUseCases);
      setUseCasesInitialized(true);
    }
  }, [selectedIndustryId, globalUseCases, useCasesInitialized]);

  // When portal is enabled, ensure login use case is selected
  useEffect(() => {
    if (hasPortal && selectedIndustryId && useCasesInitialized) {
      const loginUseCase = globalUseCases.find(uc => 
        uc.isEnabled &&
        uc.title.toLowerCase().includes('login')
      );
      if (loginUseCase && !selectedUseCases.includes(loginUseCase.id)) {
        setSelectedUseCases(prev => [loginUseCase.id, ...prev]);
      }
    }
  }, [hasPortal, selectedIndustryId, useCasesInitialized, globalUseCases]);

  const resetForm = () => {
    setStep('details');
    setCustomerName("");
    setSiteUrl("");
    setEnableMirroring(false);
    setSelectedIndustryId(null);
    setSelectedUseCases([]);
    setHiddenFromLanding(new Set());
    setUseCasesInitialized(false);
    setHasPortal(false);
    setSelectedPortalType('');
    setProcessingTasks([]);
    setCreatedDemoId(null);
    setProcessingError(null);
    setHtmlPreviewDoc('');
    setScreenshotPreviewDoc('');
    setSelectedMethod('html');
    setHtmlCaptureData(null);
    setScreenshotCaptureData(null);
    setHtmlAvailable(false);
    setScreenshotAvailable(false);
  };

  const toggleUseCase = (id: string) => setSelectedUseCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const updateTaskStatus = (taskId: string, status: ProcessingTask['status']) => {
    setProcessingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const selectedIndustry = industries.find(i => i.id === selectedIndustryId);
  const industryUseCases = globalUseCases.filter(uc => uc.isEnabled);

  const buildPreviewHtml = (headerHtml: string, footerHtml: string, css: string, buttonColor: string) => {
    const formHtml = generateFormHtml(DEFAULT_FORM_STYLE, buttonColor);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:system-ui,sans-serif;}*{box-sizing:border-box;}</style>${css ? `<style>${css}</style>` : ''}</head><body>${headerHtml || ''}<div style="padding:40px 20px;background:#f5f5f5;min-height:200px;">${formHtml}</div>${footerHtml || ''}</body></html>`;
  };

  const startProcessing = async () => {
    if (!customerName.trim() || !selectedIndustryId) return;

    const tasks: ProcessingTask[] = [
      { id: 'create', label: 'Creating demo environment', status: 'pending' },
    ];
    if (enableMirroring && siteUrl) {
      tasks.push({ id: 'scrape-html', label: 'Capturing HTML header & footer', status: 'pending' });
      tasks.push({ id: 'refine-html', label: 'AI-refining HTML capture', status: 'pending' });
      tasks.push({ id: 'scrape-screenshot', label: 'Capturing screenshot', status: 'pending' });
      tasks.push({ id: 'apply', label: 'Applying branding to demo', status: 'pending' });
    }
    if (selectedUseCases.length > 0) {
      tasks.push({ id: 'use-cases', label: 'Linking use cases', status: 'pending' });
    }
    tasks.push({ id: 'finalize', label: 'Finalizing configuration', status: 'pending' });

    setProcessingTasks(tasks);
    setStep('processing');
    setProcessingError(null);

    try {
      // Step 1: Create the demo
      updateTaskStatus('create', 'in_progress');
      const template: IndustryTemplate = 'custom';
      const demo = await createDemo.mutateAsync({ customerName: customerName.trim(), template });
      setCreatedDemoId(demo.id);

      await updateDemo.mutateAsync({
        id: demo.id,
        updates: { 
          industryId: selectedIndustryId,
          portalType: hasPortal ? selectedPortalType : 'none',
        } as any,
      });
      updateTaskStatus('create', 'complete');

      // Step 2: Site mirroring - capture BOTH methods
      let scrapedData: ScrapedBranding | null = null;
      let refinedHtml: { headerHtml: string; footerHtml: string; css: string } | null = null;
      let screenshotCapture: { headerHtml: string; footerHtml: string; css: string } | null = null;
      const buttonColor = '#6366f1';

      if (enableMirroring && siteUrl) {
        // Fetch site branding (returns HTML + screenshots)
        updateTaskStatus('scrape-html', 'in_progress');
        const response = await scrapingApi.scrapeSiteBranding(siteUrl);
        if (response.success && response.data) {
          scrapedData = response.data;
          refinedHtml = {
            headerHtml: scrapedData.headerHtml || '',
            footerHtml: scrapedData.footerHtml || '',
            css: scrapedData.cssContent || '',
          };
          updateTaskStatus('scrape-html', 'complete');
        } else {
          updateTaskStatus('scrape-html', 'error');
        }

        // AI Refinement of HTML capture
        if (scrapedData?.screenshot) {
          updateTaskStatus('refine-html', 'in_progress');
          try {
            const screenshotSrc = getScreenshotSrc(scrapedData.screenshot);
            const refineResult = await headerRefinementApi.refineCapture(
              screenshotSrc,
              refinedHtml?.headerHtml || '',
              refinedHtml?.footerHtml || '',
              refinedHtml?.css || '',
              siteUrl
            );
            if (refineResult.success && refineResult.data) {
              refinedHtml = {
                headerHtml: refineResult.data.refinedHeaderHtml || refinedHtml?.headerHtml || '',
                footerHtml: refineResult.data.refinedFooterHtml || refinedHtml?.footerHtml || '',
                css: (refinedHtml?.css || '') + '\n' + (refineResult.data.additionalCss || ''),
              };
              // Override colors with AI-extracted ones if available
              if (refineResult.data.extractedColors && scrapedData) {
                if (refineResult.data.extractedColors.headerBgColor) {
                  scrapedData.colors.headerBgColor = refineResult.data.extractedColors.headerBgColor;
                }
                if (refineResult.data.extractedColors.headerTextColor) {
                  scrapedData.colors.headerTextColor = refineResult.data.extractedColors.headerTextColor;
                }
                if (refineResult.data.extractedColors.buttonColor) {
                  scrapedData.colors.buttonColor = refineResult.data.extractedColors.buttonColor;
                }
                if (refineResult.data.extractedColors.logoUrl) {
                  scrapedData.logoUrl = refineResult.data.extractedColors.logoUrl;
                }
              }
            }
            updateTaskStatus('refine-html', 'complete');
          } catch (e) {
            console.error('AI refinement failed:', e);
            updateTaskStatus('refine-html', 'error');
          }
        } else {
          updateTaskStatus('refine-html', 'error');
        }

        // Generate screenshot-based capture
        updateTaskStatus('scrape-screenshot', 'in_progress');
        if (scrapedData?.screenshot) {
          const screenshotSrc = getScreenshotSrc(scrapedData.screenshot);
          // Determine natural height from the screenshot
          const naturalHeight = 1000; // Default estimate
          screenshotCapture = {
            headerHtml: generateScreenshotHeaderHtml(screenshotSrc, naturalHeight),
            footerHtml: generateScreenshotFooterHtml(screenshotSrc, naturalHeight),
            css: JSON.stringify({
              viewportScreenshots: {
                desktop: { src: screenshotSrc, crop: { headerHeight: 180, headerOffsetY: 0, footerHeight: 180, footerOffsetY: 0 } },
              }
            }),
          };
          updateTaskStatus('scrape-screenshot', 'complete');
        } else {
          updateTaskStatus('scrape-screenshot', 'error');
        }

        // Apply branding (colors, logo, formStyle, BOTH captures)
        updateTaskStatus('apply', 'in_progress');
        const brandingUpdates: Record<string, unknown> = {
          customerSiteUrl: siteUrl,
          headerBgColor: scrapedData?.colors?.headerBgColor || '#1a1a2e',
          headerTextColor: scrapedData?.colors?.headerTextColor || '#ffffff',
          buttonColor: scrapedData?.colors?.buttonColor || '#6366f1',
          logoUrl: scrapedData?.logoUrl || scrapedData?.branding?.logo || '',
        };

        // Store HTML capture
        if (refinedHtml) {
          brandingUpdates.mirrorHtmlHeaderHtml = refinedHtml.headerHtml;
          brandingUpdates.mirrorHtmlFooterHtml = refinedHtml.footerHtml;
          brandingUpdates.mirrorHtmlCss = refinedHtml.css;
        }

        // Store screenshot capture
        if (screenshotCapture) {
          brandingUpdates.mirrorScreenshotHeaderHtml = screenshotCapture.headerHtml;
          brandingUpdates.mirrorScreenshotFooterHtml = screenshotCapture.footerHtml;
          brandingUpdates.mirrorScreenshotCss = screenshotCapture.css;
        }

        // Apply form styles if available
        if (scrapedData?.formStyles) {
          brandingUpdates.formStyle = formElementStylesToConfig(scrapedData.formStyles);
        }

        await updateDemo.mutateAsync({ id: demo.id, updates: brandingUpdates as any });
        updateTaskStatus('apply', 'complete');

        // Build preview documents for review step
        const appliedButtonColor = (scrapedData?.colors?.buttonColor || '#6366f1');
        if (refinedHtml) {
          setHtmlCaptureData(refinedHtml);
          setHtmlPreviewDoc(buildPreviewHtml(refinedHtml.headerHtml, refinedHtml.footerHtml, refinedHtml.css, appliedButtonColor));
          setHtmlAvailable(true);
        }
        if (screenshotCapture) {
          setScreenshotCaptureData(screenshotCapture);
          setScreenshotPreviewDoc(buildPreviewHtml(screenshotCapture.headerHtml, screenshotCapture.footerHtml, '', appliedButtonColor));
          setScreenshotAvailable(true);
        }
      }

      // Link selected use cases
      let shouldShowFillPass = false;
      let shouldShowFillFail = false;
      if (selectedUseCases.length > 0) {
        updateTaskStatus('use-cases', 'in_progress');
        for (let i = 0; i < selectedUseCases.length; i++) {
          await addUseCaseLink.mutateAsync({ demoId: demo.id, useCaseId: selectedUseCases[i], displayOrder: i, showOnLandingPage: !hiddenFromLanding.has(selectedUseCases[i]) });
          const uc = globalUseCases.find(u => u.id === selectedUseCases[i]);
          if (uc?.showFillPass) shouldShowFillPass = true;
          if (uc?.showFillFail) shouldShowFillFail = true;
        }
        updateTaskStatus('use-cases', 'complete');
      }

      updateTaskStatus('finalize', 'in_progress');
      if (shouldShowFillPass || shouldShowFillFail) {
        await updateDemo.mutateAsync({
          id: demo.id,
          updates: {
            storedTestData: {
              passData: {},
              failData: {},
              showFillPassButton: shouldShowFillPass,
              showFillFailButton: shouldShowFillFail,
            },
          },
        });
      }
      updateTaskStatus('finalize', 'complete');

      // If mirroring was enabled and we have captures, go to review step
      // Otherwise, finish immediately
      if (enableMirroring && siteUrl && (htmlAvailable || screenshotAvailable || refinedHtml || screenshotCapture)) {
        // Auto-select best available method
        setSelectedMethod(refinedHtml ? 'html' : 'screenshot');
        setTimeout(() => setStep('review'), 800);
      } else {
        setTimeout(() => {
          onOpenChange(false);
          onCreated(demo.id);
        }, 1000);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleReviewComplete = async () => {
    if (!createdDemoId) return;
    
    // Set the active method based on user selection
    try {
      await updateDemo.mutateAsync({
        id: createdDemoId,
        updates: { mirrorActiveMethod: selectedMethod } as any,
      });
    } catch (e) {
      console.error('Failed to set active method:', e);
    }

    onOpenChange(false);
    onCreated(createdDemoId);
  };

  const stepOrder: WizardStep[] = ['details', 'industry', 'portal', 'use-cases'];

  const canProceed = () => {
    switch (step) {
      case 'details':
        return !!customerName.trim() && (!enableMirroring || !!siteUrl.trim());
      case 'industry':
        return !!selectedIndustryId;
      case 'portal':
        return !hasPortal || !!selectedPortalType;
      case 'use-cases':
        return selectedUseCases.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const idx = stepOrder.indexOf(step);
    if (idx < stepOrder.length - 1) {
      const nextStep = stepOrder[idx + 1];
      if (nextStep === 'use-cases') {
        setUseCasesInitialized(false);
      }
      setStep(nextStep);
    } else {
      startProcessing();
    }
  };

  const handleBack = () => {
    const idx = stepOrder.indexOf(step);
    if (idx > 0) setStep(stepOrder[idx - 1]);
  };

  const getStepNumber = () => stepOrder.indexOf(step) + 1;
  const getTotalSteps = () => stepOrder.length;
  const isLastStep = stepOrder.indexOf(step) === stepOrder.length - 1;

  const completedTasks = processingTasks.filter(t => t.status === 'complete').length;
  const progressPercent = processingTasks.length > 0 ? Math.round((completedTasks / processingTasks.length) * 100) : 0;

  const stepDescriptions: Record<WizardStep, string> = {
    'details': 'Name the customer and optionally provide their website URL for branding',
    'industry': 'Select the industry vertical for this demo',
    'portal': 'Choose whether this demo includes a portal experience for logged-in users',
    'use-cases': 'All use cases are pre-selected. Deselect any you don\'t need.',
    'processing': 'Please wait while we configure your demo environment',
    'review': 'Compare both capture methods and pick the one that looks best',
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && step !== 'processing') resetForm();
      if (step !== 'processing') onOpenChange(isOpen);
    }}>
      <DialogContent className={cn(
        "max-h-[85vh] flex flex-col overflow-hidden",
        step === 'review' ? "sm:max-w-4xl" : "sm:max-w-2xl"
      )}>
        <DialogHeader>
          <DialogTitle>
            {step === 'processing' ? 'Setting Up Demo' : step === 'review' ? 'Choose Capture Method' : 'Create Demo Environment'}
          </DialogTitle>
          <DialogDescription>{stepDescriptions[step]}</DialogDescription>
        </DialogHeader>

        {step !== 'processing' && step !== 'review' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              Step {getStepNumber()} of {getTotalSteps()}
            </span>
            <Progress value={(getStepNumber() / getTotalSteps()) * 100} className="flex-1 h-2" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
        {/* Step 1: Customer Details */}
        {step === 'details' && (
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer / Company Name</Label>
              <Input
                id="customerName"
                placeholder="e.g., Acme Bank, FastRent Cars"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Demo URL: /demo/{customerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'your-company'}
              </p>
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="enableMirroring"
                  checked={enableMirroring}
                  onCheckedChange={(checked) => setEnableMirroring(checked === true)}
                />
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="enableMirroring" className="font-medium cursor-pointer">
                    Mirror customer website for branding
                  </Label>
                </div>
              </div>
              {enableMirroring && (
                <div className="space-y-2 pl-7">
                  <Label htmlFor="siteUrl">Website URL</Label>
                  <Input
                    id="siteUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll capture both an HTML extraction and a screenshot, then let you pick the best result
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Industry Selection */}
        {step === 'industry' && (
          <div className="py-4 space-y-4">
            {loadingIndustries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : industries.filter(i => i.isEnabled).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No industries configured. Add them in Global Settings → Industries.
              </p>
            ) : (
              <div className="grid gap-3">
                {industries.filter(i => i.isEnabled).map((ind) => {
                  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
                  const IconComp = icons[ind.iconName] || icons['Building2'];
                  const isSelected = selectedIndustryId === ind.id;
                  const ucCount = globalUseCases.filter(uc => uc.isEnabled).length;

                  return (
                    <button
                      key={ind.id}
                      onClick={() => {
                        setSelectedIndustryId(ind.id);
                        setUseCasesInitialized(false);
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border text-left transition-all w-full",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {IconComp && <IconComp className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{ind.title}</h4>
                        {ind.description && <p className="text-sm text-muted-foreground">{ind.description}</p>}
                        <Badge variant="outline" className="text-[10px] mt-1">{ucCount} use case{ucCount !== 1 ? 's' : ''}</Badge>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Portal Selection */}
        {step === 'portal' && (
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Will this demo have a portal for users to log in?</p>
                  <p className="text-sm text-muted-foreground">
                    A portal simulates a logged-in account experience (e.g., banking dashboard)
                  </p>
                </div>
              </div>
              <Switch
                checked={hasPortal}
                onCheckedChange={(checked) => {
                  setHasPortal(checked);
                  if (!checked) setSelectedPortalType('');
                }}
              />
            </div>

            {hasPortal && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Portal Type</Label>
                  {portalTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No portal types configured. Add them in Global Settings → Portal Types.
                    </p>
                  ) : (
                    <Select value={selectedPortalType} onValueChange={setSelectedPortalType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a portal type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {portalTypes.map(pt => (
                          <SelectItem key={pt.id} value={pt.typeKey}>
                            <div className="flex items-center gap-2">
                              <span>{pt.displayName}</span>
                              {pt.description && (
                                <span className="text-muted-foreground text-xs">— {pt.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedPortalType && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                    <p className="font-medium text-primary">Portal defaults:</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li>• A "Login to Account" use case will be auto-added</li>
                      <li>• Use cases will default to navigating to the portal after login</li>
                      <li>• You can also configure verification landing pages per use case</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!hasPortal && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p>Without a portal, use cases will use verification landing pages and result pages as their endpoint.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Use Cases within selected industry */}
        {step === 'use-cases' && (
          <div className="py-4 space-y-4">
            {selectedIndustry && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 mb-2">
                <span className="text-sm font-medium">{selectedIndustry.title}</span>
                {hasPortal && selectedPortalType && (
                  <Badge variant="secondary" className="text-xs">
                    {portalTypes.find(pt => pt.typeKey === selectedPortalType)?.displayName} Portal
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">— select use cases</span>
              </div>
            )}
            {loadingUseCases ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : industryUseCases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No use cases configured for this industry. Add them in Global Settings → Industries.
              </p>
            ) : (
              <div className="grid gap-3">
                {industryUseCases.map((uc) => {
                  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
                  const IconComp = icons[uc.iconName] || icons['Package'];
                  const isLoginUc = uc.title.toLowerCase().includes('login');
                  const isAutoAdded = hasPortal && isLoginUc;
                  const isSelected = selectedUseCases.includes(uc.id);
                  const isHiddenFromLanding = hiddenFromLanding.has(uc.id);
                  return (
                    <div key={uc.id} className="flex items-center gap-2">
                      <button
                        onClick={() => !isAutoAdded && toggleUseCase(uc.id)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border text-left transition-all flex-1",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50",
                          isAutoAdded && "cursor-default"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {IconComp && <IconComp className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{uc.title}</h4>
                            {isAutoAdded && (
                              <Badge variant="secondary" className="text-[10px]">Auto-added with portal</Badge>
                            )}
                            {isSelected && isHiddenFromLanding && (
                              <Badge variant="outline" className="text-[10px]">Hidden from landing</Badge>
                            )}
                          </div>
                          {uc.description && <p className="text-sm text-muted-foreground">{uc.description}</p>}
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-primary" />}
                      </button>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHiddenFromLanding(prev => {
                              const next = new Set(prev);
                              if (next.has(uc.id)) next.delete(uc.id);
                              else next.add(uc.id);
                              return next;
                            });
                          }}
                          className={cn(
                            "p-2 rounded-md border transition-colors shrink-0",
                            isHiddenFromLanding
                              ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                              : "border-border text-muted-foreground hover:bg-muted"
                          )}
                          title={isHiddenFromLanding ? "Hidden from landing page — click to show" : "Visible on landing page — click to hide"}
                        >
                          {isHiddenFromLanding ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Processing Screen */}
        {step === 'processing' && (
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>
            <div className="space-y-3">
              {processingTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all",
                    task.status === 'in_progress' && "bg-primary/5",
                    task.status === 'complete' && "opacity-60"
                  )}
                >
                  {task.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
                  {task.status === 'in_progress' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  {task.status === 'complete' && <Check className="w-5 h-5 text-green-500" />}
                  {task.status === 'error' && (
                    <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                      <span className="text-destructive text-xs">!</span>
                    </div>
                  )}
                  <span className={cn("text-sm", task.status === 'in_progress' && "font-medium")}>{task.label}</span>
                </div>
              ))}
            </div>
            {processingError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {processingError}
              </div>
            )}
          </div>
        )}

        {/* Review Step - Compare captures side by side */}
        {step === 'review' && (
          <div className="py-4 space-y-4">
            <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as 'html' | 'screenshot')}>
              <div className="grid grid-cols-2 gap-4">
                {/* HTML Capture */}
                <div className={cn(
                  "border rounded-lg overflow-hidden transition-all cursor-pointer",
                  selectedMethod === 'html' ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/50",
                  !htmlAvailable && !htmlCaptureData && "opacity-40 pointer-events-none"
                )}
                  onClick={() => (htmlAvailable || htmlCaptureData) && setSelectedMethod('html')}
                >
                  <div className="flex items-center gap-2 p-3 bg-muted/30 border-b">
                    <RadioGroupItem value="html" id="html-method" disabled={!htmlAvailable && !htmlCaptureData} />
                    <Label htmlFor="html-method" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Code className="w-4 h-4" />
                      <span className="font-medium text-sm">HTML Capture</span>
                    </Label>
                    {(htmlAvailable || htmlCaptureData) && (
                      <Badge variant="outline" className="text-[10px]">Interactive</Badge>
                    )}
                  </div>
                  <div className="h-[280px] bg-background">
                    {htmlPreviewDoc ? (
                      <iframe
                        srcDoc={htmlPreviewDoc}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                        title="HTML capture preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No HTML capture available
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-xs text-muted-foreground bg-muted/20">
                    Extracted HTML/CSS — interactive elements, responsive
                  </div>
                </div>

                {/* Screenshot Capture */}
                <div className={cn(
                  "border rounded-lg overflow-hidden transition-all cursor-pointer",
                  selectedMethod === 'screenshot' ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground/50",
                  !screenshotAvailable && !screenshotCaptureData && "opacity-40 pointer-events-none"
                )}
                  onClick={() => (screenshotAvailable || screenshotCaptureData) && setSelectedMethod('screenshot')}
                >
                  <div className="flex items-center gap-2 p-3 bg-muted/30 border-b">
                    <RadioGroupItem value="screenshot" id="screenshot-method" disabled={!screenshotAvailable && !screenshotCaptureData} />
                    <Label htmlFor="screenshot-method" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Image className="w-4 h-4" />
                      <span className="font-medium text-sm">Screenshot Capture</span>
                    </Label>
                    {(screenshotAvailable || screenshotCaptureData) && (
                      <Badge variant="outline" className="text-[10px]">Pixel-perfect</Badge>
                    )}
                  </div>
                  <div className="h-[280px] bg-background">
                    {screenshotPreviewDoc ? (
                      <iframe
                        srcDoc={screenshotPreviewDoc}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                        title="Screenshot capture preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No screenshot available
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-xs text-muted-foreground bg-muted/20">
                    Full-page screenshot crop — visually accurate, static image
                  </div>
                </div>
              </div>
            </RadioGroup>

            <p className="text-xs text-muted-foreground text-center">
              Both captures are saved. You can switch between them later in the Site Mirror settings.
            </p>
          </div>
        )}
        </div>

        {/* Navigation */}
        {step !== 'processing' && step !== 'review' && (
          <div className="flex justify-between pt-4 border-t border-border">
            {step !== 'details' ? (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createDemo.isPending}
              className="gradient-primary"
            >
              {isLastStep ? 'Create Demo' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Review Navigation */}
        {step === 'review' && (
          <div className="flex justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => {
              // Skip review — just use default
              handleReviewComplete();
            }}>
              Skip
            </Button>
            <Button onClick={handleReviewComplete} className="gradient-primary">
              <Check className="w-4 h-4 mr-2" />
              Use {selectedMethod === 'html' ? 'HTML' : 'Screenshot'} Capture
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
