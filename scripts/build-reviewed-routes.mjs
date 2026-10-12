import { writeFile } from "node:fs/promises";

const routeDefinitions = [
  {
    id: "los-gatos-creek",
    name: "Los Gatos Creek Trail 往返线",
    area: "South Bay",
    category: "daily",
    kind: "namedTrail",
    query: "Los Gatos Creek Trail, California",
    officialSource:
      "https://parks.sccgov.org/sites/g/files/exjcpb961/files/PixNParks-2020-Los-Gatos-Creek.pdf",
  },
  {
    id: "coyote-creek",
    name: "Coyote Creek Trail 往返线",
    area: "South Bay",
    category: "medium",
    kind: "namedTrail",
    query: "Coyote Creek Trail, San Jose, California",
    officialSource:
      "https://www.sanjoseca.gov/Home/Components/FacilityDirectory/FacilityDirectory/3037/2058",
  },
  {
    id: "sawyer-camp",
    name: "Sawyer Camp Trail 往返线",
    area: "Peninsula",
    category: "medium",
    kind: "namedTrail",
    query: "Sawyer Camp Trail, California",
    officialSource: "https://www.smcgov.org/parks/sawyer-camp-segment",
    parking: {
      lat: 37.5310108,
      lon: -122.363993,
      name: "Sawyer Camp Trail South Gate parking (Crystal Springs Road / Skyline Boulevard)",
    },
  },
  {
    id: "portola-loop",
    name: "Alpine Trail 往返线",
    area: "Peninsula",
    category: "medium",
    kind: "valhalla",
    endpoints: [
      [37.373, -122.2082],
      [37.43, -122.199],
    ],
    allowedWays: [
      "Dwight Crowder Trail",
      "Los Trancos Road",
      "Alpine Trail",
      "Alpine Road Bicycle Trail",
      "Alpine Road",
      "Sharon Road",
    ],
    officialSource: "https://www.smcgov.org/parks/trail/alpine-trail",
  },
  {
    id: "west-cliff",
    name: "West Cliff–Wilder 海岸往返线",
    area: "Santa Cruz",
    category: "medium",
    kind: "valhalla",
    endpoints: [
      [36.9646, -122.0231],
      [36.9608, -122.0811],
    ],
    allowedWays: [
      "2nd Street",
      "Pacific Avenue",
      "Beach Street",
      "Coastal Rail Trail Santa Cruz",
      "Bay & California",
      "Bay Street",
      "Redwood Street",
      "Palm Street",
      "Wilder Ranch Bike/Pedestrian Path",
      "Coast Road",
    ],
    officialSource:
      "https://www.cityofsantacruz.com/government/city-departments/parks-recreation/parks-beaches-open-spaces/parks/bethany-curve",
  },
  {
    id: "alameda-loop",
    name: "Crown Beach–Bay Farm Bridge 往返线",
    area: "East Bay",
    category: "daily",
    kind: "valhalla",
    endpoints: [
      [37.7603695, -122.2675865],
      [37.7492046, -122.2359634],
    ],
    allowedWays: [
      "Shore Line Drive",
      "Bayview Drive",
      "Otis Drive",
      "CA 61",
      "Bay Farm Island Bicycle Bridge",
    ],
    officialSource: "https://www.ebparks.org/parks/crown-beach",
    parking: { lat: 37.7603695, lon: -122.2675865, name: "Crown Beach parking" },
  },
  {
    id: "iron-horse",
    name: "Iron Horse Trail 纵走往返线",
    area: "East Bay",
    category: "medium",
    kind: "namedTrail",
    query: "San Ramon Valley Iron Horse Trail, California",
    officialSource: "https://www.ebparks.org/trails/interpark/iron-horse",
    closedUntil: "2026-10-13",
    advisory:
      "Walnut Creek Mt Diablo Boulevard 至 Civic Park 路段公告关闭至 2026-10-12；Robert I. Schroder 桥夜间施工持续至 2026-12-31。",
  },
];

