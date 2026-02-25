import { useState } from "react";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function QrCodePreview() {
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const [url, setUrl] = useState(params.get("url") || "");
  const [size, setSize] = useState(Number(params.get("size")) || 300);
  const [copied, setCopied] = useState(false);

  const trimmedUrl = url.trim();
  const isValid = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");
  const qrSrc = isValid
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(trimmedUrl)}`
    : "";

  const handleCopyImage = async () => {
    if (!qrSrc) return;
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast({ title: "Copied", description: "QR code image copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Could not copy image. Try downloading instead.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `qr-code-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <QrCode className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">QR Code Generator</h1>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="qr-url">URL</Label>
            <Input
              id="qr-url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-size">Size (px)</Label>
            <Input
              id="qr-size"
              type="number"
              min={100}
              max={1000}
              step={50}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </div>

          {isValid && (
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="border border-border rounded-lg p-3 bg-white">
                <img
                  src={qrSrc}
                  alt="Generated QR code"
                  width={Math.min(size, 280)}
                  height={Math.min(size, 280)}
                  className="object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyImage}>
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
