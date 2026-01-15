import { useParams } from "react-router-dom";
import { useDemoStore } from "@/stores/demoStore";

export default function DemoPreview() {
  const { slug } = useParams<{ slug: string }>();
  const { getDemo } = useDemoStore();
  
  const demo = getDemo(slug || "");
  
  if (!demo || !demo.isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Demo Not Found</h1>
          <p className="text-muted-foreground">This demo environment doesn't exist or is inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: demo.headerBgColor }}>
      {/* Header */}
      <header className="py-4 px-6" style={{ backgroundColor: demo.headerBgColor, color: demo.headerTextColor }}>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {demo.logoUrl && <img src={demo.logoUrl} alt={demo.customerName} className="h-8" />}
          <span className="font-semibold text-lg">{demo.customerName}</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="bg-background min-h-[80vh] py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
            <h1 className="text-2xl font-bold mb-6">Start Your Application</h1>
            
            {demo.formSteps.length > 0 && (
              <div className="space-y-4">
                {demo.formSteps[0].fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive">*</span>}</label>
                    <input 
                      type="text"
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <button 
              className="w-full mt-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: demo.buttonColor }}
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
