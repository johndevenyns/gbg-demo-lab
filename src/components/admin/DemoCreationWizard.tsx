import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, Globe, ArrowRight, ArrowLeft, Loader2, Monitor, Eye, EyeOff, Image, Code,
  Sparkles, Database, Palette, FileSearch, Workflow, Rocket, AlertTriangle,
} from "lucide-react";
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
import { IndustryTemplate, DemoEnvironment, FormStep, FormField, FormFieldType } from "@/types/demo";
import { scrapingApi, ScrapedBranding, ExtractedField } from "@/lib/api/scraping";
import { useTestProfiles } from "@/hooks/useTestProfiles";
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

type TaskPhase = 'foundation' | 'branding' | 'forms' | 'workflow' | 'finalize';

interface ProcessingTask {
  id: string;
  label: string;
  phase: TaskPhase;
  status: 'pending' | 'in_progress' | 'complete' | 'error' | 'skipped';
  detail?: string;
}

const PHASE_META: Record<TaskPhase, { title: string; icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  foundation: { title: 'Foundation', icon: Database, tint: 'text-blue-500' },
  branding: { title: 'Branding & Site Mirror', icon: Palette, tint: 'text-purple-500' },
  forms: { title: 'Form Discovery', icon: FileSearch, tint: 'text-amber-500' },
  workflow: { title: 'Workflow', icon: Workflow, tint: 'text-emerald-500' },
  finalize: { title: 'Finishing Touches', icon: Rocket, tint: 'text-pink-500' },
};

const FUN_MESSAGES = [
  'Mixing pixels and policies…',
  'Teaching forms to behave…',
  'Borrowing your customer\'s style…',
  'Wiring up the workflow…',
  'Polishing the demo to a shine…',
  'Aligning the verification stars…',
];

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

/** Safely normalize a user-entered URL. Adds https:// if missing and never throws. */
function safeNormalizeUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProto).toString();
  } catch {
    return null;
  }
}

/** Safely extract a hostname; returns the original string if URL parsing fails. */
function safeHostname(input: string): string {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).hostname;
  } catch {
    return input;
  }
}

/** Safely extract a pathname; returns '/' on failure. */
function safePathname(input: string): string {
  try {
    return new URL(input).pathname || '/';
  } catch {
    return '/';
  }
}

