"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTelefonoOrganizador } from "@/lib/storage";
import { parseTelefonoOrganizador } from "@/lib/validation";

type Props = {
  slotStart: string;
  telefonos: string;
  pin: string;
  onSaved: (slotStart: string, telefonos: string) => void;
};

export function TelefonoCelda({ slotStart, telefonos, pin, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(telefonos);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ignoreBlur = useRef(false);

  function startEdit() {
    setDraft(telefonos);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(telefonos);
    setEditing(false);
  }

  async function commit() {
    if (pending) return;
    const previous = telefonos;
    try {
      const next = parseTelefonoOrganizador(draft);
      if (next === previous) {
        setError(null);
        setDraft(previous);
        setEditing(false);
        return;
      }
      setPending(true);
      const saved = await updateTelefonoOrganizador(pin, slotStart, next);
      onSaved(slotStart, saved);
      setDraft(saved);
      setError(null);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el teléfono.");
      setDraft(previous);
      setEditing(false);
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="rounded-md px-1 py-0.5 text-left font-mono text-sm text-primary underline-offset-4 hover:bg-primary/5 hover:underline"
          onClick={startEdit}
          title="Clic para editar el teléfono"
        >
          {telefonos}
        </button>
        {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
            }
          }}
          onBlur={() => {
            if (ignoreBlur.current) {
              ignoreBlur.current = false;
              return;
            }
            void commit();
          }}
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          aria-label="Teléfono"
          aria-invalid={Boolean(error)}
          disabled={pending}
          className="h-8 min-w-[8.5rem] font-mono"
        />
        <Button
          type="button"
          size="icon-xs"
          aria-label="Guardar teléfono"
          disabled={pending}
          onMouseDown={() => {
            ignoreBlur.current = true;
          }}
          onClick={() => {
            void commit();
          }}
        >
          <Check />
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
