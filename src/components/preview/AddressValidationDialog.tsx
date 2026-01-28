import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';

interface AddressValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: (useOriginal: boolean) => void;
  originalAddress: string;
  suggestedAddress: string;
  confidence: number;
  aqi: string;
  isApiError: boolean;
}

export function AddressValidationDialog({
  open,
  onOpenChange,
  onProceed,
  originalAddress,
  suggestedAddress,
  confidence,
  aqi,
  isApiError,
}: AddressValidationDialogProps) {
  const getConfidenceLabel = () => {
    if (aqi === 'A') return 'Excellent';
    if (aqi === 'B') return 'Good';
    if (aqi === 'C') return 'Average';
    if (aqi === 'D') return 'Poor';
    if (aqi === 'E') return 'Bad';
    return confidence >= 80 ? 'Good' : confidence >= 60 ? 'Fair' : 'Low';
  };

  const getConfidenceColor = () => {
    if (aqi === 'A' || aqi === 'B' || confidence >= 80) return 'text-green-600';
    if (aqi === 'C' || confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isApiError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Address Verification Unavailable
            </DialogTitle>
            <DialogDescription>
              We couldn't verify your address at this time. You can proceed with the address you entered.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm font-medium mb-1">Your Address:</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {originalAddress}
            </p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Edit Address
            </Button>
            <Button onClick={() => onProceed(true)}>
              Continue Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Verify Your Address
          </DialogTitle>
          <DialogDescription>
            We found a potential improvement to your address. Please review and select.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Confidence indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Match Confidence:</span>
            <span className={`font-medium ${getConfidenceColor()}`}>
              {getConfidenceLabel()} ({confidence}%)
            </span>
          </div>
          
          {/* Original address */}
          <div className="space-y-2">
            <p className="text-sm font-medium">You entered:</p>
            <button
              onClick={() => onProceed(true)}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <p className="text-sm">{originalAddress}</p>
            </button>
          </div>
          
          {/* Suggested address */}
          {suggestedAddress && suggestedAddress !== originalAddress && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Suggested address:
              </p>
              <button
                onClick={() => onProceed(false)}
                className="w-full text-left p-3 rounded-lg border-2 border-green-500/50 bg-green-500/5 hover:bg-green-500/10 transition-colors"
              >
                <p className="text-sm font-medium">{suggestedAddress}</p>
              </button>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:justify-between">
          <Button 
            variant="ghost" 
            onClick={() => onProceed(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip Validation
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Edit Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