const earthRadiusKm = 6371;
const radians = Math.PI / 180;
function distance(a, b) {
  const x =
    (b[0] - a[0]) *
    radians *
    Math.cos(((a[1] + b[1]) / 2) * radians);
  const y = (b[1] - a[1]) * radians;
  return earthRadiusKm * Math.hypot(x, y);
}
function lineLength(coordinates) {
  return coordinates
    .slice(1)
    .reduce((total, point, index) => total + distance(coordinates[index], point), 0);
}
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
function validateCoordinates(coordinates, id) {
  if (coordinates.length < 2) throw new Error(`${id}: too few coordinates`);
  for (let index = 1; index < coordinates.length; index += 1) {
    if (distance(coordinates[index - 1], coordinates[index]) > 0.1)
      throw new Error(`${id}: coordinate jump over 100 meters`);
  }
}
function densifyCoordinates(coordinates, maximumKm = 0.05) {
  const dense = [coordinates[0]];
  for (let index = 1; index < coordinates.length; index += 1) {
    const from = coordinates[index - 1];
    const to = coordinates[index];
    const steps = Math.max(1, Math.ceil(distance(from, to) / maximumKm));
    for (let step = 1; step <= steps; step += 1) {
      dense.push([
        from[0] + ((to[0] - from[0]) * step) / steps,
        from[1] + ((to[1] - from[1]) * step) / steps,
      ]);
    }
  }
  return dense;
}

async function namedTrailPath(definition) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", definition.query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "50");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("dedupe", "0");
  const response = await fetch(url, {
    headers: { "user-agent": "RodriguesRides/2.0 route-review" },
  });
  if (!response.ok) throw new Error(`${definition.id}: Nominatim ${response.status}`);
  const segments = (await response.json())
    .filter(
      (item) => item.type === "cycleway" && item.geojson?.type === "LineString",
    )
    .map((item) => ({
      id: item.osm_id,
      coordinates: item.geojson.coordinates,
      weight: lineLength(item.geojson.coordinates),
    }));
  const nodes = [];
  const nodeIndex = (point) => {
    let index = nodes.findIndex((node) => distance(node, point) < 0.03);
    if (index < 0) {
      index = nodes.length;
      nodes.push(point);
    }
    return index;
  };
  for (const segment of segments) {
    segment.start = nodeIndex(segment.coordinates[0]);
    segment.end = nodeIndex(segment.coordinates.at(-1));
  }
  const adjacency = nodes.map(() => []);
  segments.forEach((segment, edge) => {
    adjacency[segment.start].push({ node: segment.end, edge });
    adjacency[segment.end].push({ node: segment.start, edge });
  });
  const visited = new Set();
  const components = [];
  for (let start = 0; start < nodes.length; start += 1) {
    if (visited.has(start)) continue;
    const stack = [start];
    const component = [];
    visited.add(start);
    while (stack.length) {
      const node = stack.pop();
      component.push(node);
      for (const neighbor of adjacency[node]) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node);
          stack.push(neighbor.node);
        }
      }
    }
    components.push(component);
  }
  const componentWeight = (component) => {
    const nodeSet = new Set(component);
    const edges = new Set();
    for (const node of component) {
      for (const neighbor of adjacency[node]) {
        if (nodeSet.has(neighbor.node)) edges.add(neighbor.edge);
      }
    }
    return [...edges].reduce((total, edge) => total + segments[edge].weight, 0);
  };
  components.sort((a, b) => componentWeight(b) - componentWeight(a));
  const component = new Set(components[0]);
  let best;
  for (const origin of component) {
    const costs = nodes.map(() => Infinity);
    const previous = nodes.map(() => null);
    const queue = [[0, origin]];
    costs[origin] = 0;
    while (queue.length) {
      queue.sort((a, b) => a[0] - b[0]);
      const [cost, node] = queue.shift();
      if (cost !== costs[node]) continue;
      for (const neighbor of adjacency[node]) {
        if (!component.has(neighbor.node)) continue;
        const next = cost + segments[neighbor.edge].weight;
        if (next < costs[neighbor.node]) {
          costs[neighbor.node] = next;
          previous[neighbor.node] = { node, edge: neighbor.edge };
          queue.push([next, neighbor.node]);
        }
      }
    }
    for (const destination of component) {
      if (!Number.isFinite(costs[destination])) continue;
      if (!best || costs[destination] > best.distance)
        best = { origin, destination, distance: costs[destination], previous };
    }
  }
  const path = [];
  let cursor = best.destination;
  while (cursor !== best.origin) {
    const step = best.previous[cursor];
    path.push({ from: step.node, to: cursor, edge: step.edge });
    cursor = step.node;
  }
  path.reverse();
  const coordinates = [];
  for (const step of path) {
    const segment = segments[step.edge];
    const forward = segment.start === step.from;
    const points = forward
      ? segment.coordinates
      : [...segment.coordinates].reverse();
    coordinates.push(...(coordinates.length ? points.slice(1) : points));
  }
  const denseCoordinates = densifyCoordinates(coordinates);
  validateCoordinates(denseCoordinates, definition.id);
  return denseCoordinates;
}

