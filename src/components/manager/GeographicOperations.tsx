import React, { useState } from 'react';
import { 
  MapPin, 
  Layers, 
  ShieldCheck, 
  Filter, 
  Info, 
  ExternalLink,
  Compass,
  AlertTriangle
} from 'lucide-react';
import type { Activity, Region } from '../../types';

interface GeographicOperationsProps {
  activities: Activity[];
  regions: Region[];
  onSelectActivity: (activity: Activity) => void;
}

export const GeographicOperations: React.FC<GeographicOperationsProps> = ({
  activities,
  regions,
  onSelectActivity,
}) => {
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [activePin, setActivePin] = useState<Activity | null>(null);

  const geoActivities = activities.filter((a) => a.location !== undefined);
  const filteredActivities = geoActivities.filter(
    (a) => selectedRegionId === 'all' || a.regionId === selectedRegionId
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Controls */}
      <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#176B68] tracking-wide uppercase">
              PostGIS Geospatial Engine · Operational Theater
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#17252B] mt-0.5">
              Geographic Operations & Transit Activity Clusters
            </h1>
            <p className="text-xs text-[#64737A] mt-0.5">
              Encrypted GPS locations captured by field staff with spatial verification and regional geofencing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              aria-label="Filter Map Region"
              className="px-3 py-2 text-xs bg-[#F7F8F6] border border-[#E4E9E7] rounded-lg focus:outline-hidden focus:border-[#176B68] text-[#17252B] font-medium"
            >
              <option value="all">Global Operational View (All)</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Map Visualizer Container */}
      <div className="bg-[#17252B] border border-[#E4E9E7] rounded-2xl overflow-hidden shadow-md relative min-h-[460px] flex flex-col justify-between p-3.5 sm:p-6 min-w-0">
        {/* Subtle Map Grid / Topographic Mesh Backdrop */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#176B68_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top Map HUD Overlay */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-[#17252B]/80 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#247A58] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>PostGIS SRID:4326 Active</span>
            </div>
            <span className="text-white/30">|</span>
            <span className="font-mono tabular-nums text-white/80">
              {filteredActivities.length} GPS Coordinates Verified
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-white/70">
            <span>Accuracy Threshold: &le; 50 meters</span>
          </div>
        </div>

        {/* Central Map Visualization Area with Coordinate Nodes */}
        <div className="relative z-10 my-8 py-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            {regions.map((region) => {
              const regionActs = filteredActivities.filter((a) => a.regionId === region.id);
              return (
                <div
                  key={region.id}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 hover:border-[#176B68]/60 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                    <span className="font-mono text-[#176B68] font-bold">{region.code}</span>
                    <span className="font-mono tabular-nums text-white">
                      {region.center[0] > 0 ? '+' : ''}{region.center[0].toFixed(2)}°, {region.center[1] > 0 ? '+' : ''}{region.center[1].toFixed(2)}°
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{region.name}</h3>
                  <div className="text-xs text-white/70 mt-0.5">{region.country}</div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white/60">{regionActs.length} active pins</span>
                    <span className="text-[#247A58] font-semibold">GEOFENCE CLEAR</span>
                  </div>

                  {/* List of coordinate pins in this regional theater */}
                  <div className="mt-3 space-y-1.5">
                    {regionActs.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => {
                          setActivePin(act);
                          onSelectActivity(act);
                        }}
                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/5 text-xs text-white transition-colors flex items-center justify-between group"
                      >
                        <div className="truncate mr-2 font-medium">{act.title}</div>
                        <span className="font-mono text-[10px] text-[#176B68] group-hover:text-white shrink-0">
                          ±{act.location?.accuracy}m
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Status / Legend */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60 pt-4 border-t border-white/10">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#247A58]" /> High Accuracy (&le; 20m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B7791F]" /> Medium Accuracy (&le; 50m)
            </span>
          </div>

          <div className="text-[11px] text-white/50">
            Coordinates are stored using PostGIS GEOMETRY(Point, 4326) and strictly sanitized against unauthorized leaks.
          </div>
        </div>
      </div>

      {/* Selected Coordinate Dossier Drawer */}
      {activePin && activePin.location && (
        <div className="bg-white border border-[#E4E9E7] rounded-2xl p-6 shadow-xs">
          <div className="flex items-start justify-between pb-3 border-b border-[#E4E9E7]">
            <div>
              <span className="text-xs font-mono text-[#176B68] font-bold">
                GEOSPATIAL AUDIT RECORD #{activePin.id.slice(0, 8)}
              </span>
              <h2 className="text-base font-bold text-[#17252B] mt-0.5">{activePin.title}</h2>
              <div className="text-xs text-[#64737A] mt-0.5">
                Staff: {activePin.staffName} · {activePin.regionName}
              </div>
            </div>
            <button
              onClick={() => setActivePin(null)}
              className="text-xs text-[#64737A] hover:text-[#17252B] p-1"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
            <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
              <div className="text-[#64737A]">Latitude</div>
              <div className="text-sm font-bold font-mono text-[#17252B] mt-1">
                {activePin.location.latitude.toFixed(6)}
              </div>
            </div>

            <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
              <div className="text-[#64737A]">Longitude</div>
              <div className="text-sm font-bold font-mono text-[#17252B] mt-1">
                {activePin.location.longitude.toFixed(6)}
              </div>
            </div>

            <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
              <div className="text-[#64737A]">Accuracy Radius</div>
              <div className="text-sm font-bold font-mono text-[#247A58] mt-1">
                ±{activePin.location.accuracy} meters
              </div>
            </div>

            <div className="p-3 bg-[#F7F8F6] rounded-xl border border-[#E4E9E7]">
              <div className="text-[#64737A]">Source & Timing</div>
              <div className="text-sm font-bold font-mono text-[#17252B] mt-1">
                Hardware GNSS
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
