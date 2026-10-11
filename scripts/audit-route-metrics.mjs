import { readFile, writeFile } from "node:fs/promises";

const routes = [
  [
    "blackberry",
    "Blackberry Farm 溪谷自然线",
    "blackberry-v2.geojson",
    "Cupertino",
    "daily",
  ],
  [
    "los-gatos-creek",
    "Los Gatos Creek 绿廊",
    "los-gatos-creek.geojson",
    "South Bay",
    "medium",
  ],
  [
    "coyote-creek",
    "Coyote Creek 远行",
    "coyote-creek.geojson",
    "South Bay",
    "long",
  ],
  [
    "sawyer-camp",
    "Sawyer Camp 水库线",
    "sawyer-camp.geojson",
    "Peninsula",
    "medium",
  ],
  [
    "portola-loop",
    "Woodside–Portola 环线",
    "portola-loop.geojson",
    "Peninsula",
    "medium",
  ],
  [
    "west-cliff",
    "West Cliff–Capitola 海岸线",
    "west-cliff.geojson",
    "Santa Cruz",
    "medium",
  ],
  [
    "alameda-loop",
    "Alameda 岛屿环线",
    "alameda-loop.geojson",
    "East Bay",
    "medium",
  ],
  [
    "iron-horse",
    "Iron Horse Trail 纵走",
    "iron-horse.geojson",
    "East Bay",
    "long",
  ],
];

function haversine(a, b) {
  const r = 6371,
    p = Math.PI / 180;
  const dLat = (b[1] - a[1]) * p,
    dLon = (b[0] - a[0]) * p;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * p) * Math.cos(b[1] * p) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(value));
}

const audited = [];
for (const [id, name, file, area, category] of routes) {
  const data = JSON.parse(
    await readFile(new URL(`../${file}`, import.meta.url)),
  );
  const coordinates = data.features[0].geometry.coordinates;
  let distanceKm = 0;
  for (let index = 1; index < coordinates.length; index++)
    distanceKm += haversine(coordinates[index - 1], coordinates[index]);
  const step = Math.max(1, Math.ceil(coordinates.length / 350));
  const sampled = coordinates.filter((_, index) => index % step === 0);
  if (sampled.at(-1) !== coordinates.at(-1)) sampled.push(coordinates.at(-1));
  const request = {
    shape: sampled.map(([lon, lat]) => ({ lat, lon })),
    range: true,
  };
  const response = await fetch("https://valhalla1.openstreetmap.de/height", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`${id}: elevation ${response.status}`);
  const heights = (await response.json()).range_height.map((item) => item[1]);
  let climbM = 0,
    descentM = 0;
  for (let index = 1; index < heights.length; index++) {
    const change = heights[index] - heights[index - 1];
    if (change > 1) climbM += change;
    if (change < -1) descentM -= change;
  }
  if (
    id === "blackberry" &&
    coordinates.every((point) => Number.isFinite(point[2]))
  ) {
    climbM = 0;
    descentM = 0;
    for (let index = 1; index < coordinates.length; index++) {
      const change = coordinates[index][2] - coordinates[index - 1][2];
      if (change > 0) climbM += change;
      if (change < 0) descentM -= change;
    }
  }
  const loopGapM = haversine(coordinates[0], coordinates.at(-1)) * 1000;
  audited.push({
    id,
    name,
    file,
    area,
    category,
    distanceKm: +distanceKm.toFixed(1),
    climbM: Math.round(climbM),
    descentM: Math.round(descentM),
    loopGapM: +loopGapM.toFixed(1),
    metricSource: "GPS geometry + Valhalla/SRTM elevation",
    verification:
      id === "blackberry"
        ? "map-verified-field-pending"
        : "routing-generated-permission-review",
  });
  console.log(
    id,
    distanceKm.toFixed(1),
    Math.round(climbM),
    loopGapM.toFixed(1),
  );
}

await writeFile(
  new URL("../routes-audit.json", import.meta.url),
  `${JSON.stringify({ generated: new Date().toISOString(), routes: audited }, null, 2)}\n`,
);
