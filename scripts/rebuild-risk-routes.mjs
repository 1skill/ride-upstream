import { readFile, writeFile } from "node:fs/promises";

const definitions = [
  {
    id: "west-cliff",
    start: [-122.023202, 36.964804],
    turnaround: [-122.080958, 36.960645],
    note: "已用 BRouter 与 OSM 自行车路由交叉核对；城市侧起点附近包含约 5 米需下车通过的连接段。",
  },
  {
    id: "alameda-loop",
    start: [-122.264275, 37.75949],
    turnaround: [-122.235964, 37.749205],
    note: "骑行起点已移到 Crown Beach 自行车道，避开旧路线开头需要下车通过的海滩连接段。",
  },
  {
    id: "iron-horse",
    start: [-121.9841879, 37.8033083],
    turnaround: [-121.9262634, 37.7267146],
    note: "全程采用 OSM 标记为区域自行车路线的道路；出发前仍需查看公园管理方的临时封闭公告。",
  },
];

const routesAuditUrl = new URL("../routes-audit.json", import.meta.url);
const routesAudit = JSON.parse(await readFile(routesAuditUrl, "utf8"));

const forbiddenPattern =
  /(^|\s)highway=(motorway|motorway_link)(\s|$)|(^|\s)route=ferry(\s|$)|(^|\s)bicycle=(no|private)(\s|$)/;

function metersBetween(a, b) {
  const radians = Math.PI / 180;
  const x =
    (b[0] - a[0]) *
    radians *
    Math.cos(((a[1] + b[1]) / 2) * radians);
  const y = (b[1] - a[1]) * radians;
  return 6371000 * Math.hypot(x, y);
}

function densify(coordinates, maximumStepM = 45) {
  const result = [coordinates[0]];
  for (let index = 1; index < coordinates.length; index += 1) {
    const from = coordinates[index - 1];
    const to = coordinates[index];
    const steps = Math.max(1, Math.ceil(metersBetween(from, to) / maximumStepM));
    for (let step = 1; step <= steps; step += 1)
      result.push(
        from.map((value, dimension) =>
          value + ((to[dimension] - value) * step) / steps,
        ),
      );
  }
  return result;
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function brouter(definition) {
  const url = new URL("https://brouter.de/brouter");
  url.searchParams.set(
    "lonlats",
    `${definition.start.join(",")}|${definition.turnaround.join(",")}`,
  );
  url.searchParams.set("profile", "trekking");
  url.searchParams.set("alternativeidx", "0");
  url.searchParams.set("format", "geojson");
  const response = await fetch(url, {
    headers: { "user-agent": "Rodrigues-Rides route rebuild" },
  });
  if (!response.ok)
    throw new Error(`${definition.id}: BRouter returned ${response.status}`);
  return response.json();
}

function gpxDocument(route, coordinates) {
  const start = coordinates[0];
  const turnaround = coordinates[Math.floor((coordinates.length - 1) / 2)];
  const parking = route.parking
    ? `  <wpt lat="${route.parking.lat}" lon="${route.parking.lon}"><name>${xml(route.parking.name)}</name><sym>Parking Area</sym></wpt>\n`
    : "";
  const points = coordinates
    .map(([lon, lat, elevation]) => {
      const ele = Number.isFinite(elevation) ? `<ele>${elevation}</ele>` : "";
      return `      <trkpt lat="${lat}" lon="${lon}">${ele}</trkpt>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rodrigues Rides" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>${xml(route.name)}</name><desc>OpenStreetMap bicycle geometry cross-checked with BRouter. Field ride pending. Return on the same route.</desc></metadata>
  <wpt lat="${start[1]}" lon="${start[0]}"><name>骑行线路起点 / 终点</name><sym>Flag, Green</sym><type>Route Start</type></wpt>
${parking}  <wpt lat="${turnaround[1]}" lon="${turnaround[0]}"><name>骑行折返点：沿原路返回</name><sym>Flag, Blue</sym><type>Turnaround</type></wpt>
  <trk><name>${xml(route.name)}</name><type>Cycling</type><trkseg>
${points}
  </trkseg></trk>
</gpx>
`;
}

for (const definition of definitions) {
  const route = routesAudit.routes.find((item) => item.id === definition.id);
  if (!route) throw new Error(`${definition.id}: missing routes-audit entry`);
  const result = await brouter(definition);
  const feature = result.features[0];
  const properties = feature.properties;
  const messages = properties.messages?.slice(1) || [];
  const forbiddenTags = messages
    .map((row) => String(row[9] || ""))
    .filter((tags) => forbiddenPattern.test(tags));
  if (forbiddenTags.length)
    throw new Error(`${definition.id}: forbidden tags ${forbiddenTags.join(", ")}`);

  const rawOutbound = feature.geometry.coordinates;
  const outbound = densify(rawOutbound);
  const coordinates = [...outbound, ...outbound.slice(0, -1).reverse()];
  const elevationCoordinates = [
    ...rawOutbound,
    ...rawOutbound.slice(0, -1).reverse(),
  ];
  const distanceKm = Number(
    ((Number(properties["track-length"]) * 2) / 1000).toFixed(1),
  );
  let climbM = 0;
  let descentM = 0;
  for (let index = 1; index < elevationCoordinates.length; index += 1) {
    const change =
      elevationCoordinates[index][2] - elevationCoordinates[index - 1][2];
    if (change > 1) climbM += change;
    if (change < -1) descentM -= change;
  }
  climbM = Math.round(climbM);
  descentM = Math.round(descentM);
  const generated = new Date().toISOString();
  const geojson = {
    type: "FeatureCollection",
    metadata: {
      id: route.id,
      name: route.name,
      routeType: "out-and-back",
      source: "BRouter trekking profile / OpenStreetMap bicycle geometry",
      sourceUrls: [route.permissionSource],
      verification: "open-source bicycle routing cross-check; field ride pending",
      generated,
      distanceKm,
      climbM,
      descentM,
      loopGapM: 0,
      reviewNote: definition.note,
    },
    features: [
      {
        type: "Feature",
        properties: {
          id: route.id,
          direction: "out-and-back",
          turnaround: outbound.at(-1).slice(0, 2),
        },
        geometry: { type: "LineString", coordinates },
      },
    ],
  };
  await writeFile(
    new URL(`../${route.file}`, import.meta.url),
    `${JSON.stringify(geojson, null, 2)}\n`,
  );
  await writeFile(
    new URL(`../${route.gpx}`, import.meta.url),
    gpxDocument(route, coordinates),
  );
  Object.assign(route, {
    distanceKm,
    climbM,
    descentM,
    metricSource: "BRouter/OSM bicycle geometry and elevation",
    verification: "open-source-cross-checked-field-pending",
    reviewNote: `${definition.note} 仍需实骑确认临时施工与现场状况。`,
  });
  console.log(route.id, `${distanceKm} km`, `${climbM} m climb`);
}

routesAudit.generated = new Date().toISOString();
await writeFile(routesAuditUrl, `${JSON.stringify(routesAudit, null, 2)}\n`);
