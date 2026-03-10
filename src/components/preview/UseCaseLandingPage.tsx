import { useState } from 'react';
import { ResolvedUseCase, UseCasePageContent } from '@/types/useCase';
import {
  UserPlus, FastForward, Package, Briefcase, Check,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus, FastForward, Package, Briefcase,
};

interface UseCaseLandingPageProps {
  useCases: ResolvedUseCase[];
  buttonColor?: string;
  onSelectUseCase: (useCase: ResolvedUseCase) => void;
}

export function UseCaseLandingPage({ useCases, buttonColor, onSelectUseCase }: UseCaseLandingPageProps) {
  const accent = buttonColor || '#6366f1';

  if (useCases.length === 1) {
    // Single use case - show its landing page directly
    const uc = useCases[0];
    const content = uc.pageContent;

    return (
      <div className="min-h-[60vh] flex flex-col">
        <div
          className="py-12 px-6 text-center"
          style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}05)` }}
        >
          {content.heroImageUrl && (
            <img src={content.heroImageUrl} alt={content.heroTitle || uc.title} className="mx-auto mb-6 max-h-48 rounded-lg object-cover" />
          )}
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1f2937' }}>
            {content.heroTitle || uc.title}
          </h1>
          {content.heroSubtitle && (
            <p className="text-base max-w-md mx-auto" style={{ color: '#6b7280' }}>
              {content.heroSubtitle}
            </p>
          )}
        </div>
        <div className="px-6 py-6 flex flex-col items-center gap-3 mt-auto">
          {content.ctaDescription && (
            <p className="text-sm text-center max-w-sm" style={{ color: '#6b7280' }}>
              {content.ctaDescription}
            </p>
          )}
          <button
            onClick={() => onSelectUseCase(uc)}
            className="px-8 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {content.ctaLabel || 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // Multiple use cases - show selection grid
  return (
    <div className="min-h-[60vh] flex flex-col">
      <div
        className="py-10 px-6 text-center"
        style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}05)` }}
      >
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1f2937' }}>
          How can we help you today?
        </h1>
        <p className="text-base max-w-md mx-auto" style={{ color: '#6b7280' }}>
          Select an option to get started.
        </p>
      </div>

      <div className="px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {useCases.map((uc) => {
            const IconComp = ICON_MAP[uc.iconName] ?? Package;
            const content = uc.pageContent;

            return (
              <button
                key={uc.useCaseId}
                onClick={() => onSelectUseCase(uc)}
                className="text-left rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg"
                style={{
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = accent;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${accent}20`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${accent}15` }}
                  >
                    <IconComp className="w-5 h-5" style={{ color: accent }} />
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-1" style={{ color: '#1f2937' }}>
                  {uc.title}
                </h3>
                {uc.description && (
                  <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                    {uc.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
