"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, CheckCircle, XCircle, FlaskConical, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { triggerTestEmail, triggerWeeklyReport } from "@/app/actions/email";
import { cn } from "@/lib/utils";

// ─── Shared status banner ─────────────────────────────────────────────────────

function StatusMsg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={cn(
      "mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium",
      "[animation:status-fade-in_0.18s_ease-out]",
      ok
        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        : "border border-red-500/20 bg-red-500/10 text-red-400"
    )}>
      {ok
        ? <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        : <XCircle    className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span>{text}</span>
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

interface ActionRowProps {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  destination: string;
  buttonLabel: string;
  pendingLabel: string;
  onClick:     () => void;
  pending:     boolean;
  accentColor: "brand" | "violet";
}

function ActionRow({
  icon, title, description, destination,
  buttonLabel, pendingLabel, onClick, pending, accentColor,
}: ActionRowProps) {
  const accent = accentColor === "brand"
    ? "border-brand-500/25 bg-brand-500/10 text-brand-400 hover:border-brand-500/40 hover:bg-brand-500/20"
    : "border-violet-500/25 bg-violet-500/10 text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/20";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Title row */}
      <div className="mb-3 flex items-start gap-2.5">
        <div className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          accentColor === "brand" ? "bg-brand-500/10" : "bg-violet-500/10"
        )}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-xs text-white/35">{description}</p>
        </div>
      </div>

      {/* Destination + button row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Mail className="h-3 w-3 shrink-0 text-white/20" />
          <span className="truncate text-xs text-white/30">{destination}</span>
        </div>

        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium",
            "transition-colors disabled:opacity-40",
            accent,
          )}
        >
          {pending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : accentColor === "brand"
              ? <Mail    className="h-3.5 w-3.5" />
              : <FileText className="h-3.5 w-3.5" />}
          {pending ? pendingLabel : buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

/**
 * Developer Tools section — manual email triggers for testing.
 * Safe to keep in production; remove once automated sending is built.
 */
export function EmailTestSection() {
  const [testStatus,   setTestStatus]   = useState<{ ok: boolean; text: string } | null>(null);
  const [reportStatus, setReportStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const [testPending,   startTest]   = useTransition();
  const [reportPending, startReport] = useTransition();

  function handleSendTest() {
    setTestStatus(null);
    startTest(async () => {
      const result = await triggerTestEmail();
      setTestStatus(
        result.success
          ? { ok: true,  text: "Test email sent to studyflowapp.official@gmail.com" }
          : { ok: false, text: result.error ?? "Failed to send email" }
      );
    });
  }

  function handleSendReport() {
    setReportStatus(null);
    startReport(async () => {
      const result = await triggerWeeklyReport();
      if (result.success) {
        const preview = (result as { preview?: string }).preview ?? "";
        setReportStatus({
          ok:   true,
          text: preview
            ? `Report sent — ${preview}`
            : "Weekly report sent to studyflowapp.official@gmail.com",
        });
      } else {
        setReportStatus({ ok: false, text: result.error ?? "Failed to generate report" });
      }
    });
  }

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Developer Tools
      </h2>

      <Card className="p-6">
        {/* Section header */}
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05]">
            <FlaskConical className="h-3.5 w-3.5 text-white/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Email testing</p>
            <p className="text-xs text-white/30">
              Send test emails to verify the Resend integration before enabling automation.
            </p>
          </div>
        </div>

        <div className="space-y-3">

          {/* Infrastructure ping */}
          <ActionRow
            icon={<Mail className="h-3.5 w-3.5 text-brand-400" />}
            title="Infrastructure test"
            description="Pings the Resend integration with a minimal email."
            destination="studyflowapp.official@gmail.com"
            buttonLabel="Send test"
            pendingLabel="Sending…"
            onClick={handleSendTest}
            pending={testPending}
            accentColor="brand"
          />
          {testStatus && <StatusMsg ok={testStatus.ok} text={testStatus.text} />}

          {/* Weekly report */}
          <ActionRow
            icon={<FileText className="h-3.5 w-3.5 text-violet-400" />}
            title="Weekly study report"
            description="Generates a full AI report from your last 7 days of data."
            destination="studyflowapp.official@gmail.com"
            buttonLabel="Send report"
            pendingLabel="Generating…"
            onClick={handleSendReport}
            pending={reportPending}
            accentColor="violet"
          />
          {reportStatus && <StatusMsg ok={reportStatus.ok} text={reportStatus.text} />}

        </div>

        <p className="mt-5 text-[11px] text-white/20">
          These controls will be removed once scheduled sending is enabled.
        </p>
      </Card>
    </section>
  );
}
