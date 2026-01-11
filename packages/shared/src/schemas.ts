import { z } from 'zod';

export const LocationSchema = z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()]) // [longitude, latitude]
});

export const ReportSchema = z.object({
    id: z.string().uuid().optional(),
    image_url: z.string().url(),
    location: LocationSchema,
    issue_type: z.string().min(1),
    severity_score: z.number().min(1).max(10),
    materials_required: z.array(z.string()),
    estimated_labor_hours: z.number().positive(),
    status: z.enum(['pending', 'verified', 'resolved']).default('pending'),
    created_at: z.string().datetime().optional(),
});

export type ReportType = z.infer<typeof ReportSchema>;
