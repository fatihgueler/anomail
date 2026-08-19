import { redirect } from "next/navigation";

/** Der Standardbereich sind die Meldungen. */
export default function ModerationIndexPage() {
  redirect("/moderation/reports");
}
