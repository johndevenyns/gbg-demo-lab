// Global Use Case types - use cases belong to an Industry

export interface UseCasePageContent {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  ctaLabel?: string;
  ctaDescription?: string;
  accentColor?: string;
  showLandingPage?: boolean;
  tabLabel?: string;
}

export { PORTAL_TYPE_OPTIONS, type PortalType } from '@/types/industry';

export interface GlobalUseCase {
  id: string;
  title: string;
  description?: string;
  iconName: string;
  defaultFormSteps: Record<string, unknown>[];
  defaultVerificationType: string;
  defaultPageContent: UseCasePageContent;
  displayOrder: number;
  isEnabled: boolean;
  showFillPass: boolean;
  showFillFail: boolean;
  portalType?: string | null; // deprecated - now inherited from industry
  createdAt: string;
  updatedAt: string;
}

// Link between a demo and a global use case (with optional overrides)
export interface DemoUseCaseLink {
  id: string;
  demoId: string;
  useCaseId: string;
  isEnabled: boolean;
  displayOrder: number;
  showOnLandingPage: boolean;
  titleOverride?: string | null;
  formStepsOverride?: Record<string, unknown>[] | null;
  verificationTypeOverride?: string | null;
  pageContentOverride?: UseCasePageContent | null;
  portalTypeOverride?: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data from global_use_cases (populated via query)
  globalUseCase?: GlobalUseCase;
}

// Resolved use case for rendering (merges global defaults with demo overrides)
export interface ResolvedUseCase {
  linkId: string;
  useCaseId: string;
  title: string;
  titleOverride?: string | null;
  description?: string;
  iconName: string;
  formSteps: Record<string, unknown>[];
  verificationType: string;
  pageContent: UseCasePageContent;
  isEnabled: boolean;
  displayOrder: number;
  showOnLandingPage: boolean;
  showFillPass: boolean;
  showFillFail: boolean;
  portalType?: string | null;
}
