import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface ResultPagesConfigProps {
  approvedUrl: string;
  rejectedUrl: string;
  returnUrl: string;
  onUpdateApprovedUrl: (url: string) => void;
  onUpdateRejectedUrl: (url: string) => void;
  onUpdateReturnUrl: (url: string) => void;
}

export function ResultPagesConfig({
  approvedUrl,
  rejectedUrl,
  returnUrl,
  onUpdateApprovedUrl,
  onUpdateRejectedUrl,
  onUpdateReturnUrl,
}: ResultPagesConfigProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5" />
          Result Pages
        </CardTitle>
        <CardDescription>
          Configure where users are redirected after verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Page */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <Label className="font-medium">Approved URL</Label>
          </div>
          <Input
            type="url"
            placeholder="https://yoursite.com/verified"
            value={approvedUrl}
            onChange={(e) => onUpdateApprovedUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Users are redirected here when verification passes
          </p>
        </div>

        {/* Failure Page */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            <Label className="font-medium">Rejected URL</Label>
          </div>
          <Input
            type="url"
            placeholder="https://yoursite.com/verification-failed"
            value={rejectedUrl}
            onChange={(e) => onUpdateRejectedUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Users are redirected here when verification fails
          </p>
        </div>

        {/* Default Return URL */}
        <div className="space-y-2">
          <Label className="font-medium">Default Return URL</Label>
          <Input
            type="url"
            placeholder="https://yoursite.com/return"
            value={returnUrl}
            onChange={(e) => onUpdateReturnUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Fallback URL if specific approved/rejected URLs aren't set
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
