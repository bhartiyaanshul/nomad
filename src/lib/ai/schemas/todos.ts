import { z } from "zod";

export const reminderOffsetSchema = z.object({
  amount: z.number().int().min(0),
  unit: z.enum(["hours", "days"]),
});

export const todoItemSchema = z.object({
  content: z.string().min(1),
  category: z.enum([
    "documents",
    "health",
    "finance",
    "packing",
    "booking",
    "logistics",
    "communication",
  ]),
  priority: z.enum(["high", "normal", "low"]),
  days_before_trip: z.number().int().min(0),
  reason: z.string(),
  reminder_offsets: z.array(reminderOffsetSchema),
});

export const todosSchema = z.object({
  todos: z.array(todoItemSchema),
});

export type TodosOutput = z.infer<typeof todosSchema>;

export const todosJsonSchema: Record<string, unknown> = {
  type: "object",
  required: ["todos"],
  properties: {
    todos: {
      type: "array",
      items: {
        type: "object",
        required: [
          "content",
          "category",
          "priority",
          "days_before_trip",
          "reason",
          "reminder_offsets",
        ],
        properties: {
          content: { type: "string" },
          category: {
            type: "string",
            enum: [
              "documents",
              "health",
              "finance",
              "packing",
              "booking",
              "logistics",
              "communication",
            ],
          },
          priority: { type: "string", enum: ["high", "normal", "low"] },
          days_before_trip: { type: "integer", minimum: 0 },
          reason: { type: "string" },
          reminder_offsets: {
            type: "array",
            items: {
              type: "object",
              required: ["amount", "unit"],
              properties: {
                amount: { type: "integer", minimum: 0 },
                unit: { type: "string", enum: ["hours", "days"] },
              },
            },
          },
        },
      },
    },
  },
};
