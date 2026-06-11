import { useParams } from "react-router-dom";
import { useDemoBySlug } from "@/hooks/useDemos";
import { Loader2 } from "lucide-react";
import { DemoFlowRenderer } from "@/components/preview/DemoFlowRenderer";
import { DEFAULT_SUCCESS_CONFIG, DEFAULT_FAILURE_CONFIG } from "@/components/preview/ResultPage";

/**
 * Embeddable form-only view without header/footer chrome.
 * Designed to be iframed into customer sites.
 */
export default function DemoEmbed() {
  const { slug } = useParams<{ slug: string }>();
  const { data: demo, isLoading, error } = useDemoBySlug(slug || "");
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !demo || !demo.isActive) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Form unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-transparent p-4"
      style={{ 
        fontFamily: demo.formStyle?.fontFamily || 'Inter, system-ui, sans-serif'
      }}
    >
      <div className="max-w-xl mx-auto">
        {demo.formSteps.length > 0 ? (
          <DemoFlowRenderer
            steps={demo.formSteps}
            buttonColor={demo.buttonColor}
            formStyle={demo.formStyle}
            successPageConfig={demo.successPageConfig || DEFAULT_SUCCESS_CONFIG}
            failurePageConfig={demo.failurePageConfig || DEFAULT_FAILURE_CONFIG}
            landingPageConfig={demo.landingPageConfig}
            approvedUrl={demo.approvedUrl}
            rejectedUrl={demo.rejectedUrl}
            customerName={demo.customerName}
            returnUrl={demo.returnUrl}
            includeQr={demo.includeQr}
            referenceIdPrefix={demo.referenceIdPrefix}
            storedTestData={demo.storedTestData}
            showTestButtons={false}
            logoUrl={demo.logoUrl}
            headerBgColor={demo.headerBgColor}
            headerTextColor={demo.headerTextColor}
            resourceId={demo.resourceId}
            resourceIdDocBio={demo.resourceIdDocBio}
            resourceIdDataBio={demo.resourceIdDataBio}
            resourceIdDataOnly={demo.resourceIdDataOnly}
            demoId={demo.id}
            onComplete={(success, refId) => {
              // Post message to parent window for iframe communication
              window.parent.postMessage({ 
                type: 'demo-flow-complete', 
                success, 
                referenceId: refId 
              }, '*');
            }}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No form configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
