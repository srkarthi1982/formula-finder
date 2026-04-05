import { z } from "astro:schema";

export const formulaSubjectSchema = z
  .enum(["math", "physics", "chemistry", "statistics", "finance", "custom"])
  .nullable()
  .optional();

export const createFormulaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subject: formulaSubjectSchema,
  topic: z.string().trim().max(120).nullable().optional(),
  expression: z.string().trim().min(1).max(1000),
  variablesText: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  exampleText: z.string().trim().max(2000).nullable().optional(),
});

export const updateFormulaSchema = createFormulaSchema
  .partial()
  .extend({ id: z.number().int() })
  .refine((value) => Object.keys(value).some((key) => key !== "id"), {
    message: "At least one editable field must be included.",
  });
