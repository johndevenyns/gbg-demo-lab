import * as React from "react";
import { Input } from "@/components/ui/input";

interface BufferedInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * Text input that keeps its own value while focused so auto-save round-trips
 * never overwrite what the user is typing. Commits debounced and on blur.
 */
export function BufferedInput({ value, onValueChange, debounceMs = 600, onBlur, onFocus, ...props }: BufferedInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const focusedRef = React.useRef(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = React.useRef<string | null>(null);
  const cbRef = React.useRef(onValueChange);
  cbRef.current = onValueChange;

  React.useEffect(() => {
    if (!focusedRef.current) setLocalValue(value);
  }, [value]);

  const flush = () => {
    clearTimeout(timeoutRef.current);
    if (pendingRef.current !== null) {
      const v = pendingRef.current;
      pendingRef.current = null;
      cbRef.current(v);
    }
  };

  React.useEffect(() => () => flush(), []);

  return (
    <Input
      {...props}
      value={localValue}
      onFocus={(e) => { focusedRef.current = true; onFocus?.(e); }}
      onBlur={(e) => { focusedRef.current = false; flush(); onBlur?.(e); }}
      onChange={(e) => {
        const v = e.target.value;
        setLocalValue(v);
        pendingRef.current = v;
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(flush, debounceMs);
      }}
    />
  );
}
