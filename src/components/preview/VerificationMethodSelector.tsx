import { MdlProvider, MethodSelectionStepConfig, AVAILABLE_MDL_PROVIDERS } from '@/types/demo';
import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
import { ChevronRight, FileText, Smartphone } from 'lucide-react';

interface VerificationMethodSelectorProps {
  config: MethodSelectionStepConfig;
  formStyle?: FormStyleConfig;
  onSelectDocumentScan: () => void;
  onSelectProvider: (provider: MdlProvider) => void;
}

const DEFAULT_CONFIG: MethodSelectionStepConfig = {
  title: 'Choose your verification method',
  subtitle: 'Select how you\'d like to verify your identity',
  documentScanEnabled: true,
  documentScanTitle: 'Document Verification',
  documentScanDescription: 'Scan your driver\'s license or ID and take a selfie',
  documentScanPath: 'docbio',
  mobileIdEnabled: true,
  mobileIdProviders: AVAILABLE_MDL_PROVIDERS,
};

export function VerificationMethodSelector({
  config = DEFAULT_CONFIG,
  formStyle = DEFAULT_FORM_STYLE,
  onSelectDocumentScan,
  onSelectProvider,
}: VerificationMethodSelectorProps) {
  const enabledProviders = (config.mobileIdProviders || []).filter(p => p.enabled);

  return (
    <div 
      className="flex flex-col gap-8 py-8 px-4 max-w-lg mx-auto"
      style={{ fontFamily: formStyle.fontFamily }}
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 
          className="text-2xl font-bold"
          style={{ color: formStyle.labelColor || '#1a1a2e' }}
        >
          {config.title || DEFAULT_CONFIG.title}
        </h1>
        <p 
          className="text-sm"
          style={{ color: '#6b7280' }}
        >
          {config.subtitle || DEFAULT_CONFIG.subtitle}
        </p>
      </div>

      {/* Document Scan Section */}
      {config.documentScanEnabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            Document Scan
          </div>
          
          <button
            onClick={onSelectDocumentScan}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
            style={{
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            {/* Icon */}
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#dbeafe' }}
            >
              <FileText className="w-6 h-6" style={{ color: '#2563eb' }} />
            </div>

            {/* Content */}
            <div className="flex-1 text-left">
              <div 
                className="font-semibold"
                style={{ color: formStyle.labelColor || '#1a1a2e' }}
              >
                {config.documentScanTitle || DEFAULT_CONFIG.documentScanTitle}
              </div>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                {config.documentScanDescription || DEFAULT_CONFIG.documentScanDescription}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </button>
        </div>
      )}

      {/* Digital ID Providers Section */}
      {config.mobileIdEnabled && enabledProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Smartphone className="w-3.5 h-3.5" />
            Digital ID Providers
          </div>
          
          <div className="space-y-2">
            {enabledProviders.map((provider) => (
              <button
                key={provider.id}
                onClick={() => onSelectProvider(provider)}
                className="w-full flex items-center gap-4 p-3 rounded-xl border transition-all hover:shadow-sm hover:scale-[1.005] active:scale-[0.995]"
                style={{
                  backgroundColor: '#f8fafc',
                  borderColor: '#e2e8f0',
                }}
              >
                {/* Provider logo */}
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shrink-0 border border-gray-100 shadow-sm">
                  <img
                    src={provider.logoUrl}
                    alt={provider.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-xs font-bold text-gray-400">${provider.name.charAt(0)}</span>`;
                    }}
                  />
                </div>

                {/* Provider info */}
                <div className="flex-1 text-left">
                  <div 
                    className="font-semibold text-sm"
                    style={{ color: formStyle.labelColor || '#1a1a2e' }}
                  >
                    {provider.name}
                  </div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>
                    {provider.domain}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No options warning */}
      {!config.documentScanEnabled && (!config.mobileIdEnabled || enabledProviders.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No verification methods available.</p>
        </div>
      )}
    </div>
  );
}
