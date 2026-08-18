"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type ActionState = { error?: string; success?: boolean };

export function ActionForm({
  action,
  children,
  className,
  onSuccessMessage,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  onSuccessMessage?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      {state?.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && onSuccessMessage && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{onSuccessMessage}</AlertDescription>
        </Alert>
      )}
      {children}
    </form>
  );
}

