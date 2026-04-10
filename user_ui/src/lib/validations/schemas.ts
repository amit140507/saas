import { z } from "zod";

export const measurementSchema = z.object({
  date: z.string(),
  weight: z.number().min(0).max(500).optional(),
  chest: z.number().min(0).optional(),
  hips: z.number().min(0).optional(),
  waist: z.number().min(0).optional(),
  biceps: z.number().min(0).optional(),
  thighs: z.number().min(0).optional(),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;
