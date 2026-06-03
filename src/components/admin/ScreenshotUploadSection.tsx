import { useState, useRef } from "react";
import { Upload, Trash2, Check, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DemoEnvironment } from "@/types/demo";

interface ScreenshotUploadSectionProps {
  demo: DemoEnvironment;
  onApply: (updates: Partial<DemoEnvironment>) => void;
}

type Alignment = "left" | "center" | "right";
type Sizing = "actual" | "stretch";

const JUSTIFY: Record<Alignment, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

function generateUploadedHtml(
  imageUrl: string,
  bgColor: string,
  alt: string,
  align: Alignment,
  sizing: Sizing,
): string {
  const justify = JUSTIFY[align];
  const imgStyle = sizing === "stretch"
    ? "width: 100%; height: auto; display: block;"
    : "max-width: 100%; height: auto; display: block;";
  return `<div data-align="${align}" data-sizing="${sizing}" style="width: 100%; background-color: ${bgColor}; display: flex; justify-content: ${justify}; align-items: center; padding: 0;"><img src="${imageUrl}" style="${imgStyle}" alt="${alt}" /></div>`;
}

function parseUploadedHtml(html: string | null | undefined): {
  url: string | null;
  bgColor: string;
  align: Alignment;
  sizing: Sizing;
} {
  if (!html) return { url: null, bgColor: "#ffffff", align: "center", sizing: "actual" };
  const imgMatch = html.match(/src="([^"]+)"/);
  const bgMatch = html.match(/background-color:\s*([^;]+)/);
  const alignMatch = html.match(/data-align="(left|center|right)"/);
  const sizingMatch = html.match(/data-sizing="(actual|stretch)"/);
  // Back-compat: infer stretch from `width: 100%` on img (vs max-width)
  const inferredSizing: Sizing = /<img[^>]*style="[^"]*\bwidth:\s*100%/.test(html) ? "stretch" : "actual";
  return {
    url: imgMatch?.[1] || null,
    bgColor: bgMatch?.[1]?.trim() || "#ffffff",
    align: (alignMatch?.[1] as Alignment) || "center",
    sizing: (sizingMatch?.[1] as Sizing) || inferredSizing,
  };
}

