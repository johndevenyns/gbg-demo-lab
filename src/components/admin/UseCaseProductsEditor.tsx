import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { DebouncedInput, DebouncedTextarea } from '@/components/ui/debounced-input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Package } from 'lucide-react';
import { UseCaseProduct } from '@/types/useCase';

interface UseCaseProductsEditorProps {
  products: UseCaseProduct[];
  onChange: (products: UseCaseProduct[]) => void;
}

export function UseCaseProductsEditor({ products, onChange }: UseCaseProductsEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([
      ...products,
      {
        id: `product-${Date.now()}`,
        name: 'New Product',
        description: '',
        price: '',
      },
    ]);
  }, [products, onChange]);

  const handleUpdate = useCallback(
    (index: number, updates: Partial<UseCaseProduct>) => {
      const updated = products.map((p, i) => (i === index ? { ...p, ...updates } : p));
      onChange(updated);
    },
    [products, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange(products.filter((_, i) => i !== index));
    },
    [products, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Products</Label>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="w-3 h-3 mr-1" /> Add Product
        </Button>
      </div>

      {products.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          No products configured. Add products for users to select from before verification.
        </p>
      )}

      {products.map((product, idx) => (
        <div key={product.id} className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{product.name || 'Untitled'}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0" onClick={() => handleDelete(idx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <DebouncedInput
                value={product.name}
                onValueChange={(v) => handleUpdate(idx, { name: v })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price / Rate</Label>
              <DebouncedInput
                value={product.price ?? ''}
                onValueChange={(v) => handleUpdate(idx, { price: v })}
                placeholder="e.g. $0/mo"
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Description</Label>
              <DebouncedTextarea
                value={product.description ?? ''}
                onValueChange={(v) => handleUpdate(idx, { description: v })}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