async function valhallaPath(definition) {
  const request = {
    locations: definition.endpoints.map(([lat, lon]) => ({ lat, lon })),
    costing: "bicycle",
    costing_options: {
      bicycle: { bicycle_type: "Road", use_roads: 0.1, use_hills: 0.35 },
    },
    directions_options: { units: "kilometers" },
  };
  const response = await fetch(
    `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(request))}`,
  );
  if (!response.ok) throw new Error(`${definition.id}: Valhalla ${response.status}`);
  const result = await response.json();
  if (result.trip.summary.has_ferry || result.trip.summary.has_highway)
    throw new Error(`${definition.id}: ferry or highway detected`);
  const names = [
    ...new Set(
      result.trip.legs.flatMap((leg) =>
        leg.maneuvers.flatMap((maneuver) => maneuver.street_names || []),
      ),
    ),
  ];
  const unexpected = names.filter((name) => !definition.allowedWays.includes(name));
  if (unexpected.length)
    throw new Error(`${definition.id}: unexpected ways ${unexpected.join(", ")}`);
  const coordinates = densifyCoordinates(decodePolyline6(result.trip.legs[0].shape));
  validateCoordinates(coordinates, definition.id);
  return coordinates;
}

async function elevationMetrics(coordinates) {
  const step = Math.max(1, Math.ceil(coordinates.length / 300));
  const sampled = coordinates.filter((_, index) => index % step === 0);
  if (sampled.at(-1) !== coordinates.at(-1)) sampled.push(coordinates.at(-1));
  const response = await fetch("https://valhalla1.openstreetmap.de/height", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      shape: sampled.map(([lon, lat]) => ({ lat, lon })),
      range: true,
    }),
  });
  if (!response.ok) return { climbM: null, descentM: null };
  const heights = (await response.json()).range_height.map((item) => item[1]);
  let climbM = 0;
  let descentM = 0;
  for (let index = 1; index < heights.length; index += 1) {
    const change = heights[index] - heights[index - 1];
    if (change > 1) climbM += change;
    if (change < -1) descentM -= change;
  }
  return { climbM: Math.round(climbM), descentM: Math.round(descentM) };
}

