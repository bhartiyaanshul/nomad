import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscribe } from "@/lib/blend-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthenticated", { status: 401 });
  }

  const { groupId } = await params;

  // Verify the requester is a member of the trip behind this group.
  const group = await db.blendGroup.findUnique({
    where: { id: groupId },
    select: {
      tripId: true,
      trip: {
        select: {
          ownerId: true,
          members: {
            where: { userId: session.user.id, status: "active" },
            select: { id: true },
          },
        },
      },
    },
  });
  if (
    !group ||
    (group.trip.ownerId !== session.user.id &&
      group.trip.members.length === 0)
  ) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Initial hello so the client knows we're connected.
      send({ type: "ready", groupId, ts: Date.now() });

      const sub = subscribe(groupId, (event) => {
        try {
          send(event);
        } catch {
          // Stream may be closed; just stop trying.
        }
      });

      // Heartbeat every 25s to keep the connection from idling out.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      const close = () => {
        clearInterval(heartbeat);
        sub.unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
