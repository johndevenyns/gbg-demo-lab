import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DemoEnvironment, INDUSTRY_TEMPLATES, IndustryTemplate } from '@/types/demo';

interface DemoStore {
  demos: DemoEnvironment[];
  addDemo: (demo: DemoEnvironment) => void;
  updateDemo: (id: string, updates: Partial<DemoEnvironment>) => void;
  deleteDemo: (id: string) => void;
  getDemo: (idOrSlug: string) => DemoEnvironment | undefined;
  createFromTemplate: (customerName: string, template: IndustryTemplate) => DemoEnvironment;
}

const generateId = () => crypto.randomUUID();
const generateSlug = (name: string) => 
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      demos: [],
      
      addDemo: (demo) => set((state) => ({ 
        demos: [...state.demos, demo] 
      })),
      
      updateDemo: (id, updates) => set((state) => ({
        demos: state.demos.map((demo) => 
          demo.id === id 
            ? { ...demo, ...updates, updatedAt: new Date().toISOString() } 
            : demo
        )
      })),
      
      deleteDemo: (id) => set((state) => ({
        demos: state.demos.filter((demo) => demo.id !== id)
      })),
      
      getDemo: (idOrSlug) => {
        const { demos } = get();
        return demos.find(d => d.id === idOrSlug || d.slug === idOrSlug);
      },
      
      createFromTemplate: (customerName, template) => {
        const templateData = INDUSTRY_TEMPLATES[template];
        const id = generateId();
        const slug = generateSlug(customerName);
        
        const newDemo: DemoEnvironment = {
          id,
          slug,
          customerName,
          industryTemplate: template,
          verificationType: templateData.verificationType || 'docBio',
          returnUrl: '',
          resourceId: '',
          includeQr: true,
          headerBgColor: templateData.headerBgColor || '#1a1a2e',
          headerTextColor: templateData.headerTextColor || '#ffffff',
          buttonColor: templateData.buttonColor || '#6366f1',
          includeAddressVerification: templateData.includeAddressVerification || false,
          formSteps: JSON.parse(JSON.stringify(templateData.formSteps || [])),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        };
        
        set((state) => ({ demos: [...state.demos, newDemo] }));
        return newDemo;
      },
    }),
    {
      name: 'demo-environments',
    }
  )
);
