import { PAGE_SIZE, loadFlaggedLetters } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";

import { FlaggedList } from "../flagged-list";
import { Pagination, QueueError, parsePage } from "../shared";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ seite?: string }> };

export default async function ModerationLettersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireModerator("/moderation/letters");
  const page = parsePage(params.seite);

  const result = await loadFlaggedLetters(session, page);

  if (result.status === "failed") {
    return (
      <div>
        <h2 className="sr-only">Briefe</h2>
        <QueueError
          title="Die Briefe konnten nicht geladen werden"
          message={result.message}
          retryHref="/moderation/letters"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">Briefe</h2>
        <p className="text-body text-muted-foreground">
          Briefe, die zurückgehalten oder ausgeblendet sind. Andere Briefe sind
          hier nicht einsehbar.
        </p>
      </div>

      <FlaggedList
        items={result.items}
        targetType="letter"
        emptyTitle="Kein Brief wartet auf eine Entscheidung."
        emptyDescription="Sobald die Sicherheitsprüfung einen Brief zurückhält oder jemand ihn ausblendet, erscheint er hier."
      />

      <Pagination
        basePath="/moderation/letters"
        page={page}
        total={result.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
