import { MapPin, Layers, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MapPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Issue Map</h1>
        <p className="page-subtitle">
          Visualize civic issues across your city geographically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map placeholder */}
        <div className="lg:col-span-3">
          <Card padded={false} className="overflow-hidden">
            <div className="relative bg-gradient-to-br from-blue-50 to-green-50 h-[600px] flex items-center justify-center">
              {/* Map placeholder visualization */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-saffron/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-10 h-10 text-saffron" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Interactive Map
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Map integration requires a Mapbox or Google Maps token.
                  Configure <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">NEXT_PUBLIC_MAP_TOKEN</code> in your environment.
                </p>
              </div>

              {/* Mock map markers */}
              <div className="absolute top-1/4 left-1/3">
                <div className="w-6 h-6 bg-error rounded-full border-2 border-white shadow-md flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">3</span>
                </div>
              </div>
              <div className="absolute top-1/3 right-1/3">
                <div className="w-6 h-6 bg-warning rounded-full border-2 border-white shadow-md flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">5</span>
                </div>
              </div>
              <div className="absolute bottom-1/3 left-1/2">
                <div className="w-6 h-6 bg-success rounded-full border-2 border-white shadow-md flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">2</span>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/4">
                <div className="w-6 h-6 bg-info rounded-full border-2 border-white shadow-md flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">7</span>
                </div>
              </div>

              {/* Controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button size="sm" variant="ghost" className="bg-white shadow-sm">
                  <Layers className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="bg-white shadow-sm">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - nearby issues */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Nearby Issues</h3>
          {[
            { title: "Pothole on MG Road", category: "pothole", distance: "0.5 km", status: "work_started" },
            { title: "Garbage pile at 4th Block", category: "garbage", distance: "1.2 km", status: "acknowledged" },
            { title: "Streetlight out on 5th Cross", category: "streetlight", distance: "1.8 km", status: "reported" },
            { title: "Water pipe burst", category: "water_supply", distance: "2.1 km", status: "assigned" },
            { title: "Road damage near bridge", category: "road_damage", distance: "3.0 km", status: "completed" },
          ].map((item, i) => (
            <Card key={i} hoverable className="!p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-saffron mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="saffron">{item.category}</Badge>
                    <span className="text-xs text-gray-400">{item.distance}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
