import { z } from "zod";

export const EventEnvelopeSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  timestamp: z.string(),
  requestId: z.string(),
  payload: z.unknown()
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;