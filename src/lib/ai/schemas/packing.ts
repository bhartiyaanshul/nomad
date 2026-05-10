import { z } from "zod";

export const packingItemSchema = z.object({
  item: z.string().min(1),
  category: z.enum([
    "clothing",
    "documents",
    "electronics",
    "toiletries",
    "gear",
    "misc",
  ]),
  essential: z.boolean(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

export const packingSchema = z.object({
  items: z.array(packingItemSchema).min(1),
});

export type PackingOutput = z.infer<typeof packingSchema>;
export type PackingItem = z.infer<typeof packingItemSchema>;

export const packingJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["item", "category", "essential", "quantity"],
        properties: {
          item: { type: "string" },
          category: {
            type: "string",
            enum: [
              "clothing",
              "documents",
              "electronics",
              "toiletries",
              "gear",
              "misc",
            ],
          },
          essential: { type: "boolean" },
          quantity: { type: "integer", minimum: 1 },
          notes: { type: "string" },
        },
      },
    },
  },
};
