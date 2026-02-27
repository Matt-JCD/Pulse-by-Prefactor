import type { DailyReport } from '@/lib/api';
import { slackToHtml } from '@/lib/slackMarkdown';

interface Props {
  report: DailyReport | null;
}

function SynthesisCard({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  if (!content) {
    return (
      <div className="bg-[#111113] rounded-lg p-5 border border-zinc-800/60">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          {title}
        </p>
        <p className="text-sm text-zinc-600 italic">No synthesis available.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111113] rounded-lg p-5 border border-zinc-800/60">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
        {title}
      </p>
      <div
        className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap space-y-3 [&_strong]:text-zinc-100 [&_a]:text-aqua [&_a]:hover:underline"
        dangerouslySetInnerHTML={{ __html: slackToHtml(content) }}
      />
    </div>
  );
}

export function SynthesisSection({ report }: Props) {
  if (!report) {
    return (
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
          Narrative Synthesis
        </p>
        <div className="bg-[#111113] rounded-lg p-6 border border-zinc-800/60 text-center">
          <p className="text-sm text-zinc-500">
            No report yet for today. The synthesizer runs at 6am AEST on
            weekdays.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
        Narrative Synthesis
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SynthesisCard
          title="🌐 Ecosystem"
          content={report.ecosystem_synthesis}
        />
        <SynthesisCard
          title="🏢 Enterprise AI"
          content={report.enterprise_synthesis}
        />
      </div>
    </div>
  );
}
