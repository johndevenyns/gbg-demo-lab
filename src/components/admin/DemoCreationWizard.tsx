import { useState, useEffect } from "react";
import { Building2, Car, Gamepad2, Shield, Landmark, Layers, Check, Heart, ShoppingBag, Globe, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useCreateDemo, useUpdateDemo } from "@/hooks/useDemos";
import { useVerificationTypes, useMdlProviders } from "@/hooks/useVerificationAdmin";
import { useGlobalUseCases, useAddDemoUseCaseLink } from "@/hooks/useUseCases";
import { IndustryTemplate } from "@/types/demo";
import { VerificationTypeConfig, MdlProvider } from "@/types/verification";
import { GlobalUseCase } from "@/types/useCase";
import { scrapingApi } from "@/lib/api/scraping";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface DemoCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

type WizardStep = 'details' | 'use-cases' | 'template' | 'verification' | 'providers' | 'processing';

interface ProcessingTask {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
}

const templates: { id: IndustryTemplate; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { id: "bank", label: "Banking", description: "Traditional banks & credit unions", icon: <Landmark className="w-6 h-6" />, color: "#1a1a2e" },
  { id: "retail", label: "Retail", description: "E-commerce & retail businesses", icon: <ShoppingBag className="w-6 h-6" />, color: "#00c4cc" },
  { id: "rental_car", label: "Rental Car", description: "Vehicle rental companies", icon: <Car className="w-6 h-6" />, color: "#ff6b00" },
  { id: "online_gambling", label: "Online Gambling", description: "Gaming & betting platforms", icon: <Gamepad2 className="w-6 h-6" />, color: "#8b5cf6" },
  { id: "healthcare", label: "Healthcare", description: "Healthcare providers", icon: <Heart className="w-6 h-6" />, color: "#14b8a6" },
  { id: "insurance", label: "Insurance", description: "Insurance providers", icon: <Shield className="w-6 h-6" />, color: "#0077cc" },
  { id: "custom", label: "Custom", description: "Start from scratch", icon: <Layers className="w-6 h-6" />, color: "#6366f1" },
];

function getIconByName(iconName: string | null): React.ReactNode {
  if (!iconName) return <Shield className="w-5 h-5" />;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[iconName];
  return IconComponent ? <IconComponent className="w-5 h-5" /> : <Shield className="w-5 h-5" />;
}

