import { PAGE_SIZE, loadHiddenMessages } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";

import { FlaggedList } from "../flagged-list";
import { Pagination, QueueError, parsePage } from "../shared";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ seite?: string }> };

export default async function ModerationResponsesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireModerator("/moderation/responses");
  const page = parsePage(params.seite);

  const result = await loadHiddenMessages(session, page);

  if (result.status === "failed") {
    return (
      <div>
        <h2 className="sr-only">Antworten</h2>
        <QueueError
          title="Die Antworten konnten nicht geladen werden"
          message={result.message}
          retryHref="/moderation/responses"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">Antworten</h2>
        <p className="text-body text-muted-foreground">
          Nachrichten, die ausgeblendet sind. Andere Nachrichten aus laufenden
          Briefwechseln sind hier nicht einsehbar.
        </p>
      </div>

      <FlaggedList
        items={result.items}
        targetType="message"
        emptyTitle="Keine Antwort wartet auf eine Entscheidung."
        emptyDescription="Sobald die Sicherheitsprüfung eine Antwort zurückhält oder jemand sie ausblendet, erscheint sie hier."
      />

      <Pagination
        basePath="/moderation/responses"
        page={page}
        total={result.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
