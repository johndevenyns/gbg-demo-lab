import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ArchiveDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demoName: string;
  saving: boolean;
  onConfirm: () => void;
}

export function ArchiveDemoDialog({ open, onOpenChange, demoName, saving, onConfirm }: ArchiveDemoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Demo</DialogTitle>
          <DialogDescription>
            This will deactivate <strong>{demoName}</strong> and hide it from the public demo list. The data will be preserved for future reference.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Archiving...</> : 'Archive Demo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
