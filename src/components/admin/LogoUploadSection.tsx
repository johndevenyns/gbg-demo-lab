 import { useState, useRef } from "react";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { ImageOff, Upload, Link, Loader2, Trash2 } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { DemoEnvironment } from "@/types/demo";
 
 interface LogoUploadSectionProps {
   demo: DemoEnvironment;
   onUpdate: (updates: Partial<DemoEnvironment>) => void;
 }
 
 function LogoPreview({ url, size = 'lg' }: { url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
   const [hasError, setHasError] = useState(false);
   
   const sizeClasses = {
     sm: 'w-10 h-10',
     md: 'w-16 h-16',
     lg: 'w-24 h-24'
   };
   
   if (!url || hasError) {
     return (
       <div className={`${sizeClasses[size]} rounded-lg border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center`}>
         <ImageOff className="w-6 h-6 text-muted-foreground" />
         <span className="text-[10px] text-muted-foreground mt-1">No logo</span>
       </div>
     );
   }
   
   return (
     <div className={`${sizeClasses[size]} rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden p-2`}>
       <img 
         src={url} 
         alt="Logo preview" 
         className="max-w-full max-h-full object-contain"
         onError={() => setHasError(true)}
       />
     </div>
   );
 }
 
 export function LogoUploadSection({ demo, onUpdate }: LogoUploadSectionProps) {
   const [isUploading, setIsUploading] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { toast } = useToast();
   
   const logoSource = demo.useUploadedLogo ? 'uploaded' : 'linked';
   const activeLogoUrl = logoSource === 'uploaded' ? demo.uploadedLogoUrl : demo.logoUrl;
   
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     // Validate file type
     if (!file.type.startsWith('image/')) {
       toast({
         title: "Invalid file type",
         description: "Please upload an image file (PNG, JPG, SVG, etc.)",
         variant: "destructive"
       });
       return;
     }
     
     // Validate file size (5MB max)
     if (file.size > 5 * 1024 * 1024) {
       toast({
         title: "File too large",
         description: "Logo must be less than 5MB",
         variant: "destructive"
       });
       return;
     }
     
     setIsUploading(true);
     
     try {
       const fileExt = file.name.split('.').pop();
       const fileName = `${demo.id}-logo-${Date.now()}.${fileExt}`;
       
       const { data, error } = await supabase.storage
         .from('demo-logos')
         .upload(fileName, file, { upsert: true });
       
       if (error) throw error;
       
       // Get public URL
       const { data: { publicUrl } } = supabase.storage
         .from('demo-logos')
         .getPublicUrl(data.path);
       
       onUpdate({ 
         uploadedLogoUrl: publicUrl,
         useUploadedLogo: true 
       });
       
       toast({
         title: "Logo uploaded",
         description: "Your logo has been uploaded successfully"
       });
     } catch (error) {
       console.error('Upload error:', error);
       toast({
         title: "Upload failed",
         description: "Failed to upload logo. Please try again.",
         variant: "destructive"
       });
     } finally {
       setIsUploading(false);
       // Reset file input
       if (fileInputRef.current) {
         fileInputRef.current.value = '';
       }
     }
   };
   
   const handleRemoveUploadedLogo = async () => {
     if (!demo.uploadedLogoUrl) return;
     
     try {
       // Extract filename from URL
       const urlParts = demo.uploadedLogoUrl.split('/');
       const fileName = urlParts[urlParts.length - 1];
       
       await supabase.storage
         .from('demo-logos')
         .remove([fileName]);
       
       onUpdate({ 
         uploadedLogoUrl: undefined,
         useUploadedLogo: false 
       });
       
       toast({
         title: "Logo removed",
         description: "Uploaded logo has been removed"
       });
     } catch (error) {
       console.error('Delete error:', error);
       // Still remove from demo even if storage delete fails
       onUpdate({ 
         uploadedLogoUrl: undefined,
         useUploadedLogo: false 
       });
     }
   };
   
   return (
     <div className="space-y-6">
       {/* Active Logo Preview */}
       <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border">
         <LogoPreview url={activeLogoUrl} size="lg" />
         <div className="flex-1 min-w-0">
           <Label className="text-sm font-medium">Active Logo</Label>
           <p className="text-sm text-muted-foreground mt-1">
             {logoSource === 'uploaded' 
               ? 'Using uploaded logo' 
               : demo.logoUrl 
                 ? 'Using linked logo URL' 
                 : 'No logo configured'}
           </p>
           {activeLogoUrl && (
             <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
               {activeLogoUrl}
             </p>
           )}
         </div>
       </div>
       
       {/* Logo Source Selection */}
       <div className="space-y-4">
         <Label className="text-sm font-medium">Logo Source</Label>
         <RadioGroup 
           value={logoSource}
           onValueChange={(value) => onUpdate({ useUploadedLogo: value === 'uploaded' })}
           className="grid grid-cols-2 gap-4"
         >
           {/* Uploaded Logo Option */}
           <label 
             className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
               logoSource === 'uploaded' 
                 ? 'border-primary bg-primary/5' 
                 : 'border-border hover:border-primary/50'
             }`}
           >
             <div className="flex items-center gap-2 mb-3">
               <RadioGroupItem value="uploaded" id="uploaded" />
               <Upload className="w-4 h-4 text-muted-foreground" />
               <span className="font-medium text-sm">Uploaded Logo</span>
             </div>
             
             <div className="space-y-3">
               {demo.uploadedLogoUrl ? (
                 <div className="flex items-center gap-3">
                   <LogoPreview url={demo.uploadedLogoUrl} size="md" />
                   <Button 
                     variant="ghost" 
                     size="sm"
                     onClick={(e) => {
                       e.preventDefault();
                       handleRemoveUploadedLogo();
                     }}
                     className="text-destructive hover:text-destructive"
                   >
                     <Trash2 className="w-4 h-4 mr-1" />
                     Remove
                   </Button>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                   <input
                     ref={fileInputRef}
                     type="file"
                     accept="image/*"
                     onChange={handleFileChange}
                     className="hidden"
                     id="logo-upload"
                   />
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={(e) => {
                       e.preventDefault();
                       fileInputRef.current?.click();
                     }}
                     disabled={isUploading}
                   >
                     {isUploading ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         Uploading...
                       </>
                     ) : (
                       <>
                         <Upload className="w-4 h-4 mr-2" />
                         Upload Logo
                       </>
                     )}
                   </Button>
                 </div>
               )}
               
               <p className="text-xs text-muted-foreground">
                 PNG, JPG, or SVG. Max 5MB.
               </p>
             </div>
           </label>
           
           {/* Linked Logo Option */}
           <label 
             className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
               logoSource === 'linked' 
                 ? 'border-primary bg-primary/5' 
                 : 'border-border hover:border-primary/50'
             }`}
           >
             <div className="flex items-center gap-2 mb-3">
               <RadioGroupItem value="linked" id="linked" />
               <Link className="w-4 h-4 text-muted-foreground" />
               <span className="font-medium text-sm">Linked Logo (URL)</span>
             </div>
             
             <div className="space-y-3">
               <div className="flex items-start gap-3">
                 <LogoPreview url={demo.logoUrl} size="md" />
                 <div className="flex-1 min-w-0">
                   <Input 
                     value={demo.logoUrl || ""} 
                     onChange={(e) => onUpdate({ logoUrl: e.target.value })}
                     onClick={(e) => e.stopPropagation()}
                     placeholder="https://..."
                     className="text-xs font-mono"
                   />
                 </div>
               </div>
               
               <p className="text-xs text-muted-foreground">
                 External URL to your logo image
               </p>
             </div>
           </label>
         </RadioGroup>
       </div>
     </div>
   );
 }