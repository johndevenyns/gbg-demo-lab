import { useState } from 'react';
import { DemoUseCase, UseCaseProduct } from '@/types/useCase';
import {
  Landmark, CreditCard, Package, ShoppingBag, Pill, Car, Crown,
  ShieldCheck, LogIn, Video, Briefcase, Sparkles, Check,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Landmark, CreditCard, Package, ShoppingBag, Pill, Car, Crown,
  ShieldCheck, LogIn, Video, Briefcase, Sparkles,
};

interface UseCaseLandingPageProps {
  useCase: DemoUseCase;
  buttonColor?: string;
  onContinue: () => void;
}

export function UseCaseLandingPage({ useCase, buttonColor, onContinue }: UseCaseLandingPageProps) {
  const content = useCase.pageContent;
  const accent = content.accentColor || buttonColor || '#6366f1';
  const products = content.products ?? [];
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    products.length > 0 ? products[0].id : null
  );

  const hasProducts = products.length > 0;
  // Legacy single-product fallback
  const hasSingleProduct = !hasProducts && !!content.productName;

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

      {/* Multi-product selection grid */}
      {hasProducts && (
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {products.map((product) => {
              const isSelected = selectedProductId === product.id;
              const IconComp = ICON_MAP[product.iconName ?? ''] ?? Package;
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className="relative text-left rounded-xl border-2 p-5 transition-all duration-200"
                  style={{
                    borderColor: isSelected ? accent : '#e5e7eb',
                    backgroundColor: isSelected ? `${accent}08` : '#ffffff',
                    boxShadow: isSelected
                      ? `0 4px 16px ${accent}20`
                      : '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  {isSelected && (
                    <div
                      className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: accent }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${accent}15` }}
                    >
                      <IconComp className="w-5 h-5" style={{ color: accent }} />
                    </div>
                    {product.price && (
                      <span className="ml-auto text-sm font-semibold" style={{ color: accent }}>
                        {product.price}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm" style={{ color: '#1f2937' }}>
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6b7280' }}>
                      {product.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy single product card */}
      {hasSingleProduct && (
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
          disabled={hasProducts && !selectedProductId}
          className="px-8 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {content.ctaLabel || 'Continue'}
        </button>
      </div>
    </div>
  );
}
