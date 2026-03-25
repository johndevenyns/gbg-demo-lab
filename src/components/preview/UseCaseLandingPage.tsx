import { ReactNode } from 'react';
import { ResolvedUseCase } from '@/types/useCase';

interface UseCaseLandingPageProps {
  useCases: ResolvedUseCase[];
  selectedUseCase: ResolvedUseCase;
  buttonColor?: string;
  heading?: string;
  onSelectUseCase: (useCase: ResolvedUseCase) => void;
  children: ReactNode;
}

export function UseCaseLandingPage({
  useCases,
  selectedUseCase,
  buttonColor,
  onSelectUseCase,
  children,
}: UseCaseLandingPageProps) {
  const accent = buttonColor || '#6366f1';
  const showTabs = useCases.length > 1;

  return (
    <div>
      {showTabs && (
        <>
          <h2
            className="text-xl font-bold text-center mb-5"
            style={{ color: '#1f2937' }}
          >
            Access Your Account
          </h2>
          <div
            className="flex rounded-lg p-1 mb-6"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            {useCases.map((uc) => {
              const isActive = uc.useCaseId === selectedUseCase.useCaseId;
              const label = uc.pageContent?.tabLabel || uc.title;
              return (
                <button
                  key={uc.useCaseId}
                  onClick={() => onSelectUseCase(uc)}
                  className="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200"
                  style={{
                    color: isActive ? '#1f2937' : '#6b7280',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive
                      ? '0 1px 3px rgba(0,0,0,0.1)'
                      : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}
      {children}
    </div>
  );
}
