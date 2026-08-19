import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { PAGE_SIZE, loadAuditLog } from "@/lib/actions/moderation/queue";
import { requireModerator } from "@/lib/auth/guard";

import { Pagination, QueueError, parsePage } from "../shared";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "medium",
});

const ACTION_LABEL: Record<string, string> = {
  viewed: "Angesehen",
  hidden: "Ausgeblendet",
  unhidden: "Wieder sichtbar",
  resolved: "Abgeschlossen",
  dismissed: "Falsch positiv",
  banned: "Konto gesperrt",
  unbanned: "Sperre aufgehoben",
  appeal_reviewed: "Widerspruch entschieden",
};

type PageProps = { searchParams: Promise<{ seite?: string }> };

export default async function ModerationAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireModerator("/moderation/audit");
  const page = parsePage(params.seite);

  const result = await loadAuditLog(session, page);

  if (result.status === "failed") {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-title">Prüfprotokoll</h2>
        <QueueError
          title="Das Prüfprotokoll konnte nicht geladen werden"
          message={result.message}
          retryHref="/moderation/audit"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">Prüfprotokoll</h2>
        <p className="text-body text-muted-foreground">
          Jede Moderationsaktion und jeder lesende Zugriff auf einen fremden
          Inhalt. Ausschließlich für Admins einsehbar.
        </p>
      </div>

      <div className="max-w-prose">
        <NoticeBanner tone="hinweis" title="Dieses Protokoll ist unveränderlich">
          <p>
            Es lässt sich weder aus der Anwendung noch über die Datenbank ändern
            oder löschen. Ein Auslöser weist jedes UPDATE und jedes DELETE ab.
          </p>
        </NoticeBanner>
      </div>

      {result.rows.length === 0 ? (
        <div className="max-w-prose">
          <EmptyState
            icon={ScrollText}
            title="Das Protokoll ist leer."
            description="Sobald jemand einen Vorgang in der Moderation öffnet oder bearbeitet, erscheint der Eintrag hier."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-small">
            <caption className="sr-only">
              Einträge des Prüfprotokolls, neueste zuerst
            </caption>
            <thead>
              <tr className="border-b border-input text-left">
                <th scope="col" className="p-3 text-label">
                  Zeitpunkt
                </th>
                <th scope="col" className="p-3 text-label">
                  Handelnde Person
                </th>
                <th scope="col" className="p-3 text-label">
                  Aktion
                </th>
                <th scope="col" className="p-3 text-label">
                  Ziel
                </th>
                <th scope="col" className="p-3 text-label">
                  Begründung
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="border-b border-border align-top">
                  <td className="p-3 tabular-nums">
                    {dateTimeFormat.format(row.createdAt)}
                  </td>
                  <td className="p-3 tabular-nums">
                    {row.actorAnomailId ?? "Unbekannt"}
                  </td>
                  <td className="p-3">
                    {ACTION_LABEL[row.action] ?? row.action}
                  </td>
                  <td className="p-3">
                    {row.targetType}
                    {row.targetId ? (
                      <span className="block text-muted-foreground tabular-nums">
                        {row.targetId.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-prose p-3">{row.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        basePath="/moderation/audit"
        page={page}
        total={result.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
