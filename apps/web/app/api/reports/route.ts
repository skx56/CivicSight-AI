import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to get DB path
const getDbPath = () => path.join(process.cwd(), 'data', 'reports.json');

function getReports() {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) return [];
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveReport(report: any) {
    const dbPath = getDbPath();
    const reports = getReports();
    reports.unshift(report); // Add to top
    // Ensure we don't store too many for this json file demo
    if (reports.length > 50) reports.length = 50;
    fs.writeFileSync(dbPath, JSON.stringify(reports, null, 2));
}

export async function GET() {
    const reports = getReports();
    return NextResponse.json(reports, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("Receiving Report:", body.id);
        saveReport(body);
        return NextResponse.json({ success: true }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    } catch (e) {
        console.error("API POST Error", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}
