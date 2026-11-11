"use client";

import { ModalOverlay } from "@/components/dashboard/modal-overlay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

interface UploadPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  /** Runs synchronously from Continue pointer down (file picker user-gesture). */
  onContinueUserGesture?: () => void;
  onVerificationFailed?: () => void;
  /** When set, the upload file input is moved here while the dialog is open. */
  filePickerHostRef?: RefObject<HTMLDivElement | null>;
  closeOnSuccess?: boolean;
  title?: string;
  description?: string;
}

export function UploadPasswordDialog({
  open,
  onClose,
  onSuccess,
  onContinueUserGesture,
  onVerificationFailed,
  filePickerHostRef,
  closeOnSuccess = true,
  title = "Upload password",
  description = "Enter the same password used for the Excel/Raw Data Dropbox on this host.",
}: UploadPasswordDialogProps) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    setError(null);
    setChecking(false);
    const id = window.requestAnimationFrame(() => {
      passwordFieldRef.current?.focus({ preventScroll: true });
      passwordFieldRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const failVerification = () => {
    onVerificationFailed?.();
  };

  const handleSubmit = async () => {
    const token = value.trim();
    if (!token) {
      setError("Enter the upload password.");
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/master-sheets/top-10/editor", {
        headers: { "x-upload-token": token },
      });
      if (res.status === 401) {
        setError("Incorrect password.");
        failVerification();
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(
          (json as { error?: string }).error ?? "Could not verify password.",
        );
        failVerification();
        return;
      }
      onSuccess(token);
      if (closeOnSuccess) onClose();
    } catch {
      setError("Network error — try again.");
      failVerification();
    } finally {
      setChecking(false);
    }
  };

  const runContinueUserGesture = () => {
    if (checking || !value.trim() || !onContinueUserGesture) return;
    onContinueUserGesture();
  };

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      backdropLabel="Close password dialog"
      panelClassName="max-w-sm rounded-lg border border-slate-300 p-0 shadow-xl"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-[11px] text-slate-500 leading-snug">
          {description}
        </p>
      </div>

      <div
        ref={filePickerHostRef}
        className="sr-only"
        aria-hidden
        data-upload-file-picker-host
      />

      <div className="space-y-2 px-4 py-3">
        <Label htmlFor="upload-password-field">Password</Label>
        <input
          ref={passwordFieldRef}
          id="upload-password-field"
          type="password"
          autoComplete="off"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          value={value}
          disabled={checking}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              runContinueUserGesture();
              void handleSubmit();
            }
          }}
        />
        {error && (
          <p className="text-[11px] text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={checking}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={checking}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            runContinueUserGesture();
          }}
          onClick={() => void handleSubmit()}
        >
          {checking ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </ModalOverlay>
  );
}
