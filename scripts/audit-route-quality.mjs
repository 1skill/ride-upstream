import { readFile, writeFile } from "node:fs/promises";

const audit = JSON.parse(
  await readFile(new URL("../routes-audit.json", import.meta.url), "utf8"),
);

const toRad = (value) => (value * Math.PI) / 180;
function metersBetween(a, b) {
  const radius = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function nearestDistance(point, line) {
  let nearest = Infinity;
  const latitudeScale = 111320;
  const longitudeScale =
    latitudeScale * Math.cos(toRad(point[1]));
  for (let index = 1; index < line.length; index += 1) {
    const start = line[index - 1];
    const end = line[index];
    const ax = (start[0] - point[0]) * longitudeScale;
    const ay = (start[1] - point[1]) * latitudeScale;
    const bx = (end[0] - point[0]) * longitudeScale;
    const by = (end[1] - point[1]) * latitudeScale;
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const position = denominator
      ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator))
      : 0;
    nearest = Math.min(
      nearest,
      Math.hypot(ax + position * dx, ay + position * dy),
    );
  }
  return nearest;
}

function sampled(points, limit = 180) {
  const step = Math.max(1, Math.ceil(points.length / limit));
  const result = points.filter((_, index) => index % step === 0);
  if (result.at(-1) !== points.at(-1)) result.push(points.at(-1));
  return result;
}

function percentile(values, fraction) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))];
}

async function brouter(start, turnaround) {
  const url = new URL("https://brouter.de/brouter");
  url.searchParams.set(
    "lonlats",
    `${start[0]},${start[1]}|${turnaround[0]},${turnaround[1]}`,
  );
  url.searchParams.set("profile", "trekking");
  url.searchParams.set("alternativeidx", "0");
  url.searchParams.set("format", "geojson");
  const response = await fetch(url, {
    headers: { "user-agent": "Rodrigues-Rides route quality audit" },
  });
  if (!response.ok) throw new Error(`BRouter returned ${response.status}`);
  return response.json();
}

const results = [];
for (const route of audit.routes) {
  const geojson = JSON.parse(
    await readFile(new URL(`../${route.file}`, import.meta.url), "utf8"),
  );
  const coordinates = geojson.features[0].geometry.coordinates.map((point) =>
    point.slice(0, 2),
  );
  const midpoint = Math.floor((coordinates.length - 1) / 2);
  const outbound = coordinates.slice(0, midpoint + 1);
  const inbound = coordinates.slice(midpoint).reverse();
  const independent = await brouter(outbound[0], outbound.at(-1));
  const brouterLine = independent.features[0].geometry.coordinates.map((point) =>
    point.slice(0, 2),
  );

  let maximumStepM = 0;
  for (let index = 1; index < coordinates.length; index += 1)
    maximumStepM = Math.max(
      maximumStepM,
      metersBetween(coordinates[index - 1], coordinates[index]),
    );

  const symmetryOutboundDistances = sampled(outbound).map((point) =>
    nearestDistance(point, inbound),
  );
  const symmetryInboundDistances = sampled(inbound).map((point) =>
    nearestDistance(point, outbound),
  );
  const symmetryM = Math.max(
    ...symmetryOutboundDistances,
    ...symmetryInboundDistances,
  );
  const engineDistances = sampled(outbound).map((point) =>
    nearestDistance(point, brouterLine),
  );
  const reverseEngineDistances = sampled(brouterLine).map((point) =>
    nearestDistance(point, outbound),
  );
  const crossEngineMaxM = Math.max(
    ...engineDistances,
    ...reverseEngineDistances,
  );
  const crossEngineMeanM =
    [...engineDistances, ...reverseEngineDistances].reduce(
      (total, value) => total + value,
      0,
    ) /
    (engineDistances.length + reverseEngineDistances.length);
  const allEngineDistances = [...engineDistances, ...reverseEngineDistances];
  const crossEngineP95M = percentile(allEngineDistances, 0.95);
  const crossEngineCoverage35M =
    allEngineDistances.filter((distance) => distance <= 35).length /
    allEngineDistances.length;

  const messages = independent.features[0].properties.messages || [];
  const wayTags = messages.slice(1).map((row) => String(row[9] || ""));
  const forbiddenTags = wayTags.filter(
    (tags) =>
      /(^|\s)highway=(motorway|motorway_link)(\s|$)/.test(tags) ||
      /(^|\s)route=ferry(\s|$)/.test(tags) ||
      /(^|\s)bicycle=(no|private)(\s|$)/.test(tags),
  );
  const checks = {
    coordinateContinuity: maximumStepM <= 100,
    outAndBackSymmetry: symmetryM <= 8,
    independentRouterAgreement: crossEngineMaxM <= 35,
    noForbiddenBicycleTags: forbiddenTags.length === 0,
    returnsToStart: metersBetween(coordinates[0], coordinates.at(-1)) <= 8,
  };
  const passed = Object.values(checks).every(Boolean);
  const localizedDifference =
    !passed &&
    checks.coordinateContinuity &&
    checks.outAndBackSymmetry &&
    checks.noForbiddenBicycleTags &&
    checks.returnsToStart &&
    crossEngineP95M <= 35 &&
    crossEngineCoverage35M >= 0.95;
  const status = passed
    ? "road-geometry-cross-checked"
    : localizedDifference
      ? "localized-router-difference"
      : "route-review-required";
  results.push({
    id: route.id,
    name: route.name,
    status,
    checks,
    evidence: {
      existingEngine: "Valhalla/OpenStreetMap",
      independentEngine: "BRouter trekking/OpenStreetMap",
      brouterVersion: independent.features[0].properties.creator,
      brouterOutboundM: Number(
        independent.features[0].properties["track-length"],
      ),
      maximumCoordinateStepM: +maximumStepM.toFixed(1),
      outAndBackSymmetryMaxM: +symmetryM.toFixed(1),
      crossEngineMaximumDifferenceM: +crossEngineMaxM.toFixed(1),
      crossEngineP95DifferenceM: +crossEngineP95M.toFixed(1),
      crossEngineMeanDifferenceM: +crossEngineMeanM.toFixed(1),
      crossEngineCoverageWithin35M: +crossEngineCoverage35M.toFixed(3),
      forbiddenTags,
    },
  });
  console.log(route.id, status, `${crossEngineMaxM.toFixed(1)}m`);
}

await writeFile(
  new URL("../route-quality-audit.json", import.meta.url),
  `${JSON.stringify(
    {
      generated: new Date().toISOString(),
      methodology:
        "Existing Valhalla/OSM geometry cross-checked against an independently generated BRouter trekking route. This does not replace field verification.",
      thresholds: {
        maximumCoordinateStepM: 100,
        outAndBackSymmetryM: 8,
        independentRouterMaximumDifferenceM: 35,
        startClosureM: 8,
      },
      routes: results,
    },
    null,
    2,
  )}\n`,
);
