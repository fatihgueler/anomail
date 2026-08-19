import { NextRequest } from "next/server";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { GET } from "@/app/api/cron/release-leases/route";
import { closePools } from "@/lib/db/client";

import {
  createUser,
  startTestDatabase,
  truncateAll,
  type TestDatabase,
} from "../db/harness";

/**
 * Der Cron-Endpunkt ist der einzige Ort ausserhalb der Anmeldung, der RLS
 * umgeht. Entsprechend eng muss die Tuer sein.
 */

const SECRET = "test-cron-secret-0123456789";

let database: TestDatabase;
let owner: Client;

beforeAll(async () => {
  database = await startTestDatabase();
  owner = new Client({ connectionString: database.ownerUrl });
  await owner.connect();

  process.env.DATABASE_URL = database.ownerUrl;
  process.env.DATABASE_URL_APP = database.appUrl;
});

afterAll(async () => {
  await closePools();
  await owner?.end();
  await database?.stop();
});

beforeEach(async () => {
  await truncateAll(owner);
  process.env.CRON_SECRET = SECRET;
});

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/cron/release-leases", {
    headers,
  });
}

describe("8 - Absicherung des Cron-Endpunkts", () => {
  test("ohne Token abgewiesen", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  test("mit falschem Token abgewiesen", async () => {
    const response = await GET(
      request({ authorization: "Bearer falsches-token" }),
    );
    expect(response.status).toBe(401);
  });

  test("ohne Bearer-Praefix abgewiesen", async () => {
    const response = await GET(request({ authorization: SECRET }));
    expect(response.status).toBe(401);
  });

  test("ohne gesetztes CRON_SECRET bleibt der Endpunkt zu", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request({ authorization: "Bearer irgendwas" }));
    expect(response.status).toBe(401);
  });

  test("mit gueltigem Token gibt er abgelaufene Zuweisungen frei", async () => {
    const author = await createUser(owner);
    const reader = await createUser(owner);

    // Eine abgelaufene und eine laufende Zuweisung.
    await owner.query(
      `INSERT INTO letters (author_id, content, status, responder_id, assigned_at)
       VALUES ($1, $2, 'in_progress', $3, now() - interval '11 minutes')`,
      [author.id, "a".repeat(300), reader.id],
    );
    await owner.query(
      `INSERT INTO letters (author_id, content, status, responder_id, assigned_at)
       VALUES ($1, $2, 'in_progress', $3, now() - interval '2 minutes')`,
      [author.id, "b".repeat(300), reader.id],
    );

    const response = await GET(request({ authorization: `Bearer ${SECRET}` }));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { released: number };
    expect(body.released).toBe(1);

    const { rows } = await owner.query<{ status: string; n: string }>(
      `SELECT status, count(*) AS n FROM letters GROUP BY status ORDER BY status`,
    );

    const byStatus = new Map(rows.map((row) => [row.status, Number(row.n)]));
    expect(byStatus.get("waiting")).toBe(1);
    expect(byStatus.get("in_progress")).toBe(1);
  });
});