export function DemoCreationWizard({ open, onOpenChange, onCreated }: DemoCreationWizardProps) {
  const createDemo = useCreateDemo();
  const updateDemo = useUpdateDemo();
  const addUseCaseLink = useAddDemoUseCaseLink();
  
  const { data: industries = [], isLoading: loadingIndustries } = useIndustries();
  const { data: globalUseCases = [], isLoading: loadingUseCases } = useGlobalUseCases();
  const { data: portalTypes = [] } = useEnabledPortalTypes();
  const { data: globalProfiles = [] } = useTestProfiles();
  
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
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [funMessageIndex, setFunMessageIndex] = useState(0);
  const [discoveredFormUrl, setDiscoveredFormUrl] = useState<string | null>(null);
  const [discoveredFieldCount, setDiscoveredFieldCount] = useState<number | null>(null);
  const [failedTaskId, setFailedTaskId] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

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

  // Elapsed-time ticker while processing
  useEffect(() => {
    if (step !== 'processing' || !processingStartedAt) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - processingStartedAt);
    }, 250);
    return () => clearInterval(id);
  }, [step, processingStartedAt]);

  // Rotate fun status messages
  useEffect(() => {
    if (step !== 'processing') return;
    const id = setInterval(() => {
      setFunMessageIndex(i => (i + 1) % FUN_MESSAGES.length);
    }, 2400);
    return () => clearInterval(id);
  }, [step]);

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
    setProcessingStartedAt(null);
    setElapsedMs(0);
    setFunMessageIndex(0);
    setDiscoveredFormUrl(null);
    setDiscoveredFieldCount(null);
    setFailedTaskId(null);
    setRetryAttempt(0);
  };

  const toggleUseCase = (id: string) => setSelectedUseCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const updateTaskStatus = (taskId: string, status: ProcessingTask['status'], detail?: string) => {
    setProcessingTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, detail: detail ?? t.detail } : t));
  };

  const setTaskDetail = (taskId: string, detail: string) => {
    setProcessingTasks(prev => prev.map(t => t.id === taskId ? { ...t, detail } : t));
  };

  const selectedIndustry = industries.find(i => i.id === selectedIndustryId);
  const industryUseCases = globalUseCases.filter(uc => uc.isEnabled);

  const buildPreviewHtml = (headerHtml: string, footerHtml: string, css: string, buttonColor: string) => {
    const formHtml = generateFormHtml(DEFAULT_FORM_STYLE, buttonColor);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:system-ui,sans-serif;}*{box-sizing:border-box;}</style>${css ? `<style>${css}</style>` : ''}</head><body>${headerHtml || ''}<div style="padding:40px 20px;background:#f5f5f5;min-height:200px;">${formHtml}</div>${footerHtml || ''}</body></html>`;
  };

  const startProcessing = async () => {
    if (!customerName.trim() || !selectedIndustryId) return;

    // Validate the site URL up front so we fail with a helpful message instead of mid-flow.
    let normalizedSiteUrl: string | null = null;
    if (enableMirroring && siteUrl) {
      normalizedSiteUrl = safeNormalizeUrl(siteUrl);
      if (!normalizedSiteUrl) {
        setProcessingTasks([{ id: 'create', label: 'Creating demo environment', phase: 'foundation', status: 'error', detail: `"${siteUrl}" is not a valid URL. Please use a format like https://example.com` }]);
        setStep('processing');
        setProcessingError(`Invalid website URL: "${siteUrl}". Please go back and enter a valid URL.`);
        setFailedTaskId('create');
        setProcessingStartedAt(Date.now());
        return;
      }
    }

    const tasks: ProcessingTask[] = [
      { id: 'create', label: 'Creating demo environment', phase: 'foundation', status: 'pending' },
    ];
    if (enableMirroring && normalizedSiteUrl) {
      tasks.push({ id: 'scrape-html', label: 'Extracting HTML header & footer', phase: 'branding', status: 'pending' });
      tasks.push({ id: 'scrape-screenshot', label: 'Capturing pixel-perfect screenshot', phase: 'branding', status: 'pending' });
      tasks.push({ id: 'apply', label: 'Applying brand colors, logo & typography', phase: 'branding', status: 'pending' });
      tasks.push({ id: 'discover-form', label: 'Crawling site for application or contact form', phase: 'forms', status: 'pending' });
      tasks.push({ id: 'capture-form', label: 'Capturing form fields, labels & styling', phase: 'forms', status: 'pending' });
      tasks.push({ id: 'generate-steps', label: 'Generating matching workflow steps', phase: 'forms', status: 'pending' });
    }
    if (selectedUseCases.length > 0) {
      tasks.push({ id: 'use-cases', label: 'Linking use cases to demo', phase: 'workflow', status: 'pending' });
    }
    tasks.push({ id: 'finalize', label: 'Loading test profiles & finalizing', phase: 'finalize', status: 'pending' });

    setProcessingTasks(tasks);
    setStep('processing');
    setProcessingError(null);
    setFailedTaskId(null);
    setProcessingStartedAt(Date.now());
    setElapsedMs(0);
    setDiscoveredFormUrl(null);
    setDiscoveredFieldCount(null);

    let activeTaskId = 'create';
    try {
      // Step 1: Create the demo
      activeTaskId = 'create';
      updateTaskStatus('create', 'in_progress');
      setTaskDetail('create', `Provisioning environment for ${customerName.trim()}…`);
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
      updateTaskStatus('create', 'complete', `Demo /${demo.slug} ready`);

      // Step 2: Site mirroring - capture BOTH methods
      let scrapedData: ScrapedBranding | null = null;
      let refinedHtml: { headerHtml: string; footerHtml: string; css: string } | null = null;
      let screenshotCapture: { headerHtml: string; footerHtml: string; css: string } | null = null;
      const buttonColor = '#6366f1';

      if (enableMirroring && normalizedSiteUrl) {
        // Fetch site branding (returns HTML + screenshots)
        activeTaskId = 'scrape-html';
        updateTaskStatus('scrape-html', 'in_progress');
        setTaskDetail('scrape-html', `Fetching ${safeHostname(normalizedSiteUrl)}…`);
        let response;
        try {
          response = await scrapingApi.scrapeSiteBranding(normalizedSiteUrl);
        } catch (e) {
          response = { success: false, error: e instanceof Error ? e.message : 'Network error contacting scraper' };
        }
        if (response.success && response.data) {
          scrapedData = response.data;
          refinedHtml = {
            headerHtml: scrapedData.headerHtml || '',
            footerHtml: scrapedData.footerHtml || '',
            css: scrapedData.cssContent || '',
          };
          const headerKb = Math.round((scrapedData.headerHtml?.length || 0) / 1024);
          const cssKb = Math.round((scrapedData.cssContent?.length || 0) / 1024);
          updateTaskStatus('scrape-html', 'complete', `Header ${headerKb}KB · CSS ${cssKb}KB`);
        } else {
          updateTaskStatus('scrape-html', 'error', response.error || 'Could not fetch site HTML');
        }

        // Generate screenshot-based capture
        activeTaskId = 'scrape-screenshot';
        updateTaskStatus('scrape-screenshot', 'in_progress');
        try {
          if (scrapedData?.screenshot) {
            const screenshotSrc = getScreenshotSrc(scrapedData.screenshot);
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
            updateTaskStatus('scrape-screenshot', 'complete', 'Desktop snapshot saved');
          } else {
            updateTaskStatus('scrape-screenshot', 'skipped', 'No screenshot returned — you can capture manually later');
          }
        } catch (e) {
          updateTaskStatus('scrape-screenshot', 'skipped', e instanceof Error ? e.message : 'Screenshot processing failed');
        }

        // Apply branding (colors, logo, formStyle, BOTH captures)
        activeTaskId = 'apply';
        updateTaskStatus('apply', 'in_progress');
        const brandingUpdates: Record<string, unknown> = {
          customerSiteUrl: normalizedSiteUrl,
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

        try {
          await updateDemo.mutateAsync({ id: demo.id, updates: brandingUpdates as any });
          updateTaskStatus('apply', 'complete', `Brand color ${brandingUpdates.buttonColor}`);
        } catch (e) {
          updateTaskStatus('apply', 'error', e instanceof Error ? e.message : 'Failed to save branding');
        }

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

        // ===== Form Discovery & Capture (best-effort, non-blocking) =====
        let extractedFields: ExtractedField[] = [];
        let capturedFormSteps: FormStep[] | null = null;
        try {
          activeTaskId = 'discover-form';
          updateTaskStatus('discover-form', 'in_progress');
          setTaskDetail('discover-form', 'Scanning /apply, /contact, /signup…');
          const discovery = await scrapingApi.discoverForms(normalizedSiteUrl, { formType: 'any', maxPages: 6 });
          if (discovery.success && discovery.data?.best) {
            const best = discovery.data.best;
            setDiscoveredFormUrl(best.pageUrl);
            updateTaskStatus(
              'discover-form',
              'complete',
              `Found ${best.detectedKind} form on ${safePathname(best.pageUrl)} (${best.fieldCount} fields)`,
            );

            try {
              activeTaskId = 'capture-form';
              updateTaskStatus('capture-form', 'in_progress');
              setTaskDetail('capture-form', 'Extracting HTML, CSS & field metadata…');
              const capture = await scrapingApi.captureFormById(best.pageUrl, best.formId || '');
              if (capture.success && capture.data) {
                extractedFields = capture.data.extractedFields || [];
                setDiscoveredFieldCount(extractedFields.length);
                // Persist captured form styling (merge with existing)
                if (capture.data.styles) {
                  const formStyleFromCapture = formElementStylesToConfig(capture.data.styles);
                  await updateDemo.mutateAsync({
                    id: demo.id,
                    updates: { formStyle: formStyleFromCapture } as any,
                  });
                }
                updateTaskStatus(
                  'capture-form',
                  'complete',
                  `Captured ${extractedFields.length} field${extractedFields.length === 1 ? '' : 's'}`,
                );
              } else {
                updateTaskStatus('capture-form', 'skipped', 'Form found but capture failed — you can retry from Site Appearance');
              }
            } catch (e) {
              updateTaskStatus('capture-form', 'skipped', 'Capture skipped — retry from Site Appearance');
            }
          } else {
            updateTaskStatus('discover-form', 'skipped', 'No suitable form found on site');
            updateTaskStatus('capture-form', 'skipped', 'Skipped — no form to capture');
          }
        } catch (e) {
          updateTaskStatus('discover-form', 'skipped', 'Discovery skipped — you can run it later');
          updateTaskStatus('capture-form', 'skipped', 'Skipped');
        }

        // Generate workflow steps from captured fields
        try {
          updateTaskStatus('generate-steps', 'in_progress');
          if (extractedFields.length > 0) {
            const formFields: FormField[] = extractedFields.map((f, i) => ({
              id: `f-${Date.now()}-${i}`,
              type: (f.canonicalType as FormFieldType) || 'text',
              label: f.label || f.name,
              name: f.name || `field_${i}`,
              placeholder: f.placeholder || undefined,
              required: f.required,
              order: i + 1,
            }));
            capturedFormSteps = [{
              id: `step-${Date.now()}`,
              title: 'Application',
              description: 'Auto-generated from captured form',
              order: 1,
              fields: formFields,
            }];
            await updateDemo.mutateAsync({
              id: demo.id,
              updates: { formSteps: capturedFormSteps } as any,
            });
            updateTaskStatus('generate-steps', 'complete', `Generated 1 step with ${formFields.length} field${formFields.length === 1 ? '' : 's'}`);
          } else {
            updateTaskStatus('generate-steps', 'skipped', 'No fields to map — using default workflow');
          }
        } catch (e) {
          updateTaskStatus('generate-steps', 'skipped', 'Skipped — using default workflow');
        }
      }

      // Link selected use cases
      let shouldShowFillPass = false;
      let shouldShowFillFail = false;
      if (selectedUseCases.length > 0) {
        activeTaskId = 'use-cases';
        updateTaskStatus('use-cases', 'in_progress');
        setTaskDetail('use-cases', `Linking ${selectedUseCases.length} use case${selectedUseCases.length === 1 ? '' : 's'}…`);
        let linked = 0;
        const linkErrors: string[] = [];
        for (let i = 0; i < selectedUseCases.length; i++) {
          try {
            await addUseCaseLink.mutateAsync({ demoId: demo.id, useCaseId: selectedUseCases[i], displayOrder: i, showOnLandingPage: !hiddenFromLanding.has(selectedUseCases[i]) });
            linked += 1;
            const uc = globalUseCases.find(u => u.id === selectedUseCases[i]);
            if (uc?.showFillPass) shouldShowFillPass = true;
            if (uc?.showFillFail) shouldShowFillFail = true;
          } catch (e) {
            linkErrors.push(e instanceof Error ? e.message : 'unknown');
          }
        }
        if (linkErrors.length === 0) {
          updateTaskStatus('use-cases', 'complete', `${linked} linked`);
        } else if (linked > 0) {
          updateTaskStatus('use-cases', 'complete', `${linked} of ${selectedUseCases.length} linked (${linkErrors.length} failed)`);
        } else {
          updateTaskStatus('use-cases', 'error', `Could not link use cases: ${linkErrors[0]}`);
        }
      }

      activeTaskId = 'finalize';
      updateTaskStatus('finalize', 'in_progress');
      setTaskDetail('finalize', 'Loading Pass / Fail test profiles…');
      // Always populate test data from global profiles so Fill Pass/Fail works
      // Fetch profiles directly if the cached query hasn't resolved yet
      let profiles = globalProfiles;
      if (!profiles || profiles.length === 0) {
        const { data: freshProfiles } = await supabase
          .from('test_user_profiles')
          .select('*')
          .order('profile_type', { ascending: true });
        profiles = (freshProfiles || []) as typeof globalProfiles;
      }
      const firstPass = profiles.find((p) => p.profile_type === 'pass');
      const firstFail = profiles.find((p) => p.profile_type === 'fail');
      const passData: Record<string, string> = firstPass ? (firstPass.field_data as Record<string, string>) : {};
      const failData: Record<string, string> = firstFail ? (firstFail.field_data as Record<string, string>) : {};
      
      try {
        await updateDemo.mutateAsync({
          id: demo.id,
          updates: {
            storedTestData: {
              passData,
              failData,
              showFillPassButton: shouldShowFillPass || Object.keys(passData).length > 0,
              showFillFailButton: shouldShowFillFail || Object.keys(failData).length > 0,
            },
          },
        });
        updateTaskStatus('finalize', 'complete', 'Demo ready to preview');
      } catch (e) {
        updateTaskStatus('finalize', 'error', e instanceof Error ? e.message : 'Failed to save test profiles');
      }

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
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setProcessingError(message);
      setFailedTaskId(activeTaskId);
      // Mark the active task as errored so the UI shows where it failed
      setProcessingTasks(prev => prev.map(t =>
        t.id === activeTaskId
          ? { ...t, status: 'error', detail: message }
          : t.status === 'in_progress' ? { ...t, status: 'error', detail: message } : t
      ));
    }
  };

  /** Continue with whatever has been created so far (skip remaining tasks). */
  const handleContinueAnyway = () => {
    if (!createdDemoId) {
      onOpenChange(false);
      return;
    }
    onOpenChange(false);
    onCreated(createdDemoId);
  };

  /** Retry the entire processing flow. If a demo was already created, clear it so we don't double-create. */
  const handleRetry = async () => {
    setRetryAttempt(a => a + 1);
    // If a demo was created but later steps failed, keep it and continue from the failed task is complex —
    // simplest reliable approach is to clean up the half-created demo and re-run.
    if (createdDemoId) {
      try {
        await supabase.from('demo_environments').delete().eq('id', createdDemoId);
      } catch (e) {
        console.warn('Could not delete partially-created demo before retry:', e);
      }
      setCreatedDemoId(null);
    }
    setProcessingError(null);
    setFailedTaskId(null);
    startProcessing();
  };

  /** Go back to the wizard form (e.g. to fix a bad URL). */
  const handleBackToForm = () => {
    setProcessingTasks([]);
    setProcessingError(null);
    setFailedTaskId(null);
    setStep('details');
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
        {step === 'processing' && (() => {
          const activeTask = processingTasks.find(t => t.status === 'in_progress');
          const lastCompleted = [...processingTasks].reverse().find(t => t.status === 'complete' || t.status === 'skipped' || t.status === 'error');
          const headlineTask = activeTask || lastCompleted;
          const ActiveIcon = headlineTask ? PHASE_META[headlineTask.phase].icon : Sparkles;
          const activeTint = headlineTask ? PHASE_META[headlineTask.phase].tint : 'text-primary';
          const elapsedSec = Math.floor(elapsedMs / 1000);
          const elapsedLabel = elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;

          // Group tasks by phase, only showing phases that have tasks
          const phaseOrder: TaskPhase[] = ['foundation', 'branding', 'forms', 'workflow', 'finalize'];
          const tasksByPhase = phaseOrder
            .map(phase => ({ phase, tasks: processingTasks.filter(t => t.phase === phase) }))
            .filter(g => g.tasks.length > 0);

          return (
            <div className="py-4 space-y-5">
              {/* Hero status: animated icon + current task + elapsed */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-muted/30 p-5">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center bg-background border border-border shadow-sm shrink-0",
                    activeTask && "animate-pulse",
                  )}>
                    <ActiveIcon className={cn("w-7 h-7", activeTint)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {headlineTask ? PHASE_META[headlineTask.phase].title : 'Starting'}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{elapsedLabel}</Badge>
                    </div>
                    <h3 className="text-base font-semibold mt-0.5 truncate">
                      {activeTask ? activeTask.label : (processingError ? 'Stopped' : 'All done!')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {activeTask?.detail || (activeTask ? FUN_MESSAGES[funMessageIndex] : 'Wrapping up your demo…')}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <Progress value={progressPercent} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{processingTasks.filter(t => t.status === 'complete' || t.status === 'skipped').length} of {processingTasks.length} complete</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Discovery highlights */}
              {(discoveredFormUrl || discoveredFieldCount !== null) && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                  {discoveredFormUrl && (
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-muted-foreground">Form found at</span>
                      <code className="font-mono text-foreground truncate">{discoveredFormUrl}</code>
                    </div>
                  )}
                  {discoveredFieldCount !== null && discoveredFieldCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{discoveredFieldCount} field{discoveredFieldCount === 1 ? '' : 's'} extracted and mapped to canonical types</span>
                    </div>
                  )}
                </div>
              )}

              {/* Phased task list */}
              <div className="space-y-3">
                {tasksByPhase.map(({ phase, tasks }) => {
                  const PhaseIcon = PHASE_META[phase].icon;
                  const phaseDone = tasks.every(t => t.status === 'complete' || t.status === 'skipped' || t.status === 'error');
                  const phaseActive = tasks.some(t => t.status === 'in_progress');
                  return (
                    <div key={phase} className="rounded-lg border border-border overflow-hidden">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20",
                        phaseActive && "bg-primary/5",
                      )}>
                        <PhaseIcon className={cn("w-4 h-4", PHASE_META[phase].tint)} />
                        <span className="text-xs font-semibold uppercase tracking-wider">{PHASE_META[phase].title}</span>
                        {phaseDone && <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                        {phaseActive && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-auto" />}
                      </div>
                      <div className="divide-y divide-border">
                        {tasks.map(task => (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-start gap-3 px-3 py-2.5 transition-all",
                              task.status === 'in_progress' && "bg-primary/5",
                            )}
                          >
                            <div className="mt-0.5 shrink-0">
                              {task.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                              {task.status === 'in_progress' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                              {task.status === 'complete' && (
                                <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                </div>
                              )}
                              {task.status === 'skipped' && (
                                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-muted-foreground text-[10px] font-bold">–</span>
                                </div>
                              )}
                              {task.status === 'error' && (
                                <div className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center">
                                  <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm leading-tight",
                                task.status === 'in_progress' && "font-medium",
                                task.status === 'complete' && "text-muted-foreground",
                                task.status === 'skipped' && "text-muted-foreground line-through decoration-muted-foreground/30",
                              )}>
                                {task.label}
                              </p>
                              {task.detail && (
                                <p className={cn(
                                  "text-xs mt-0.5 truncate",
                                  task.status === 'error' ? "text-destructive" : "text-muted-foreground",
                                )}>
                                  {task.detail}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {processingError && (() => {
                const failedTask = processingTasks.find(t => t.id === failedTaskId);
                const failedPhaseTitle = failedTask ? PHASE_META[failedTask.phase].title : null;
                const isFatal = failedTaskId === 'create' || !createdDemoId;
                return (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/30 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-destructive">
                            {isFatal ? 'Demo creation failed' : 'Setup hit a problem'}
                          </h4>
                          {failedPhaseTitle && (
                            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                              {failedPhaseTitle}
                            </Badge>
                          )}
                          {retryAttempt > 0 && (
                            <Badge variant="outline" className="text-[10px]">Attempt {retryAttempt + 1}</Badge>
                          )}
                        </div>
                        {failedTask && (
                          <p className="text-xs text-muted-foreground">
                            Stopped at: <span className="font-medium text-foreground">{failedTask.label}</span>
                          </p>
                        )}
                        <p className="text-xs text-destructive/90 font-mono break-words bg-destructive/5 rounded px-2 py-1.5 mt-1">
                          {processingError}
                        </p>
                        {!isFatal && createdDemoId && (
                          <p className="text-xs text-muted-foreground italic">
                            Your demo was created, but some optional setup didn't finish. You can continue and configure it manually, or retry to start over.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={handleBackToForm}>
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                        Back to form
                      </Button>
                      {!isFatal && createdDemoId && (
                        <Button variant="outline" size="sm" onClick={handleContinueAnyway}>
                          Continue anyway
                        </Button>
                      )}
                      <Button size="sm" onClick={handleRetry} className="gradient-primary">
                        <Loader2 className="w-3.5 h-3.5 mr-1.5" />
                        Retry
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

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
