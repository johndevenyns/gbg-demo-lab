import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea, TextareaProps } from "@/components/ui/textarea";

interface DebouncedInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedInput({ value, onValueChange, debounceMs = 500, ...props }: DebouncedInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onValueChange(newVal), debounceMs);
  };

  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return <Input {...props} value={localValue} onChange={handleChange} />;
}

interface DebouncedTextareaProps extends Omit<TextareaProps, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedTextarea({ value, onValueChange, debounceMs = 500, ...props }: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => onValueChange(newVal), debounceMs);
  };

  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return <Textarea {...props} value={localValue} onChange={handleChange} />;
}
