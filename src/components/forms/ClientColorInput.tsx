"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function ClientColorInput({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
          aria-label={label}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono"
        />
      </div>
    </div>
  );
}

