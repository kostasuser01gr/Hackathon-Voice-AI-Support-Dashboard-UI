import Link from "next/link";

import { SharedReportView } from "@/components/shared-report-view";
import { parseShareToken } from "@/lib/share";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pw?: string }>;
};

export default async function SharedSessionPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { pw } = await searchParams;
  const parsed = await parseShareToken(token, { password: pw });

  if (!parsed) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold">Invalid share link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This link is invalid, revoked, expired, or password-protected.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <SharedReportView session={parsed.session} />;
}
