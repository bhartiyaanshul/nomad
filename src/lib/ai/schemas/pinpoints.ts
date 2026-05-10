import { z } from "zod";

export const pinpointSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  approx_lat: z.number(),
  approx_lng: z.number(),
  why_matches: z.string(),
  is_offbeat: z.boolean(),
  estimated_cost: z.number().nonnegative(),
  estimated_duration_hours: z.number().nonnegative(),
});

export const clusterSchema = z.object({
  cluster_day: z.number().int().min(1),
  cluster_name: z.string(),
  pinpoints: z.array(pinpointSchema).min(1),
});

export const pinpointsSchema = z.object({
  region: z.string(),
  clusters: z.array(clusterSchema).min(1),
});

export type PinpointsOutput = z.infer<typeof pinpointsSchema>;
export type Pinpoint = z.infer<typeof pinpointSchema>;
export type PinpointCluster = z.infer<typeof clusterSchema>;

export const pinpointsJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["region", "clusters"],
  properties: {
    region: { type: "string" },
    clusters: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["cluster_day", "cluster_name", "pinpoints"],
        properties: {
          cluster_day: { type: "integer", minimum: 1 },
          cluster_name: { type: "string" },
          pinpoints: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: [
                "name",
                "type",
                "approx_lat",
                "approx_lng",
                "why_matches",
                "is_offbeat",
                "estimated_cost",
                "estimated_duration_hours",
              ],
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                approx_lat: { type: "number" },
                approx_lng: { type: "number" },
                why_matches: { type: "string" },
                is_offbeat: { type: "boolean" },
                estimated_cost: { type: "number", minimum: 0 },
                estimated_duration_hours: { type: "number", minimum: 0 },
              },
            },
          },
        },
      },
    },
  },
};
