import { DemoUseCase } from '@/types/useCase';

interface UseCaseLandingPageProps {
  useCase: DemoUseCase;
  buttonColor?: string;
  onContinue: () => void;
}

export function UseCaseLandingPage({ useCase, buttonColor, onContinue }: UseCaseLandingPageProps) {
  const content = useCase.pageContent;
  const accent = content.accentColor || buttonColor || '#6366f1';

  return (
    <div className="min-h-[60vh] flex flex-col">
      {/* Hero Section */}
      <div
        className="py-12 px-6 text-center"
        style={{
          background: `linear-gradient(135deg, ${accent}15, ${accent}05)`,
        }}
      >
        {content.heroImageUrl && (
          <img
            src={content.heroImageUrl}
            alt={content.heroTitle || useCase.title}
            className="mx-auto mb-6 max-h-48 rounded-lg object-cover"
          />
        )}
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1f2937' }}>
          {content.heroTitle || useCase.title}
        </h1>
        {content.heroSubtitle && (
          <p className="text-base max-w-md mx-auto" style={{ color: '#6b7280' }}>
            {content.heroSubtitle}
          </p>
        )}
      </div>

      {/* Product Card (if configured) */}
      {content.productName && (
        <div className="px-6 py-6 flex justify-center">
          <div
            className="max-w-sm w-full rounded-xl border p-5"
            style={{
              borderColor: `${accent}30`,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            {content.productImageUrl && (
              <img
                src={content.productImageUrl}
                alt={content.productName}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className="font-semibold text-lg" style={{ color: '#1f2937' }}>
              {content.productName}
            </h3>
            {content.productDescription && (
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                {content.productDescription}
              </p>
            )}
            {content.productPrice && (
              <p className="mt-3 text-lg font-bold" style={{ color: accent }}>
                {content.productPrice}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="px-6 py-6 flex flex-col items-center gap-3 mt-auto">
        {content.ctaDescription && (
          <p className="text-sm text-center max-w-sm" style={{ color: '#6b7280' }}>
            {content.ctaDescription}
          </p>
        )}
        <button
          onClick={onContinue}
          className="px-8 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {content.ctaLabel || 'Continue'}
        </button>
      </div>
    </div>
  );
}