function gpxDocument(definition, coordinates, parking) {
  const points = coordinates
    .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join("\n");
  const parkingPoint = parking
    ? `  <wpt lat="${parking.lat}" lon="${parking.lon}"><name>${parking.name}</name><sym>Parking Area</sym></wpt>\n`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rodrigues Rides" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>${definition.name}</name><desc>Map-reviewed bicycle route; field ride pending. Return on the same route.</desc></metadata>
${parkingPoint}  <trk><name>${definition.name}</name><type>Cycling</type><trkseg>
${points}
  </trkseg></trk>
</gpx>
`;
}

const auditRoutes = [];
for (const definition of routeDefinitions) {
  const outbound =
    definition.kind === "namedTrail"
      ? await namedTrailPath(definition)
      : await valhallaPath(definition);
  const coordinates = [...outbound, ...outbound.slice(0, -1).reverse()];
  validateCoordinates(coordinates, definition.id);
  const distanceKm = Number(lineLength(coordinates).toFixed(1));
  const elevation = await elevationMetrics(coordinates);
  const start = outbound[0];
  const turnaround = outbound.at(-1);
  const parking = definition.parking || {
    lat: start[1],
    lon: start[0],
    name: `${definition.name} 起点附近；停车合法性待现场确认`,
    unverified: true,
  };
  const geojson = {
    type: "FeatureCollection",
    metadata: {
      id: definition.id,
      name: definition.name,
      routeType: "out-and-back",
      source: `${definition.kind === "namedTrail" ? "OpenStreetMap named cycleway geometry" : "OpenStreetMap/Valhalla bicycle routing"}; permission checked against official agency page`,
      sourceUrls: [definition.officialSource],
      verification: "map-verified; field ride pending",
      generated: new Date().toISOString(),
      distanceKm,
      ...elevation,
      loopGapM: 0,
    },
    features: [
      {
        type: "Feature",
        properties: {
          id: definition.id,
          direction: "out-and-back",
          turnaround,
        },
        geometry: { type: "LineString", coordinates },
      },
    ],
  };
  await writeFile(
    new URL(`../${definition.id}.geojson`, import.meta.url),
    `${JSON.stringify(geojson, null, 2)}\n`,
  );
  const gpx = `${definition.id}.gpx`;
  await writeFile(
    new URL(`../${gpx}`, import.meta.url),
    gpxDocument(definition, coordinates, parking),
  );
  auditRoutes.push({
    id: definition.id,
    name: definition.name,
    file: `${definition.id}.geojson`,
    gpx,
    area: definition.area,
    category: definition.category,
    distanceKm,
    ...elevation,
    loopGapM: 0,
    metricSource: "Road geometry + Valhalla/SRTM elevation",
    verification: "map-verified-field-pending",
    routeType: "out-and-back",
    permissionSource: definition.officialSource,
    parking,
    closedUntil: definition.closedUntil,
    advisory: definition.advisory,
    reviewNote:
      "已检查坐标连续性、排除渡轮与高速公路，并对照官方资料确认该 Trail 允许骑行；仍需实骑确认临时施工与现场路况。",
  });
  console.log(definition.id, distanceKm, elevation);
}

await writeFile(
  new URL("../reviewed-routes.json", import.meta.url),
  `${JSON.stringify({ generated: new Date().toISOString(), routes: auditRoutes }, null, 2)}\n`,
);

const stevensCreek = {
  id: "blackberry",
  name: "Stevens Creek Trail 往返线",
  file: "blackberry-v2.geojson",
  gpx: "blackberry-v2.gpx",
  area: "Cupertino",
  category: "daily",
  distanceKm: 1.72,
  climbM: null,
  descentM: null,
  loopGapM: 0,
  metricSource: "Valhalla/OpenStreetMap bicycle geometry; elevation pending field validation",
  verification: "map-verified-field-pending",
  routeType: "out-and-back",
  permissionSource:
    "https://www.cupertino.gov/files/assets/city/v/2/parks-and-recreation/documents/mcclellan/mcclellan-ranch-preserve-map.pdf",
  parking: {
    lat: 37.3179581,
    lon: -122.0604412,
    name: "Blackberry Farm public parking",
  },
  reviewNote:
    "Uses Stevens Creek Trail only; excludes the footpath-only Nature Trail. Turn around at McClellan Road and return on the same trail.",
};
await writeFile(
  new URL("../routes-audit.json", import.meta.url),
  `${JSON.stringify({ generated: new Date().toISOString(), routes: [stevensCreek, ...auditRoutes] }, null, 2)}\n`,
);
