import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, ChevronDown, ChevronUp, Trash2, Copy, Check, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { toast } from 'sonner';

export interface SubmissionLogEntry {
  id: string;
  timestamp: Date;
  type: 'request' | 'response';
  endpoint: string;
  method: string;
  status?: number;
  data: Record<string, unknown>;
  duration?: number;
}

interface SubmissionLogPanelProps {
  logs: SubmissionLogEntry[];
  onClearLogs: () => void;
}

export function SubmissionLogPanel({ logs, onClearLogs }: SubmissionLogPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const copyToClipboard = async (logId: string, data: Record<string, unknown>) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedId(logId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const formatTime = (date: Date) => {
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <Card className="glass-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Submission Log
                </CardTitle>
                {logs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOpen && logs.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearLogs();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                )}
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No submissions yet</p>
                <p className="text-sm">Submit the form to see request/response data here.</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="border border-border rounded-lg overflow-hidden bg-background/50"
                    >
                      {/* Log Header */}
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleLogExpand(log.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded ${log.type === 'request' ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                            {log.type === 'request' ? (
                              <ArrowUpRight className="w-4 h-4 text-blue-500" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  log.method === 'POST' ? 'border-blue-500/50 text-blue-500' : 
                                  log.method === 'GET' ? 'border-green-500/50 text-green-500' : 
                                  'border-amber-500/50 text-amber-500'
                                }`}
                              >
                                {log.method}
                              </Badge>
                              <span className="text-sm font-mono break-all">
                                {log.endpoint}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(log.timestamp)}
                              </span>
                              {log.status && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    log.status >= 200 && log.status < 300 ? 'bg-green-500/10 text-green-500' : 
                                    log.status >= 400 ? 'bg-red-500/10 text-red-500' : ''
                                  }`}
                                >
                                  {log.status}
                                </Badge>
                              )}
                              {log.duration && (
                                <span className="text-xs text-muted-foreground">
                                  {log.duration}ms
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.id, log.data);
                            }}
                          >
                            {copiedId === log.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Log Body (Expandable) */}
                      {expandedLogs.has(log.id) && (
                        <div className="border-t border-border p-3 bg-muted/30">
                          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-foreground/80">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
