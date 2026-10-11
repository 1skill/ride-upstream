import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(new URL("../blackberry.geojson", import.meta.url)));
const original = source.features[0].geometry.coordinates;
const parkLoop = original.slice(25, 76);
const startOffset = 20;
const coordinates = [...parkLoop.slice(startOffset), ...parkLoop.slice(0, startOffset + 1)];
coordinates.push(coordinates[0]);

function haversine(a, b) {
  const radius = 6371;
  const radians = Math.PI / 180;
  const latitude = (b[1] - a[1]) * radians;
  const longitude = (b[0] - a[0]) * radians;
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(longitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

let distanceKm = 0;
let ascentM = 0;
let descentM = 0;
for (let index = 1; index < coordinates.length; index++) {
  distanceKm += haversine(coordinates[index - 1], coordinates[index]);
  const change = coordinates[index][2] - coordinates[index - 1][2];
  if (change > 0) ascentM += change;
  else descentM -= change;
}

const geojson = {
  type: "FeatureCollection",
  metadata: {
    id: "blackberry",
    name: "Blackberry Farm 溪谷自然线",
    source: "Existing GPS elevation trace, checked against OpenStreetMap and City of Cupertino trail guidance",
    verification: "map-verified; field ride pending",
    generated: "2026-10-11",
    distanceKm: Number(distanceKm.toFixed(3)),
    ascentM: Math.round(ascentM),
    descentM: Math.round(descentM),
    loopGapM: 0,
  },
  features: [{ type: "Feature", properties: { id: "blackberry", direction: "clockwise" }, geometry: { type: "LineString", coordinates } }],
};

const points = coordinates.map(([lon, lat, elevation]) => `      <trkpt lat="${lat}" lon="${lon}"><ele>${elevation}</ele></trkpt>`).join("\n");
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rodrigues Rides" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>Blackberry Farm 溪谷自然线</name><desc>Public-start sample route. Map-verified; field ride pending.</desc></metadata>
  <wpt lat="37.3179581" lon="-122.0604412"><name>Blackberry Farm public parking</name><sym>Parking Area</sym></wpt>
  <trk><name>Blackberry Farm 溪谷自然线</name><type>Cycling</type><trkseg>
${points}
  </trkseg></trk>
</gpx>
`;

await writeFile(new URL("../blackberry-v2.geojson", import.meta.url), `${JSON.stringify(geojson, null, 2)}\n`);
await writeFile(new URL("../blackberry-v2.gpx", import.meta.url), gpx);
console.log(JSON.stringify(geojson.metadata, null, 2));
