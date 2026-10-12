import { writeFile } from "node:fs/promises";

const start = { lat: 37.3179581, lon: -122.0604412 };
const turnaround = { lat: 37.313, lon: -122.0638 };
const request = {
  locations: [start, turnaround],
  costing: "bicycle",
  directions_options: { units: "kilometers" },
};

const response = await fetch(
  `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(request))}`,
);
if (!response.ok)
  throw new Error(`Valhalla route request failed: ${response.status}`);
const route = await response.json();
if (route.trip.summary.has_ferry || route.trip.summary.has_highway)
  throw new Error("Unsafe route response: ferry or highway detected");
const namedWays = route.trip.legs.flatMap((leg) =>
  leg.maneuvers.flatMap((maneuver) => maneuver.street_names || []),
);
if (namedWays.some((name) => name !== "Stevens Creek Trail"))
  throw new Error(`Unexpected named way in route: ${namedWays.join(", ")}`);

function decodePolyline6(encoded) {
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates = [];
  const decodeValue = () => {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    latitude += decodeValue();
    longitude += decodeValue();
    coordinates.push([longitude / 1e6, latitude / 1e6]);
  }
  return coordinates;
}

const outbound = decodePolyline6(route.trip.legs[0].shape);
for (let index = 1; index < outbound.length; index += 1) {
  const [previous, current] = [outbound[index - 1], outbound[index]];
  const latitudeKm = (current[1] - previous[1]) * 111;
  const longitudeKm =
    (current[0] - previous[0]) *
    111 *
    Math.cos((previous[1] * Math.PI) / 180);
  if (Math.hypot(latitudeKm, longitudeKm) > 0.1)
    throw new Error("Route contains a coordinate jump over 100 meters");
}
const coordinates = [...outbound, ...outbound.slice(0, -1).reverse()];
const distanceKm = Number((route.trip.summary.length * 2).toFixed(2));
const generated = new Date().toISOString();

const geojson = {
  type: "FeatureCollection",
  metadata: {
    id: "blackberry",
    name: "Stevens Creek Trail 往返线",
    routeType: "out-and-back",
    source:
      "OpenStreetMap bicycle routing checked against City of Cupertino Blackberry Farm and McClellan Ranch trail maps",
    sourceUrls: [
      "https://www.cupertino.gov/Parks-Recreation/Aquatics-and-Golf/Blackberry-Farm",
      "https://www.cupertino.gov/files/assets/city/v/2/parks-and-recreation/documents/mcclellan/mcclellan-ranch-preserve-map.pdf",
    ],
    verification: "map-verified; field ride pending",
    generated,
    distanceKm,
    ascentM: null,
    descentM: null,
    loopGapM: 0,
  },
  features: [
    {
      type: "Feature",
      properties: {
        id: "blackberry",
        direction: "out-and-back",
        turnaround: [turnaround.lon, turnaround.lat],
      },
      geometry: { type: "LineString", coordinates },
    },
  ],
};

const points = coordinates
  .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
  .join("\n");
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rodrigues Rides" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>Stevens Creek Trail 往返线</name><desc>Blackberry Farm to McClellan Road on the bicycle-permitted Stevens Creek Trail; return the same way. Map verified; field ride pending.</desc></metadata>
  <wpt lat="${start.lat}" lon="${start.lon}"><name>Blackberry Farm public parking</name><sym>Parking Area</sym></wpt>
  <wpt lat="${turnaround.lat}" lon="${turnaround.lon}"><name>McClellan Road turnaround</name><sym>Flag, Blue</sym></wpt>
  <trk><name>Stevens Creek Trail 往返线</name><type>Cycling</type><trkseg>
${points}
  </trkseg></trk>
</gpx>
`;

await writeFile(
  new URL("../blackberry-v2.geojson", import.meta.url),
  `${JSON.stringify(geojson, null, 2)}\n`,
);
await writeFile(new URL("../blackberry-v2.gpx", import.meta.url), gpx);
console.log(JSON.stringify(geojson.metadata, null, 2));
