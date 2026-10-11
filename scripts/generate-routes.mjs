import { writeFile } from "node:fs/promises";

const routes = {
  "los-gatos-creek": [[37.2355,-121.9624],[37.2572,-121.9674],[37.2792,-121.9501],[37.2955,-121.9307],[37.3230,-121.9401],[37.2792,-121.9501],[37.2355,-121.9624]],
  "coyote-creek": [[37.2446,-121.8307],[37.2147,-121.8095],[37.1753,-121.7440],[37.1305,-121.6548],[37.0887,-121.6135],[37.1305,-121.6548],[37.1753,-121.7440],[37.2147,-121.8095],[37.2446,-121.8307]],
  "sawyer-camp": [[37.5312,-122.3647],[37.5601,-122.3874],[37.5904,-122.4137],[37.6119,-122.4230],[37.5904,-122.4137],[37.5601,-122.3874],[37.5312,-122.3647]],
  "portola-loop": [[37.4426,-122.2279],[37.3867,-122.2388],[37.3730,-122.2082],[37.3836,-122.1782],[37.4255,-122.1987],[37.4426,-122.2279]],
  "west-cliff": [[36.9646,-122.0231],[36.9502,-122.0475],[36.9546,-122.0579],[36.9608,-122.0811],[36.9502,-122.0475],[36.9646,-122.0231],[36.9735,-121.9528],[36.9646,-122.0231]],
  "wilder-ranch": [[36.9608,-122.0811],[36.9774,-122.1266],[37.0150,-122.1937],[37.0461,-122.2264],[37.0150,-122.1937],[36.9774,-122.1266],[36.9608,-122.0811]],
  "alameda-loop": [[37.7716,-122.2797],[37.7863,-122.3067],[37.7690,-122.3292],[37.7412,-122.3180],[37.7324,-122.2476],[37.7716,-122.2797]],
  "iron-horse": [[37.7067,-121.9383],[37.7624,-121.9535],[37.8079,-121.9942],[37.8783,-122.0702],[37.9014,-122.0617],[37.8783,-122.0702],[37.8079,-121.9942],[37.7624,-121.9535],[37.7067,-121.9383]]
};

function decodePolyline(encoded, precision = 6) {
  let index = 0, lat = 0, lon = 0;
  const coordinates = [];
  while (index < encoded.length) {
    let result = 0, shift = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lon / 10 ** precision, lat / 10 ** precision]);
  }
  return coordinates;
}

for (const [id, points] of Object.entries(routes)) {
  const json = {
    locations: points.map(([lat, lon]) => ({ lat, lon, type: "break" })),
    costing: "bicycle",
    costing_options: { bicycle: { bicycle_type: "Road", use_roads: 0.25, use_hills: 0.35 } },
    directions_options: { units: "kilometers", format: "osrm" }
  };
  const url = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(json))}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${id}: ${response.status} ${await response.text()}`);
  const result = await response.json();
  const route = result.routes?.[0];
  if (!route?.geometry) throw new Error(`${id}: no route`);
  const feature = {
    type: "FeatureCollection",
    metadata: { source: "OpenStreetMap / Valhalla bicycle routing", generated: new Date().toISOString(), distanceKm: Math.round(route.distance / 100) / 10 },
    features: [{ type: "Feature", properties: { id }, geometry: { type: "LineString", coordinates: decodePolyline(route.geometry) } }]
  };
  await writeFile(`${id}.geojson`, `${JSON.stringify(feature)}\n`);
  console.log(id, feature.metadata.distanceKm, "km", feature.features[0].geometry.coordinates.length, "points");
}
