"use client";

import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClientSelectField({
  id,
  name,
  label,
  options,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  options: { label: string; value: string }[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const triggerId = useId();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={triggerId}>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={(v) => setValue(v as string)}>
        <SelectTrigger id={triggerId} className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

