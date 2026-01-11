'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Report } from '@civicsight/shared';

// Fix Leaflet Icon
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Helper component to handle map events
function MapEvents({ onClick }: { onClick?: (lat: number, lon: number) => void }) {
    useMapEvents({
        click(e) {
            if (onClick) onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function MapView({ reports, onMapClick }: { reports: Report[], onMapClick?: (lat: number, lon: number) => void }) {
    // Default center (San Francisco for demo)
    const center: [number, number] = [37.7749, -122.4194];

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="h-full w-full bg-gray-800 animate-pulse rounded-2xl" />;

    return (
        <MapContainer key="chart-view" center={center} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '1rem' }}>
            <MapEvents onClick={onMapClick} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {reports.map((report) => {
                if (!report.location?.coordinates) return null;
                // PostGIS points are usually [lon, lat], Leaflet needs [lat, lon]
                const [lon, lat] = report.location.coordinates;

                return (
                    <Marker key={report.id} position={[lat, lon]} icon={icon}>
                        <Popup className="glass-popup">
                            <div className="text-gray-900">
                                <strong className="uppercase block text-sm font-bold text-emerald-600">{report.issue_type}</strong>
                                <span className="text-xs">Severity: {report.severity_score}/10</span>
                                <br />
                                <img src={report.image_url} alt="Issue" className="w-full h-24 object-cover mt-2 rounded" />
                            </div>
                        </Popup>
                    </Marker>
                )
            })}
        </MapContainer>
    );
}
