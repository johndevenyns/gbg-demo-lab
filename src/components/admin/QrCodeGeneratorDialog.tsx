import { useState } from "react";
import { QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function QrCodeGeneratorDialog() {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(300);

  const trimmedUrl = url.trim();
  const isValid = trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");

  const handleGenerate = () => {
    if (!isValid) return;
    window.open(`/qr-preview?url=${encodeURIComponent(trimmedUrl)}&size=${size}`, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <QrCode className="w-4 h-4 mr-2" />
          QR Generator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code Generator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <Button className="w-full" disabled={!isValid} onClick={handleGenerate}>
            Generate QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