export function DemoCreationWizard({ open, onOpenChange, onCreated }: DemoCreationWizardProps) {
  const createDemo = useCreateDemo();
  const updateDemo = useUpdateDemo();
  const addUseCaseLink = useAddDemoUseCaseLink();
  
  const { data: verificationTypes = [], isLoading: loadingTypes } = useVerificationTypes(true);
  const { data: mdlProviders = [], isLoading: loadingProviders } = useMdlProviders(true);
  const { data: globalUseCases = [], isLoading: loadingUseCases } = useGlobalUseCases();
  
  // Wizard state
  const [step, setStep] = useState<WizardStep>('details');
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [enableMirroring, setEnableMirroring] = useState(false);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [selectedVerificationTypes, setSelectedVerificationTypes] = useState<string[]>([]);
  const [selectedMdlProviders, setSelectedMdlProviders] = useState<string[]>([]);
  
  // Processing state
  const [processingTasks, setProcessingTasks] = useState<ProcessingTask[]>([]);
  const [createdDemoId, setCreatedDemoId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const hasMdlSelected = selectedVerificationTypes.includes('mdl');

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const resetForm = () => {
    setStep('details');
    setSelectedTemplate(null);
    setCustomerName("");
    setSiteUrl("");
    setEnableMirroring(false);
    setSelectedUseCases([]);
    setSelectedVerificationTypes([]);
    setSelectedMdlProviders([]);
    setProcessingTasks([]);
    setCreatedDemoId(null);
    setProcessingError(null);
  };

  const toggleUseCase = (id: string) => setSelectedUseCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleVerificationType = (key: string) => setSelectedVerificationTypes(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  const toggleMdlProvider = (key: string) => setSelectedMdlProviders(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);

  const updateTaskStatus = (taskId: string, status: ProcessingTask['status']) => {
    setProcessingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const startProcessing = async () => {
    if (!selectedTemplate || !customerName.trim()) return;

    const tasks: ProcessingTask[] = [
      { id: 'create', label: 'Creating demo environment', status: 'pending' },
    ];
    if (enableMirroring && siteUrl) {
      tasks.push({ id: 'scrape', label: 'Fetching site branding & styles', status: 'pending' });
      tasks.push({ id: 'apply', label: 'Applying branding to demo', status: 'pending' });
    }
    if (selectedUseCases.length > 0) {
      tasks.push({ id: 'use-cases', label: 'Linking use cases', status: 'pending' });
    }
    if (selectedVerificationTypes.length > 0) {
      tasks.push({ id: 'verification', label: 'Configuring verification types', status: 'pending' });
    }
    tasks.push({ id: 'finalize', label: 'Finalizing configuration', status: 'pending' });

    setProcessingTasks(tasks);
    setStep('processing');
    setProcessingError(null);

    try {
      updateTaskStatus('create', 'in_progress');
      const demo = await createDemo.mutateAsync({ customerName: customerName.trim(), template: selectedTemplate });
      setCreatedDemoId(demo.id);
      updateTaskStatus('create', 'complete');

      let scrapedData = null;
      if (enableMirroring && siteUrl) {
        updateTaskStatus('scrape', 'in_progress');
        const response = await scrapingApi.scrapeSiteBranding(siteUrl);
        if (response.success && response.data) {
          scrapedData = response.data;
          updateTaskStatus('scrape', 'complete');
        } else {
          updateTaskStatus('scrape', 'error');
        }

        if (scrapedData) {
          updateTaskStatus('apply', 'in_progress');
          await updateDemo.mutateAsync({
            id: demo.id,
            updates: {
              customerSiteUrl: siteUrl,
              mirrorHtmlHeaderHtml: scrapedData.headerHtml,
              mirrorHtmlFooterHtml: scrapedData.footerHtml,
              mirrorHtmlCss: scrapedData.cssContent,
              headerBgColor: scrapedData.colors.headerBgColor,
              headerTextColor: scrapedData.colors.headerTextColor,
              buttonColor: scrapedData.colors.buttonColor,
              logoUrl: scrapedData.logoUrl || scrapedData.branding?.logo || '',
            }
          });
          updateTaskStatus('apply', 'complete');
        } else {
          updateTaskStatus('apply', 'error');
        }
      }

      if (selectedUseCases.length > 0) {
        updateTaskStatus('use-cases', 'in_progress');
        for (let i = 0; i < selectedUseCases.length; i++) {
          await addUseCaseLink.mutateAsync({ demoId: demo.id, useCaseId: selectedUseCases[i], displayOrder: i });
        }
        updateTaskStatus('use-cases', 'complete');
      }

      if (selectedVerificationTypes.length > 0) {
        updateTaskStatus('verification', 'in_progress');
        const primaryType = selectedVerificationTypes[0];
        const verificationType = primaryType === 'docbio' ? 'docBio' : primaryType === 'databio' ? 'dataBio' : 'dataOnly';
        await updateDemo.mutateAsync({ id: demo.id, updates: { verificationType } });
        updateTaskStatus('verification', 'complete');
      }

      updateTaskStatus('finalize', 'in_progress');
      updateTaskStatus('finalize', 'complete');

      setTimeout(() => {
        onOpenChange(false);
        onCreated(demo.id);
      }, 1000);
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const stepOrder: WizardStep[] = ['details', 'use-cases', 'template', 'verification', ...(hasMdlSelected ? ['providers' as WizardStep] : [])];

  const canProceed = () => {
    switch (step) {
      case 'details':
        return !!customerName.trim() && (!enableMirroring || !!siteUrl.trim());
      case 'use-cases':
        return selectedUseCases.length > 0;
      case 'template':
        return !!selectedTemplate;
      case 'verification':
        return selectedVerificationTypes.length > 0;
      case 'providers':
        return !hasMdlSelected || selectedMdlProviders.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const idx = stepOrder.indexOf(step);
    if (idx < stepOrder.length - 1) {
      setStep(stepOrder[idx + 1]);
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
    'use-cases': 'Select which use cases to include in this demo',
    'template': 'Choose a form template to get started',
    'verification': 'Select which verification methods to enable',
    'providers': 'Select mobile ID providers to include',
    'processing': 'Please wait while we configure your demo environment',
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && step !== 'processing') resetForm();
      if (step !== 'processing') onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'processing' ? 'Setting Up Demo' : 'Create Demo Environment'}
          </DialogTitle>
          <DialogDescription>{stepDescriptions[step]}</DialogDescription>
        </DialogHeader>

        {step !== 'processing' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              Step {getStepNumber()} of {getTotalSteps()}
            </span>
            <Progress value={(getStepNumber() / getTotalSteps()) * 100} className="flex-1 h-2" />
          </div>
        )}

        {/* Step 1: Customer Details + URL */}
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
                    We'll extract the logo, colors, header, and footer from this site
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Use Cases */}
        {step === 'use-cases' && (
          <div className="py-4 space-y-4">
            {loadingUseCases ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : globalUseCases.filter(uc => uc.isEnabled).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No use cases configured. Please add them in Global Settings → Use Cases.
              </p>
            ) : (
              <div className="grid gap-3">
                {globalUseCases.filter(uc => uc.isEnabled).map((uc) => {
                  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
                  const IconComp = icons[uc.iconName] || icons['Package'];
                  return (
                    <button
                      key={uc.id}
                      onClick={() => toggleUseCase(uc.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                        selectedUseCases.includes(uc.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedUseCases.includes(uc.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {IconComp && <IconComp className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{uc.title}</h4>
                        {uc.description && <p className="text-sm text-muted-foreground">{uc.description}</p>}
                      </div>
                      {selectedUseCases.includes(uc.id) && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Form Template */}
        {step === 'template' && (
          <div className="grid grid-cols-2 gap-4 py-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "industry-card text-left",
                  selectedTemplate === template.id && "selected"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: template.color }}
                  >
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{template.label}</h3>
                      {selectedTemplate === template.id && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Verification Types */}
        {step === 'verification' && (
          <div className="py-4 space-y-4">
            {loadingTypes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : verificationTypes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No verification types configured. Please add them in Verification Settings.
              </p>
            ) : (
              <div className="grid gap-3">
                {verificationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => toggleVerificationType(type.typeKey)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                      selectedVerificationTypes.includes(type.typeKey)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      selectedVerificationTypes.includes(type.typeKey)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getIconByName(type.iconName)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{type.displayName}</h4>
                      {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
                    </div>
                    {selectedVerificationTypes.includes(type.typeKey) && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5 (conditional): mDL Providers */}
        {step === 'providers' && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which mobile ID providers to enable for this demo
            </p>
            {loadingProviders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : mdlProviders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No mDL providers configured. Please add them in Verification Settings.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mdlProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => toggleMdlProvider(provider.providerKey)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      selectedMdlProviders.includes(provider.providerKey)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    {provider.logoUrl ? (
                      <img src={provider.logoUrl} alt={provider.displayName} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                        {provider.displayName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{provider.displayName}</h4>
                      {provider.countryCode && <p className="text-xs text-muted-foreground">{provider.countryCode}</p>}
                    </div>
                    {selectedMdlProviders.includes(provider.providerKey) && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
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
                  {task.status === 'complete' && <Check className="w-5 h-5 text-success" />}
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

        {/* Navigation */}
        {step !== 'processing' && (
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
      </DialogContent>
    </Dialog>
  );
}
