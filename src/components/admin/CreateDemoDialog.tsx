import { useState } from "react";
import { Building2, Car, Gamepad2, Shield, Landmark, Layers, Check, Heart, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDemo } from "@/hooks/useDemos";
import { IndustryTemplate } from "@/types/demo";
import { cn } from "@/lib/utils";

interface CreateDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

const templates: { id: IndustryTemplate; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "bank",
    label: "Banking",
    description: "Traditional banks & credit unions",
    icon: <Landmark className="w-6 h-6" />,
    color: "#1a1a2e",
  },
  {
    id: "retail",
    label: "Retail",
    description: "E-commerce & retail businesses",
    icon: <ShoppingBag className="w-6 h-6" />,
    color: "#00c4cc",
  },
  {
    id: "rental_car",
    label: "Rental Car",
    description: "Vehicle rental companies",
    icon: <Car className="w-6 h-6" />,
    color: "#ff6b00",
  },
  {
    id: "online_gambling",
    label: "Online Gambling",
    description: "Gaming & betting platforms",
    icon: <Gamepad2 className="w-6 h-6" />,
    color: "#8b5cf6",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    description: "Healthcare providers",
    icon: <Heart className="w-6 h-6" />,
    color: "#14b8a6",
  },
  {
    id: "insurance",
    label: "Insurance",
    description: "Insurance providers",
    icon: <Shield className="w-6 h-6" />,
    color: "#0077cc",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Start from scratch",
    icon: <Layers className="w-6 h-6" />,
    color: "#6366f1",
  },
];

export function CreateDemoDialog({ open, onOpenChange, onCreated }: CreateDemoDialogProps) {
  const createDemo = useCreateDemo();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [customerName, setCustomerName] = useState("");

  const handleCreate = async () => {
    if (!selectedTemplate || !customerName.trim()) return;
    
    createDemo.mutate(
      { customerName: customerName.trim(), template: selectedTemplate },
      {
        onSuccess: (demo) => {
          onOpenChange(false);
          resetForm();
          onCreated(demo.id);
        }
      }
    );
  };

  const resetForm = () => {
    setStep(1);
    setSelectedTemplate(null);
    setCustomerName("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Demo Environment</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Choose an industry template to get started" : "Enter the customer name for this demo"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "industry-card text-left",
                  selectedTemplate === template.id && "selected"
                )}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: template.color }}
                  >
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{template.label}</h3>
                      {selectedTemplate === template.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-4 space-y-4">
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
                This will be used for the demo URL: /demo/{customerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'your-company'}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-border">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 1 ? (
            <Button 
              onClick={() => setStep(2)} 
              disabled={!selectedTemplate}
              className="gradient-primary"
            >
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleCreate}
              disabled={!customerName.trim() || createDemo.isPending}
              className="gradient-primary"
            >
              {createDemo.isPending ? "Creating..." : "Create Demo"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