export function ScreenshotUploadSection({ demo, onApply }: ScreenshotUploadSectionProps) {
  const { toast } = useToast();
  const headerInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);

  const existingHeader = parseUploadedHtml(demo.mirrorScreenshotHeaderHtml);
  const existingFooter = parseUploadedHtml(demo.mirrorScreenshotFooterHtml);

  const [headerPreview, setHeaderPreview] = useState<string | null>(existingHeader.url);
  const [footerPreview, setFooterPreview] = useState<string | null>(existingFooter.url);
  const [headerBgColor, setHeaderBgColor] = useState(existingHeader.bgColor);
  const [footerBgColor, setFooterBgColor] = useState(existingFooter.bgColor);
  const [headerAlign, setHeaderAlign] = useState<Alignment>(existingHeader.align);
  const [footerAlign, setFooterAlign] = useState<Alignment>(existingFooter.align);
  const [headerSizing, setHeaderSizing] = useState<Sizing>(existingHeader.sizing);
  const [footerSizing, setFooterSizing] = useState<Sizing>(existingFooter.sizing);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [footerUploading, setFooterUploading] = useState(false);
  const [headerUrl, setHeaderUrl] = useState<string | null>(existingHeader.url);
  const [footerUrl, setFooterUrl] = useState<string | null>(existingFooter.url);

  const uploadImage = async (file: File, type: "header" | "footer"): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${demo.id}/screenshot-${type}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("demo-logos")
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("demo-logos")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleFileSelect = async (file: File, type: "header" | "footer") => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === "header") setHeaderPreview(e.target?.result as string);
      else setFooterPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const setter = type === "header" ? setHeaderUploading : setFooterUploading;
    setter(true);
    const url = await uploadImage(file, type);
    setter(false);

    if (url) {
      if (type === "header") setHeaderUrl(url);
      else setFooterUrl(url);
      toast({ title: `${type === "header" ? "Header" : "Footer"} uploaded`, description: "Image ready to apply" });
    }
  };

  const handleApply = () => {
    const updates: Partial<DemoEnvironment> = {};

    if (headerUrl) {
      updates.mirrorScreenshotHeaderHtml = generateUploadedHtml(headerUrl, headerBgColor, "Site header", headerAlign, headerSizing);
    }
    if (footerUrl) {
      updates.mirrorScreenshotFooterHtml = generateUploadedHtml(footerUrl, footerBgColor, "Site footer", footerAlign, footerSizing);
    }

    if (!headerUrl && !footerUrl) {
      toast({ title: "No images", description: "Upload at least one image before applying", variant: "destructive" });
      return;
    }

    onApply(updates);
    toast({ title: "Custom images applied", description: "Header/footer images have been saved" });
  };

  const clearImage = (type: "header" | "footer") => {
    if (type === "header") {
      setHeaderPreview(null);
      setHeaderUrl(null);
      if (headerInputRef.current) headerInputRef.current.value = "";
    } else {
      setFooterPreview(null);
      setFooterUrl(null);
      if (footerInputRef.current) footerInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-5">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Custom Images
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your own header and footer images. Set a background color to fill any extra space so sizing doesn't need to be exact.
          </p>
        </div>

        {/* Header Upload */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <Label className="font-medium">Header Image</Label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={headerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "header")}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => headerInputRef.current?.click()}
              disabled={headerUploading}
            >
              {headerUploading ? "Uploading…" : <><ImageIcon className="w-4 h-4 mr-2" />Choose Image</>}
            </Button>
            {headerPreview && (
              <Button variant="ghost" size="sm" onClick={() => clearImage("header")}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs whitespace-nowrap">Background</Label>
              <input
                type="color"
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                className="color-picker-swatch"
              />
              <Input
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                className="font-mono w-24 h-8 text-xs"
              />
            </div>
          </div>
          <AlignmentSizingControls
            align={headerAlign}
            onAlignChange={setHeaderAlign}
            sizing={headerSizing}
            onSizingChange={setHeaderSizing}
          />
          {headerPreview && (
            <div
              className="rounded-lg overflow-hidden border"
              style={{ backgroundColor: headerBgColor, display: "flex", justifyContent: JUSTIFY[headerAlign] }}
            >
              <img
                src={headerPreview}
                alt="Header preview"
                className="h-auto block"
                style={{
                  maxHeight: "200px",
                  ...(headerSizing === "stretch"
                    ? { width: "100%" }
                    : { maxWidth: "100%" }),
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Upload */}
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <Label className="font-medium">Footer Image</Label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={footerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "footer")}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => footerInputRef.current?.click()}
              disabled={footerUploading}
            >
              {footerUploading ? "Uploading…" : <><ImageIcon className="w-4 h-4 mr-2" />Choose Image</>}
            </Button>
            {footerPreview && (
              <Button variant="ghost" size="sm" onClick={() => clearImage("footer")}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs whitespace-nowrap">Background</Label>
              <input
                type="color"
                value={footerBgColor}
                onChange={(e) => setFooterBgColor(e.target.value)}
                className="color-picker-swatch"
              />
              <Input
                value={footerBgColor}
                onChange={(e) => setFooterBgColor(e.target.value)}
                className="font-mono w-24 h-8 text-xs"
              />
            </div>
          </div>
          <AlignmentSizingControls
            align={footerAlign}
            onAlignChange={setFooterAlign}
            sizing={footerSizing}
            onSizingChange={setFooterSizing}
          />
          {footerPreview && (
            <div
              className="rounded-lg overflow-hidden border"
              style={{ backgroundColor: footerBgColor, display: "flex", justifyContent: JUSTIFY[footerAlign] }}
            >
              <img
                src={footerPreview}
                alt="Footer preview"
                className="h-auto block"
                style={{
                  maxHeight: "200px",
                  ...(footerSizing === "stretch"
                    ? { width: "100%" }
                    : { maxWidth: "100%" }),
                }}
              />
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleApply}
            disabled={!headerUrl && !footerUrl}
            className="gradient-primary"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Uploaded Images
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
