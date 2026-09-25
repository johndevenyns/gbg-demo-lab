import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTestProfiles } from '@/hooks/useTestProfiles';

interface Props {
  /** Selected profile ids. Empty/undefined means "use defaults". */
  selectedIds: string[] | undefined;
  onChange: (ids: string[]) => void;
}

export function TestProfilePicker({ selectedIds, onChange }: Props) {
  const { data: profiles = [] } = useTestProfiles();
  const usingDefaults = !selectedIds || selectedIds.length === 0;
  const effective = usingDefaults ? profiles.filter((p) => p.is_default).map((p) => p.id) : selectedIds!;

  const toggle = (id: string, on: boolean) => {
    const next = on ? [...new Set([...effective, id])] : effective.filter((x) => x !== id);
    onChange(next);
  };

  const group = (type: 'pass' | 'fail') => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {type === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
        {type === 'pass' ? 'Pass' : 'Fail'}
      </div>
      {profiles.filter((p) => p.profile_type === type).map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={effective.includes(p.id)} onCheckedChange={(v) => toggle(p.id, !!v)} />
          <span className="truncate">{p.profile_name}</span>
          {p.is_default && <span className="text-[10px] text-muted-foreground">default</span>}
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{usingDefaults ? 'Using default profiles' : `${effective.length} profiles selected`}</span>
        {!usingDefaults && (
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => onChange([])}>
            Reset to defaults
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-1">
        {group('pass')}
        {group('fail')}
      </div>
    </div>
  );
}
