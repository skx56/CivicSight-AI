export * from './supabase';
export * from './schemas';

// Legacy Interface (kept for compatibility, but Zod inference is preferred now)
export interface Report {
    id: string;
    image_url: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [lon, lat]
    };
    issue_type: string;
    severity_score: number;
    materials_required: string[];
    estimated_labor_hours: number;
    status: 'pending' | 'verified' | 'resolved';
    created_at: string;
}
