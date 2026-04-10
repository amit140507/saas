import { z } from "zod";

export const clientSchema = z.object({
  first_name: z.string().min(2, "First name is too short"),
  last_name: z.string().min(2, "Last name is too short"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  status: z.enum(["active", "lead", "inactive"]),
  goal: z.string().optional(),
  health_conditions: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
