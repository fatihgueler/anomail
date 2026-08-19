import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { exportOwnData } from "@/lib/actions/account";

/**
 * Datenauskunft nach Art. 15 DSGVO als JSON-Download.
 *
 * Als Route Handler und nicht als Server Action, weil das Ergebnis eine Datei
 * ist, die der Browser speichern soll. Der Nutzer kommt aus der Sitzung, nicht
 * aus der Anfrage - es gibt also keinen Parameter, mit dem sich eine fremde
 * Auskunft anfordern liesse.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Nicht angemeldet." },
      { status: 401 },
    );
  }

  const result = await exportOwnData(session);

  if (result.status === "failed") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(result.data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="anomail-datenauskunft-${stamp}.json"`,
      // Eine Auskunft gehoert nicht in einen Zwischenspeicher.
      "cache-control": "no-store",
    },
  });
}
