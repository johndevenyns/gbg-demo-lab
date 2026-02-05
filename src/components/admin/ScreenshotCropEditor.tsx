 import { useState, useRef, useEffect, useCallback } from "react";
 import { GripHorizontal } from "lucide-react";
 import { Label } from "@/components/ui/label";
 import { Button } from "@/components/ui/button";
 
 interface CropSettings {
   headerHeight: number;
   headerOffsetY: number;
   footerHeight: number;
   footerOffsetY: number;
  // Natural image dimensions for percentage-based calculations
  naturalHeight?: number;
  naturalWidth?: number;
 }
 
 interface ScreenshotCropEditorProps {
   screenshotSrc: string;
   cropSettings: CropSettings;
   onCropChange: (settings: CropSettings) => void;
   onReset: () => void;
   onApplyCrop?: () => void;
 }
 
 export function ScreenshotCropEditor({
   screenshotSrc,
   cropSettings,
   onCropChange,
   onReset,
   onApplyCrop,
 }: ScreenshotCropEditorProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   const imageRef = useRef<HTMLImageElement>(null);
   const [imageHeight, setImageHeight] = useState(0);
   const [imageWidth, setImageWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
   const [isDragging, setIsDragging] = useState<'header' | 'footer' | null>(null);
   const [dragStartY, setDragStartY] = useState(0);
   const [dragStartValue, setDragStartValue] = useState(0);
   
   // Calculate scale factor between displayed image and natural image size
   // This ensures crop values are in "natural pixels" of the original image
   const scaleFactor = imageHeight > 0 && naturalHeight > 0 ? imageHeight / naturalHeight : 1;
   
   // Convert crop settings to display pixels
   const displayHeaderHeight = Math.min(cropSettings.headerHeight * scaleFactor, imageHeight * 0.4);
   const displayHeaderOffset = cropSettings.headerOffsetY * scaleFactor;
   const displayFooterHeight = Math.min(cropSettings.footerHeight * scaleFactor, imageHeight * 0.4);
   const displayFooterOffset = cropSettings.footerOffsetY * scaleFactor;
 
   // Update image dimensions when loaded
   const handleImageLoad = useCallback(() => {
     if (imageRef.current) {
       setImageHeight(imageRef.current.clientHeight);
       setImageWidth(imageRef.current.clientWidth);
       // Capture natural dimensions of the original image
       setNaturalHeight(imageRef.current.naturalHeight);
       // Store natural height in crop settings for use in preview
       if (!cropSettings.naturalHeight && imageRef.current.naturalHeight > 0) {
         onCropChange({
           ...cropSettings,
           naturalHeight: imageRef.current.naturalHeight,
           naturalWidth: imageRef.current.naturalWidth,
         });
       }
     }
   }, [cropSettings, onCropChange]);
 
   useEffect(() => {
     const handleResize = () => {
       if (imageRef.current) {
         setImageHeight(imageRef.current.clientHeight);
         setImageWidth(imageRef.current.clientWidth);
       }
     };
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, []);
 
   // Handle drag interactions
   const handleMouseDown = useCallback((type: 'header' | 'footer', e: React.MouseEvent) => {
     e.preventDefault();
     setIsDragging(type);
     setDragStartY(e.clientY);
     setDragStartValue(type === 'header' 
       ? cropSettings.headerHeight + cropSettings.headerOffsetY
       : cropSettings.footerHeight + cropSettings.footerOffsetY
     );
   }, [cropSettings]);
 
   const handleMouseMove = useCallback((e: MouseEvent) => {
     if (!isDragging || !imageRef.current) return;
     
     const deltaY = e.clientY - dragStartY;
     const deltaPixels = deltaY / scaleFactor;
     
     if (isDragging === 'header') {
       // Dragging the header bottom edge changes the header height
       const newTotalHeight = Math.max(60, Math.min(500, dragStartValue + deltaPixels));
       onCropChange({
         ...cropSettings,
         headerHeight: Math.round(newTotalHeight - cropSettings.headerOffsetY),
       });
     } else if (isDragging === 'footer') {
       // Dragging the footer top edge changes the footer height
       const newTotalHeight = Math.max(60, Math.min(500, dragStartValue - deltaPixels));
       onCropChange({
         ...cropSettings,
         footerHeight: Math.round(newTotalHeight - cropSettings.footerOffsetY),
       });
     }
   }, [isDragging, dragStartY, dragStartValue, scaleFactor, cropSettings, onCropChange]);
 
   const handleMouseUp = useCallback(() => {
     setIsDragging(null);
   }, []);
 
   useEffect(() => {
     if (isDragging) {
       window.addEventListener('mousemove', handleMouseMove);
       window.addEventListener('mouseup', handleMouseUp);
       return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
       };
     }
   }, [isDragging, handleMouseMove, handleMouseUp]);
 
   // Handle top offset drag for header
   const handleHeaderTopDrag = useCallback((e: React.MouseEvent) => {
     e.preventDefault();
     const startY = e.clientY;
     const startOffset = cropSettings.headerOffsetY;
     
     const onMove = (moveEvent: MouseEvent) => {
       const deltaY = moveEvent.clientY - startY;
       const deltaPixels = deltaY / scaleFactor;
       const newOffset = Math.max(0, Math.min(300, startOffset + deltaPixels));
       onCropChange({
         ...cropSettings,
         headerOffsetY: Math.round(newOffset),
       });
     };
     
     const onUp = () => {
       window.removeEventListener('mousemove', onMove);
       window.removeEventListener('mouseup', onUp);
     };
     
     window.addEventListener('mousemove', onMove);
     window.addEventListener('mouseup', onUp);
   }, [cropSettings, scaleFactor, onCropChange]);
 
   // Handle bottom offset drag for footer
   const handleFooterBottomDrag = useCallback((e: React.MouseEvent) => {
     e.preventDefault();
     const startY = e.clientY;
     const startOffset = cropSettings.footerOffsetY;
     
     const onMove = (moveEvent: MouseEvent) => {
       const deltaY = moveEvent.clientY - startY;
       const deltaPixels = deltaY / scaleFactor;
       const newOffset = Math.max(0, Math.min(300, startOffset - deltaPixels));
       onCropChange({
         ...cropSettings,
         footerOffsetY: Math.round(newOffset),
       });
     };
     
     const onUp = () => {
       window.removeEventListener('mousemove', onMove);
       window.removeEventListener('mouseup', onUp);
     };
     
     window.addEventListener('mousemove', onMove);
     window.addEventListener('mouseup', onUp);
   }, [cropSettings, scaleFactor, onCropChange]);
 
   return (
     <div className="space-y-6">
       {/* Header Crop Section */}
       <div className="space-y-3">
         <div className="flex items-center justify-between">
           <Label className="text-base font-semibold flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-primary" />
             Header Crop Region
           </Label>
           <span className="text-xs text-muted-foreground font-mono">
             Height: {cropSettings.headerHeight}px | Offset: {cropSettings.headerOffsetY}px
           </span>
         </div>
         <p className="text-xs text-muted-foreground">
           Drag the handles to adjust the header region. The top handle adjusts offset from top, bottom handle adjusts height.
         </p>
         
         {/* Header crop visual */}
         <div 
           ref={containerRef}
           className="relative border rounded-lg overflow-hidden bg-muted/20 select-none"
           style={{ cursor: isDragging ? 'ns-resize' : 'default' }}
         >
           <img
             ref={imageRef}
             src={screenshotSrc}
             alt="Full screenshot for header cropping"
             className="w-full"
             style={{ maxHeight: '400px', objectFit: 'contain', objectPosition: 'top' }}
             onLoad={handleImageLoad}
             draggable={false}
           />
           
           {/* Dimmed overlay for non-selected area */}
           <div 
             className="absolute left-0 right-0 bg-black/50 pointer-events-none transition-all"
             style={{ 
               top: `${displayHeaderOffset + displayHeaderHeight}px`,
               bottom: 0,
             }}
           />
           
           {/* Top offset handle */}
           {displayHeaderOffset > 0 && (
             <div 
               className="absolute left-0 right-0 bg-black/50 pointer-events-none"
               style={{ top: 0, height: `${displayHeaderOffset}px` }}
             />
           )}
           
           {/* Top draggable handle */}
           <div
             className="absolute left-0 right-0 h-4 cursor-ns-resize group flex items-center justify-center"
             style={{ top: `${displayHeaderOffset - 8}px` }}
             onMouseDown={handleHeaderTopDrag}
           >
             <div className="w-16 h-1.5 rounded-full bg-primary/70 group-hover:bg-primary transition-colors shadow-lg" />
           </div>
           
           {/* Bottom draggable handle */}
           <div
             className="absolute left-0 right-0 h-6 cursor-ns-resize group flex items-center justify-center z-10"
             style={{ top: `${displayHeaderOffset + displayHeaderHeight - 12}px` }}
             onMouseDown={(e) => handleMouseDown('header', e)}
           >
             <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg group-hover:bg-primary/90 transition-colors">
               <GripHorizontal className="w-3 h-3" />
               Drag to resize
             </div>
           </div>
           
           {/* Selection border */}
           <div 
             className="absolute left-0 right-0 border-2 border-primary border-dashed pointer-events-none"
             style={{ 
               top: `${displayHeaderOffset}px`,
               height: `${displayHeaderHeight}px`,
             }}
           />
         </div>
       </div>
 
       {/* Footer Crop Section */}
       <div className="space-y-3">
         <div className="flex items-center justify-between">
           <Label className="text-base font-semibold flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-secondary" />
             Footer Crop Region
           </Label>
           <span className="text-xs text-muted-foreground font-mono">
             Height: {cropSettings.footerHeight}px | Offset: {cropSettings.footerOffsetY}px
           </span>
         </div>
         <p className="text-xs text-muted-foreground">
           Drag the handles to adjust the footer region. The bottom handle adjusts offset from bottom, top handle adjusts height.
         </p>
         
         {/* Footer crop visual */}
         <div 
           className="relative border rounded-lg overflow-hidden bg-muted/20 select-none"
           style={{ cursor: isDragging === 'footer' ? 'ns-resize' : 'default' }}
         >
           <img
             src={screenshotSrc}
             alt="Full screenshot for footer cropping"
             className="w-full"
             style={{ maxHeight: '400px', objectFit: 'contain', objectPosition: 'bottom' }}
             draggable={false}
             onLoad={(e) => {
               const img = e.target as HTMLImageElement;
               if (imageHeight === 0) {
                 setImageHeight(img.clientHeight);
               }
             }}
           />
           
           {/* Dimmed overlay for non-selected area (top) */}
           <div 
             className="absolute left-0 right-0 top-0 bg-black/50 pointer-events-none transition-all"
             style={{ 
               bottom: `${displayFooterOffset + displayFooterHeight}px`,
             }}
           />
           
           {/* Bottom offset dimmed area */}
           {displayFooterOffset > 0 && (
             <div 
               className="absolute left-0 right-0 bottom-0 bg-black/50 pointer-events-none"
               style={{ height: `${displayFooterOffset}px` }}
             />
           )}
           
           {/* Top draggable handle (adjusts footer height) */}
           <div
             className="absolute left-0 right-0 h-6 cursor-ns-resize group flex items-center justify-center z-10"
             style={{ bottom: `${displayFooterOffset + displayFooterHeight - 12}px` }}
             onMouseDown={(e) => handleMouseDown('footer', e)}
           >
             <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium shadow-lg group-hover:bg-secondary/90 transition-colors">
               <GripHorizontal className="w-3 h-3" />
               Drag to resize
             </div>
           </div>
           
           {/* Bottom draggable handle (adjusts offset) */}
           <div
             className="absolute left-0 right-0 h-4 cursor-ns-resize group flex items-center justify-center"
             style={{ bottom: `${displayFooterOffset - 8}px` }}
             onMouseDown={handleFooterBottomDrag}
           >
             <div className="w-16 h-1.5 rounded-full bg-secondary/70 group-hover:bg-secondary transition-colors shadow-lg" />
           </div>
           
           {/* Selection border */}
           <div 
             className="absolute left-0 right-0 border-2 border-secondary border-dashed pointer-events-none"
             style={{ 
               bottom: `${displayFooterOffset}px`,
               height: `${displayFooterHeight}px`,
             }}
           />
         </div>
       </div>
 
       {/* Reset Button */}
       <div className="flex justify-end gap-2">
         <Button variant="outline" size="sm" onClick={onReset}>
           Reset to Defaults
         </Button>
         {onApplyCrop && (
           <Button size="sm" onClick={onApplyCrop} className="gradient-primary">
             Apply Crop & Refresh Preview
           </Button>
         )}
       </div>
     </div>
   );
 }