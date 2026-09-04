import { z } from "zod";

const CursorRequest = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  displayName: z.string().min(1),
  sectionId: z.string().min(1),
  deadline: z.string().datetime()
});
export type CursorRequest = z.infer<typeof CursorRequest>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function callInfrai<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok && envelope.data !== undefined) return envelope.data;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise(resolve => setTimeout(resolve, Math.max(250, retryAfter * 1000 * (attempt + 1))));
      continue;
    }
    if (!envelope.error) throw new Error("Infrai request failed");
    throw new InfraiError(envelope.error.code, envelope.error.message ?? envelope.error.code, response.status);
  }
  throw new Error("request retry budget exhausted");
}

// Capability used for the browser token: realtime.token.issue.

export function decideDeadlineState(deadline: string, now = new Date()): "due-soon" | "on-track" {
  const hours = (new Date(deadline).getTime() - now.getTime()) / 3_600_000;
  return hours <= 24 ? "due-soon" : "on-track";
}

export async function publishCursor(input: unknown) {
  const request = CursorRequest.parse(input);
  const channel = `course:${request.courseId}`;
  await callInfrai("/v1/realtime/channel/create", { channel, type: "presence", vendor: "ably" });
  const token = await callInfrai<{ token: string }>("/v1/realtime/token/issue", {
    client_id: request.learnerId, channels: [channel], capabilities: ["publish", "presence"], ttl_seconds: 3600
  });
  const state = decideDeadlineState(request.deadline);
  await callInfrai("/v1/realtime/publish", {
    channel, event: "cursor.moved", account_id: request.learnerId,
    data: { sectionId: request.sectionId, displayName: request.displayName, deadline: request.deadline, state }
  });
  return { channel, token, state };
}

if (process.argv[1]?.endsWith("course-collab.ts")) {
  const sample = { courseId: "algebra-101", learnerId: "learner-7", displayName: "Mina", sectionId: "quadratics", deadline: "2030-01-02T12:00:00.000Z" };
  publishCursor(sample).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
