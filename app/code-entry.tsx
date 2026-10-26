"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCode, normalizeCode } from "@/lib/code-format";

/** P0: type a code, go to the Kadó. */
export function CodeEntry() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const code = normalizeCode(value);
    if (!code) return setError(true);
    router.push(`/k/${formatCode(code)}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="code" className="text-left font-bold">
        Your Kadó code
      </label>
      <input
        id="code"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(false);
        }}
        placeholder="XXXX-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        maxLength={16}
        className="w-full bg-inside px-4 py-4 text-center text-2xl font-bold tracking-widest text-ink placeholder:text-muted focus:outline-4 focus:outline-offset-0 focus:outline-inside/40"
      />
      {error && <p className="text-left">We can&apos;t find that code. Check it and try again.</p>}
      <button type="submit" className="w-full bg-seam px-4 py-4 text-lg font-bold text-ink">
        Open
      </button>
    </form>
  );
}
