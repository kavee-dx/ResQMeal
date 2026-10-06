import React, { useEffect } from "react";
import { View } from "react-native";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { Colors } from "@/constants/theme";
import { RescueLocation } from "@/types/amasha-map";

interface Props {
  locations: RescueLocation[];
  onMarkerPress?: (loc: RescueLocation) => void;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];

// Web version of the map (react-native-maps is native-only).
export default function AmashaBaseMap({ locations, onMarkerPress }: Props) {
  const colors = Colors.light;

  // Leaflet needs its stylesheet or tiles render scrambled.
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }, []);

  const markerColor: Record<string, string> = {
    donor: colors.primary,
    available_food: colors.success,
    recipient: colors.warning,
    ngo: colors.info,
    pickup: colors.secondary,
    delivery: colors.secondary,
  };

  const center: [number, number] = locations.length
    ? [locations[0].latitude, locations[0].longitude]
    : DEFAULT_CENTER;

  return (
    <View style={{ flex: 1 }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution="&copy; OpenStreetMap contributors"
        />
        {locations.map((loc) => {
          const color = markerColor[loc.type] ?? colors.primary;
          return (
            <CircleMarker
              key={loc.id}
              center={[loc.latitude, loc.longitude]}
              radius={10}
              pathOptions={{
                color: "#FFFFFF",
                weight: 2,
                fillColor: color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => onMarkerPress?.(loc) }}
            >
              {!!loc.title && <Tooltip>{loc.title}</Tooltip>}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </View>
  );
}