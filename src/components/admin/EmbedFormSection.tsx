import { useState } from 'react';
import { Code2, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EmbedFormSectionProps {
  slug: string;
}

export function EmbedFormSection({ slug }: EmbedFormSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedField, setCopiedField] = useState<'embed' | 'iframe' | null>(null);
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `${baseUrl}/embed/${slug}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border: none;"></iframe>`;
  
  const handleCopy = async (text: string, field: 'embed' | 'iframe') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card className="glass-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Embed Form
                </CardTitle>
                <CardDescription>
                  Use these URLs to embed the form on external sites
                </CardDescription>
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Embed URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={embedUrl} 
                    readOnly 
                    className="font-mono text-sm bg-muted/50"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy(embedUrl, 'embed')}
                  >
                    {copiedField === 'embed' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Iframe Code</Label>
                <div className="flex gap-2">
                  <Input 
                    value={iframeCode} 
                    readOnly 
                    className="font-mono text-xs bg-muted/50"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleCopy(iframeCode, 'iframe')}
                  >
                    {copiedField === 'iframe' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
