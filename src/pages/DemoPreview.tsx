import { useParams, Link } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { DemoFlowRenderer } from "@/components/preview/DemoFlowRenderer";
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from "@/components/preview/ResultPage";
import { DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { useDemoUseCaseLinks } from "@/hooks/useUseCases";
import { useHeaderCtaLinks } from "@/hooks/useHeaderCtaLinks";
import { useIndustries } from "@/hooks/useIndustries";
import { UseCaseLandingPage } from "@/components/preview/UseCaseLandingPage";
import { BankingPortalShell } from "@/components/preview/mockPortal/BankingPortalShell";
import { ResolvedUseCase } from "@/types/useCase";
import { FormStep } from "@/types/demo";
import { PortalBranding, PortalVerificationTrigger } from "@/types/portalConfig";
import { StepUpVerificationModal, PostVerificationAction } from "@/components/preview/mockPortal/StepUpVerificationModal";
import { toast } from "@/hooks/use-toast";

// Helper functions for form styling
function getFormBorderRadius(radius?: string): string {
  switch (radius) {
    case 'none': return '0px';
    case 'sm': return '6px';
    case 'md': return '8px';
    case 'lg': return '12px';
    case 'xl': return '16px';
    case '2xl': return '24px';
    default: return '12px';
  }
}

function getFormShadow(shadow?: string): string {
  switch (shadow) {
    case 'none': return 'none';
    case 'sm': return '0 1px 2px rgba(0,0,0,0.05)';
    case 'md': return '0 4px 6px -1px rgba(0,0,0,0.1)';
    case 'lg': return '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)';
    case 'xl': return '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)';
    default: return '0 10px 15px -3px rgba(0,0,0,0.1)';
  }
}

export default function DemoPreview() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data: demo, isLoading, error } = useDemoBySlug(slug || "");
  const { data: links = [] } = useDemoUseCaseLinks(demo?.id);
  const { data: allIndustries = [] } = useIndustries();
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<ResolvedUseCase | null>(null);
  const [portalUser, setPortalUser] = useState<{ email: string; profileData?: Record<string, unknown> } | null>(null);
  const [showPortal, setShowPortal] = useState(false);
  const [portalVerificationAction, setPortalVerificationAction] = useState<string | null>(null);
  const [portalVerificationTrigger, setPortalVerificationTrigger] = useState<PortalVerificationTrigger | null>(null);
  const [portalTransactionContext, setPortalTransactionContext] = useState<{ amount?: number; recipientName?: string; fromAccount?: string } | undefined>(undefined);
  const [portalNavCommand, setPortalNavCommand] = useState<'dashboard' | 'repeat_transfer' | null>(null);

  // Get portal type directly from the demo
  const demoPortalType = demo?.portalType || 'none';

  // Resolve the industry for portal config (content/settings)
  const demoIndustry = useMemo(() => {
    if (!demo?.industryId) return null;
    return allIndustries.find(i => i.id === demo.industryId) ?? null;
  }, [demo?.industryId, allIndustries]);

  // Resolve use cases: merge global defaults with demo overrides
  const resolvedUseCases = useMemo((): ResolvedUseCase[] => {
    return links
      .filter(link => link.isEnabled && link.globalUseCase)
      .map(link => {
        const uc = link.globalUseCase!;
        return {
          linkId: link.id,
          useCaseId: uc.id,
          title: uc.title,
          description: uc.description,
          iconName: uc.iconName,
          formSteps: (link.formStepsOverride as Record<string, unknown>[]) ?? uc.defaultFormSteps,
          verificationType: link.verificationTypeOverride ?? uc.defaultVerificationType,
          pageContent: link.pageContentOverride
            ? { ...uc.defaultPageContent, ...link.pageContentOverride }
            : uc.defaultPageContent,
          isEnabled: link.isEnabled,
          displayOrder: link.displayOrder,
          showOnLandingPage: link.showOnLandingPage,
          // Portal type comes from the demo level
          portalType: demoPortalType,
        };
      });
  }, [links, demoPortalType]);

  const hasUseCases = resolvedUseCases.length > 0;

  // Auto-select the first landing-page-visible use case
  const landingPageUseCases = useMemo(() => resolvedUseCases.filter(uc => uc.showOnLandingPage), [resolvedUseCases]);
  useEffect(() => {
    if (!hasUseCases || selectedUseCase) return;
    setSelectedUseCase(landingPageUseCases[0] || resolvedUseCases[0]);
  }, [hasUseCases, resolvedUseCases, landingPageUseCases, selectedUseCase]);

  // Listen for CTA messages from the header iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'cta-use-case' && e.data?.useCaseId) {
        // Find the resolved use case matching the linked ID
        const target = resolvedUseCases.find(uc => uc.useCaseId === e.data.useCaseId);
        if (target) {
          handleSelectUseCase(target);
        }
      } else if (e.data?.type === 'scroll-to-form' && formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [resolvedUseCases]);

  const handleFlowComplete = useCallback((success: boolean, referenceId?: string) => {
    console.log('Flow complete:', { success, referenceId });
    // If a portal verification was in progress, return to portal on completion
    if (portalVerificationAction) {
      setPortalVerificationAction(null);
      return;
    }
    // If login just succeeded and we have portal user data, show the portal
    if (success && portalUser && !showPortal) {
      // Check if the selected use case has a portal type
      const activePortalType = selectedUseCase?.portalType;
      if (activePortalType && activePortalType !== 'none') {
        setShowPortal(true);
      }
    }
  }, [portalUser, showPortal, portalVerificationAction]);

  const handleLoginSuccess = useCallback((userData: { email: string; profileData?: Record<string, unknown> }) => {
    setPortalUser(userData);
  }, []);

  const handleSelectUseCase = useCallback((uc: ResolvedUseCase) => {
    setSelectedUseCase(uc);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    const loginUseCase = resolvedUseCases.find(uc => 
      uc.formSteps?.some((step: Record<string, unknown>) => step.submitAction === 'login')
    );
    if (loginUseCase) {
      setSelectedUseCase(loginUseCase);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [resolvedUseCases]);

  const handleNavigateToPortal = useCallback((loginUserData?: { email: string; profileData?: Record<string, unknown> }) => {
    // Navigate directly to the portal
    const activePortalType = selectedUseCase?.portalType || demoPortalType;
    if (activePortalType && activePortalType !== 'none') {
      // Use login user data if provided, existing portal user, or create guest
      if (loginUserData) {
        setPortalUser({ email: loginUserData.email, profileData: loginUserData.profileData });
      } else if (!portalUser) {
        setPortalUser({ email: 'guest@portal.demo', profileData: {} });
      }
      setShowPortal(true);
    }
  }, [selectedUseCase, demoPortalType, portalUser]);

  // Handle portal verification trigger (now receives full trigger object)
  const handlePortalVerification = useCallback((trigger: PortalVerificationTrigger, txContext?: { amount?: number; recipientName?: string; fromAccount?: string }) => {
    setPortalVerificationAction(trigger.action);
    setPortalVerificationTrigger(trigger);
    setPortalTransactionContext(txContext);
  }, []);

  const handlePortalLogout = useCallback(() => {
    setShowPortal(false);
    setPortalUser(null);
    setSelectedUseCase(null);
    if (resolvedUseCases.length > 0) {
      setTimeout(() => setSelectedUseCase(resolvedUseCases[0]), 50);
    }
  }, [resolvedUseCases]);




  // Determine portal user name from profile data
  const portalUserName = useMemo(() => {
    if (!portalUser) return 'User';
    const pd = portalUser.profileData;
    if (pd) {
      const first = (pd.firstName || pd.first_name || '') as string;
      const last = (pd.lastName || pd.last_name || '') as string;
      if (first || last) return `${first} ${last}`.trim();
    }
    return portalUser.email.split('@')[0];
  }, [portalUser]);

  // Build portal branding from demo's customer website branding
  const portalBranding = useMemo((): PortalBranding | undefined => {
    if (!demo) return undefined;
    return {
      sidebarBg: demo.headerBgColor || '#0F172A',
      sidebarText: demo.headerTextColor || '#ffffff',
      accentColor: demo.buttonColor || '#0D9488',
      pageBg: demo.formStyle?.contentAreaBgColor || '#F8FAFC',
      fontFamily: demo.formStyle?.fontFamily,
    };
  }, [demo]);

  // Build full HTML document for the preview iframe
  const previewDocument = useMemo(() => {
    if (!demo) return null;
    const activeMethod = demo.mirrorActiveMethod || 'html';
    const formStyle = demo.formStyle || DEFAULT_FORM_STYLE;
    let headerHtml = '';
    let footerHtml = '';
    let cssContent = '';

    if (activeMethod === 'screenshot') {
      headerHtml = demo.mirrorScreenshotHeaderHtml || '';
      footerHtml = demo.mirrorScreenshotFooterHtml || '';
    } else {
      headerHtml = demo.mirrorHtmlHeaderHtml || demo.scrapedHeaderHtml || '';
      footerHtml = demo.mirrorHtmlFooterHtml || demo.scrapedFooterHtml || '';
      cssContent = demo.mirrorHtmlCss || demo.scrapedCss || '';
    }

    if (!headerHtml.trim()) {
      headerHtml = `
        <header style="padding: 16px 24px; background: ${demo.headerBgColor || '#1a1a2e'}; color: ${demo.headerTextColor || '#ffffff'};">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 16px;">
            ${demo.logoUrl ? `<img src="${demo.logoUrl}" alt="${demo.customerName}" style="height: 32px;" />` : ''}
            <span style="font-weight: 600; font-size: 18px;">${demo.customerName}</span>
          </div>
        </header>
      `;
    }

    const headerCtaUseCaseId = demo.headerCtaUseCaseId || '';
    return { headerHtml, footerHtml, cssContent, formStyle, headerCtaSelector: demo.headerCtaSelector || '', headerCtaUseCaseId };
  }, [demo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6b7280' }} />
      </div>
    );
  }

  if (error || !demo || !demo.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1f2937' }}>Demo Not Found</h1>
          <p style={{ color: '#6b7280' }}>This demo environment doesn't exist or is inactive.</p>
        </div>
      </div>
    );
  }

  const hasMirroredHeader = Boolean(previewDocument?.headerHtml?.trim());
  const hasMirroredFooter = Boolean(previewDocument?.footerHtml?.trim());

  // Determine which form steps to show
  const activeFormSteps = selectedUseCase
    ? (selectedUseCase.formSteps as unknown as FormStep[])
    : demo.formSteps;

  const renderFlowRenderer = (steps: typeof activeFormSteps, key: string) => (
    <DemoFlowRenderer
      key={key}
      steps={steps}
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
      logoUrl={demo.logoUrl}
      headerBgColor={demo.headerBgColor}
      headerTextColor={demo.headerTextColor}
      resourceId={demo.resourceId}
      resourceIdDocBio={demo.resourceIdDocBio}
      resourceIdDataBio={demo.resourceIdDataBio}
      resourceIdDataOnly={demo.resourceIdDataOnly}
      demoId={demo.id}
      onNavigateToLogin={handleNavigateToLogin}
      onNavigateToPortal={handleNavigateToPortal}
      onComplete={handleFlowComplete}
      onLoginSuccess={handleLoginSuccess}
    />
  );

  // Show portal when login completes for a bank demo
  if (showPortal && portalUser && demo) {
    return (
      <div style={{ position: 'relative' }}>
        <BankingPortalShell
          userName={portalUserName}
          userEmail={portalUser.email}
          accentColor={demo.buttonColor || '#0D9488'}
          logoUrl={demo.useUploadedLogo ? demo.uploadedLogoUrl : demo.logoUrl}
          bankName={demo.customerName}
          portalConfig={demoIndustry?.portalConfig}
          branding={portalBranding}
          onTriggerVerification={handlePortalVerification}
          navCommand={portalNavCommand}
          onNavCommandHandled={() => setPortalNavCommand(null)}
          onLogout={handlePortalLogout}
        />

        {/* Step-Up Verification Modal */}
        <StepUpVerificationModal
          open={!!portalVerificationTrigger}
          trigger={portalVerificationTrigger}
          userData={{
            firstName: (portalUser?.profileData?.firstName || portalUser?.profileData?.first_name || '') as string,
            lastName: (portalUser?.profileData?.lastName || portalUser?.profileData?.last_name || '') as string,
            email: portalUser?.email,
          }}
          transactionContext={portalTransactionContext}
          buttonColor={demo.buttonColor}
          formStyle={demo.formStyle}
          customerName={demo.customerName}
          logoUrl={demo.useUploadedLogo ? demo.uploadedLogoUrl : demo.logoUrl}
          headerBgColor={demo.headerBgColor}
          headerTextColor={demo.headerTextColor}
          resourceId={demo.resourceId}
          resourceIdDocBio={demo.resourceIdDocBio}
          resourceIdDataBio={demo.resourceIdDataBio}
          resourceIdDataOnly={demo.resourceIdDataOnly}
          demoId={demo.id}
          includeQr={demo.includeQr}
          accentColor={demo.buttonColor || '#0D9488'}
          onComplete={(success, action) => {
            const trigger = portalVerificationTrigger;
            setPortalVerificationAction(null);
            setPortalVerificationTrigger(null);
            setPortalTransactionContext(undefined);

            if (success && trigger) {
              const behavior = trigger.postVerificationBehavior ||
                (trigger.category === 'transaction' ? 'show_completion' : 'return_with_toast');

              if (behavior === 'return_with_toast') {
                // Show toast and stay on current page — settings change reflected
                toast({
                  title: '✓ ' + (trigger.completionTitle || 'Success'),
                  description: trigger.successMessage || 'Change applied successfully.',
                });
              } else if (action === 'return_to_dashboard') {
                setPortalNavCommand('dashboard');
              } else if (action === 'repeat') {
                setPortalNavCommand('repeat_transfer');
              }
            }
          }}
          onCancel={() => {
            setPortalVerificationAction(null);
            setPortalVerificationTrigger(null);
            setPortalTransactionContext(undefined);
          }}
        />

        {/* Admin Exit Bar */}
        {!authLoading && isAdmin && (
          <>
            <div className="fixed bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border py-2 px-4 z-50">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Portal Preview</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {demo.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin">
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/demo/${demo.id}`}>
                      <Settings className="w-4 h-4 mr-1" />
                      Configure
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="h-12" />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: previewDocument?.formStyle?.contentAreaBgColor || '#f5f5f5', color: '#1a1a2e' }}>
      {/* Mirrored Header */}
      {hasMirroredHeader && previewDocument && (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { margin: 0; padding: 0; overflow: hidden; }
                  html { overflow: hidden; }
                  a { pointer-events: none; }
                  ${previewDocument.headerCtaSelector ? `${previewDocument.headerCtaSelector} { pointer-events: auto !important; cursor: pointer !important; }` : ''}
                </style>
                ${previewDocument.cssContent ? `<style>${previewDocument.cssContent}</style>` : ''}
              </head>
              <body>
                ${previewDocument.headerHtml}
                ${previewDocument.headerCtaSelector ? `
                <script>
                  document.addEventListener('click', function(e) {
                    var target = e.target.closest('${previewDocument.headerCtaSelector.replace(/'/g, "\\'")}');
                    if (target) {
                      e.preventDefault();
                      e.stopPropagation();
                      ${previewDocument.headerCtaUseCaseId 
                        ? `window.parent.postMessage({ type: 'cta-use-case', useCaseId: '${previewDocument.headerCtaUseCaseId}' }, '*');`
                        : `window.parent.postMessage({ type: 'scroll-to-form' }, '*');`
                      }
                    }
                  }, true);
                </script>
                ` : ''}
              </body>
            </html>
          `}
          className="w-full border-0"
          style={{ height: 'auto', minHeight: '60px' }}
          title="Site header"
          sandbox="allow-same-origin allow-scripts"
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            try {
              const body = iframe.contentDocument?.body;
              const firstChild = body?.firstElementChild as HTMLElement;
              const height = firstChild?.offsetHeight || body?.scrollHeight || 80;
              iframe.style.height = `${height}px`;
            } catch {
              iframe.style.height = '80px';
            }
          }}
        />
      )}

      {/* Main Content */}
      <main
        className="flex-1 py-4"
        style={{ backgroundColor: previewDocument?.formStyle?.contentAreaBgColor || 'transparent' }}
      >
        <div className="max-w-xl mx-auto px-4">
          <div
            ref={formRef}
            className="p-8"
            style={{
              backgroundColor: previewDocument?.formStyle?.formBgColor || 'white',
              borderRadius: getFormBorderRadius(previewDocument?.formStyle?.formBorderRadius),
              boxShadow: getFormShadow(previewDocument?.formStyle?.formShadow),
              border: `${previewDocument?.formStyle?.formBorderWidth || '1'}px solid ${previewDocument?.formStyle?.formBorderColor || '#e5e7eb'}`,
            }}
          >
            {hasUseCases && selectedUseCase ? (
              <UseCaseLandingPage
                useCases={resolvedUseCases.filter(uc => uc.showOnLandingPage)}
                selectedUseCase={selectedUseCase}
                buttonColor={demo.buttonColor}
                onSelectUseCase={setSelectedUseCase}
              >
                {activeFormSteps.length > 0 ? (
                  renderFlowRenderer(activeFormSteps, selectedUseCase.linkId)
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No form steps configured for this use case</p>
                  </div>
                )}
              </UseCaseLandingPage>
            ) : activeFormSteps.length > 0 ? (
              renderFlowRenderer(activeFormSteps, demo.id)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No form steps configured</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mirrored Footer */}
      {hasMirroredFooter && previewDocument && (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { margin: 0; padding: 0; overflow: hidden; }
                  html { overflow: hidden; }
                  a { pointer-events: none; }
                </style>
                ${previewDocument.cssContent ? `<style>${previewDocument.cssContent}</style>` : ''}
              </head>
              <body>
                ${previewDocument.footerHtml}
              </body>
            </html>
          `}
          className="w-full border-0"
          style={{ height: 'auto', minHeight: '60px' }}
          title="Site footer"
          sandbox="allow-same-origin"
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement;
            try {
              const body = iframe.contentDocument?.body;
              const firstChild = body?.firstElementChild as HTMLElement;
              const height = firstChild?.offsetHeight || body?.scrollHeight || 200;
              iframe.style.height = `${height}px`;
            } catch {
              iframe.style.height = '200px';
            }
          }}
        />
      )}

      {/* Admin Exit Bar */}
      {!authLoading && isAdmin && (
        <>
          <div className="fixed bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border py-2 px-4 z-50">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Preview Mode</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {demo.customerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/demo/${demo.id}`}>
                    <Settings className="w-4 h-4 mr-1" />
                    Configure
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="h-12" />
        </>
      )}
    </div>
  );
}
