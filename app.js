const ROUTE_ID = "blackberry";
const PARKING = {
  name: "Blackberry Farm parking",
  lat: 37.3179581,
  lon: -122.0604412,
};
const START = { lat: 37.31772, lon: -122.062212 };
const map = L.map("map", { zoomControl: false, preferCanvas: true });
map.setView([37.38, -122.02], 8);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.DomEvent.disableClickPropagation(document.querySelector("#routes-browser"));
L.DomEvent.disableScrollPropagation(document.querySelector("#routes-browser"));

const baseLayers = {
  outdoor: L.maplibreGL({
    style: "https://tiles.openfreemap.org/styles/liberty",
    attribution: "© OpenStreetMap contributors · OpenFreeMap",
  }),
  street: L.maplibreGL({
    style: "https://tiles.openfreemap.org/styles/bright",
    attribution: "© OpenStreetMap contributors · OpenFreeMap",
  }),
  satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, detectRetina: true, attribution: "Tiles © Esri" },
  ),
};
let activeLayer = baseLayers.outdoor.addTo(map);
const photoLayer = L.layerGroup().addTo(map);
let routeFeature;
let mainRouteLayer;
let adminAuth = sessionStorage.getItem("ride-admin") || "";
let selectedPhoto;
let pendingFile;
let pinHandler;
let selectedRouteId = ROUTE_ID;
const overviewLayers = new Map();
let auditedRoutes = [];
const routeColors = [
  "#ed6943",
  "#236e58",
  "#1677a3",
  "#7451a6",
  "#ca7a20",
  "#b94262",
  "#3d7d43",
  "#675647",
];

const driveDestination = encodeURIComponent(`${PARKING.lat},${PARKING.lon}`);
document.querySelector("#apple-drive").href =
  `https://maps.apple.com/?daddr=${driveDestination}&dirflg=d`;
document.querySelector("#google-drive").href =
  `https://www.google.com/maps/dir/?api=1&destination=${driveDestination}&travelmode=driving`;

function markerIcon(type) {
  const html =
    type === "parking"
      ? '<div class="parking-marker">P</div>'
      : '<div class="route-marker"></div>';
  return L.divIcon({
    className: "",
    html,
    iconSize: type === "parking" ? [26, 26] : [20, 20],
    iconAnchor: type === "parking" ? [13, 13] : [10, 10],
  });
}

async function loadRoute() {
  try {
    const response = await fetch("blackberry-v2.geojson");
    if (!response.ok) throw new Error("route");
    routeFeature = await response.json();
    const line = L.geoJSON(routeFeature, {
      style: { color: "#ed6943", weight: 7, opacity: 0.96 },
    }).addTo(map);
    mainRouteLayer = line;
    if (L.polylineDecorator) {
      L.polylineDecorator(line, {
        patterns: [
          {
            offset: "6%",
            repeat: "10%",
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              polygon: true,
              pathOptions: {
                color: "#fff",
                fillColor: "#123c33",
                fillOpacity: 1,
                weight: 1,
              },
            }),
          },
        ],
      }).addTo(map);
    }
    L.marker([START.lat, START.lon], {
      icon: markerIcon("start"),
      zIndexOffset: 500,
    })
      .addTo(map)
      .bindTooltip("骑行起点 / 终点");
    L.marker([PARKING.lat, PARKING.lon], {
      icon: markerIcon("parking"),
      zIndexOffset: 450,
    })
      .addTo(map)
      .bindTooltip("公共停车区");
    await loadPhotos().catch(() => {
      document.querySelector("#photo-status").textContent =
        "照片服务在本地预览中不可用；线上数据不会受影响。";
    });
  } catch {
    document.querySelector("#network-warning").hidden = false;
    map.setView([START.lat, START.lon], 15);
  }
}

document.querySelectorAll(".map-toolbar button").forEach((button) =>
  button.addEventListener("click", () => {
    map.removeLayer(activeLayer);
    activeLayer = baseLayers[button.dataset.layer].addTo(map);
    document
      .querySelectorAll(".map-toolbar button")
      .forEach((item) => item.classList.toggle("active", item === button));
    document.querySelector("#network-warning").hidden = true;
  }),
);

document.querySelector("#fullscreen").addEventListener("click", async () => {
  const stage = document.querySelector(".map-stage");
  if (stage.requestFullscreen && !document.fullscreenElement) {
    await stage
      .requestFullscreen()
      .catch(() => stage.classList.toggle("pseudo-fullscreen"));
  } else if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    stage.classList.toggle("pseudo-fullscreen");
  }
  setTimeout(() => map.invalidateSize(), 200);
});
document.addEventListener("fullscreenchange", () =>
  setTimeout(() => map.invalidateSize(), 200),
);

const panel = document.querySelector(".route-panel");
const sheetToggle = document.querySelector("#sheet-toggle");
function setSheet(expanded) {
  panel.classList.toggle("expanded", expanded);
  sheetToggle.setAttribute("aria-expanded", String(expanded));
  setTimeout(() => map.invalidateSize(), 350);
}
sheetToggle.addEventListener("click", () => {
  if (selectedRouteId === ROUTE_ID) setSheet(true);
  else setRoutesBrowser(true);
});
document
  .querySelector("#sheet-close")
  .addEventListener("click", () => setSheet(false));

function setRoutesBrowser(open) {
  const browser = document.querySelector("#routes-browser");
  document.body.classList.toggle("routes-browser-open", open);
  browser.classList.toggle("open", open);
  browser.setAttribute("aria-hidden", String(!open));
  browser.inert = !open;
  document
    .querySelector("#routes-open")
    .setAttribute("aria-expanded", String(open));
  if (open) setSheet(false);
}
document
  .querySelector("#routes-open")
  .addEventListener("click", () => setRoutesBrowser(true));
document
  .querySelector("#routes-close")
  .addEventListener("click", () => setRoutesBrowser(false));

function applyOverviewFilters() {
  const area = document.querySelector("#overview-area").value;
  const category = document.querySelector("#overview-distance").value;
  const visibleBounds = L.latLngBounds();
  auditedRoutes.forEach((route) => {
    const visible =
      (area === "all" || route.area === area) &&
      (category === "all" || route.category === category);
    document.querySelector(`[data-overview-route="${route.id}"]`).hidden =
      !visible;
    const layer = overviewLayers.get(route.id);
    if (!layer) return;
    if (visible && !map.hasLayer(layer)) layer.addTo(map);
    if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
    if (visible) visibleBounds.extend(layer.getBounds());
  });
  if (visibleBounds.isValid())
    map.fitBounds(visibleBounds, {
      padding: window.innerWidth < 761 ? [28, 76] : [50, 50],
    });
}

async function loadOverview() {
  const audit = await fetch("routes-audit.json").then((response) =>
    response.json(),
  );
  auditedRoutes = audit.routes;
  document.querySelector("#routes-open b").textContent = auditedRoutes.length;
  const list = document.querySelector("#overview-list");
  list.replaceChildren();
  const allBounds = L.latLngBounds();
  const routeData = await Promise.all(
    auditedRoutes.map(async (route) => ({
      route,
      data: await fetch(route.file).then((response) => {
        if (!response.ok) throw new Error("route data");
        return response.json();
      }),
    })),
  );
  for (const [index, { route, data }] of routeData.entries()) {
    const button = document.createElement("button");
    const verified = route.verification === "map-verified-field-pending";
    button.type = "button";
    button.className = `overview-route${verified ? " verified" : ""}`;
    button.dataset.overviewRoute = route.id;
    button.innerHTML = `<strong>${route.name}</strong><span>${route.area} · ${route.distanceKm} km · ↑ ${route.climbM} m · ${verified ? "地图已核验" : "候选待核验"}</span>`;
    list.append(button);
    allBounds.extend(L.geoJSON(data).getBounds());
    if (route.id === ROUTE_ID) overviewLayers.set(route.id, mainRouteLayer);
    if (route.id !== ROUTE_ID) {
      const layer = L.geoJSON(data, {
        style: { color: routeColors[index], weight: 4, opacity: 0.72 },
      }).addTo(map);
      layer.bindPopup(
        `<b>${route.name}</b><br>${route.distanceKm} km · ↑ ${route.climbM} m<br><small>候选轨迹，权限复核中</small>`,
      );
      overviewLayers.set(route.id, layer);
    }
    button.addEventListener("click", () => {
      selectedRouteId = route.id;
      const layer =
        route.id === ROUTE_ID
          ? routeFeature && L.geoJSON(routeFeature)
          : overviewLayers.get(route.id);
      if (layer) map.fitBounds(layer.getBounds(), { padding: [34, 34] });
      if (route.id !== ROUTE_ID) overviewLayers.get(route.id)?.openPopup();
      overviewLayers.forEach((item, id) =>
        item.setStyle({
          weight: id === route.id ? 7 : 3,
          opacity: id === route.id ? 0.96 : 0.2,
        }),
      );
      document.querySelector("#sheet-toggle b").textContent = route.name;
      document.querySelector("#sheet-toggle small").textContent =
        `${route.distanceKm} km · ↑ ${route.climbM} m · ${verified ? "点按查看详情" : "候选待核验"}`;
      document.querySelector("#route-legend-label").textContent = verified
        ? "完整骑行轨迹"
        : "候选轨迹";
      setRoutesBrowser(false);
      setSheet(false);
    });
  }
  document
    .querySelectorAll(".overview-filters select")
    .forEach((select) =>
      select.addEventListener("change", applyOverviewFilters),
    );
  return allBounds;
}

function safeUrl(url) {
  return encodeURI(url).replaceAll('"', "%22");
}
async function loadPhotos() {
  const response = await fetch(`/api/photos?route=${ROUTE_ID}`);
  if (!response.ok) throw new Error("photos");
  photoLayer.clearLayers();
  const gallery = document.querySelector("#photo-gallery");
  gallery.replaceChildren();
  const photos = await response.json();
  if (!photos.length)
    gallery.innerHTML = '<p class="empty-photos">这条路线还没有公开照片。</p>';
  photos.forEach((photo) => {
    const icon = L.divIcon({
      className: "",
      html: `<img class="photo-marker" src="${safeUrl(photo.url)}" alt="骑行照片">`,
      iconSize: [43, 43],
      iconAnchor: [21, 21],
    });
    L.marker([photo.lat, photo.lon], { icon })
      .addTo(photoLayer)
      .on("click", () => showPhoto(photo));
    const thumb = document.createElement("button");
    thumb.className = "photo-thumb";
    thumb.type = "button";
    thumb.innerHTML = `<img src="${safeUrl(photo.url)}" alt="查看骑行照片">`;
    thumb.addEventListener("click", () => showPhoto(photo));
    gallery.append(thumb);
  });
}

const photoDialog = document.querySelector("#photo-dialog");
function showPhoto(photo) {
  selectedPhoto = photo;
  photoDialog.querySelector("img").src = photo.url;
  photoDialog.querySelector("p").textContent = new Date(
    photo.created,
  ).toLocaleString("zh-CN");
  photoDialog.showModal();
}
photoDialog
  .querySelector(".dialog-close")
  .addEventListener("click", () => photoDialog.close());
photoDialog
  .querySelector(".delete-photo")
  .addEventListener("click", async () => {
    if (!selectedPhoto || !adminAuth || !confirm("确定删除这张云端照片？"))
      return;
    const response = await fetch(`/api/photos?route=${ROUTE_ID}`, {
      method: "DELETE",
      headers: {
        Authorization: adminAuth,
        "x-route": ROUTE_ID,
        "x-photo-url": selectedPhoto.url,
      },
    });
    if (!response.ok) return alert("删除失败，请重新登录。");
    photoDialog.close();
    await loadPhotos();
  });

function authHeader(username, password) {
  return `Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`;
}
const adminDialog = document.querySelector("#admin-dialog");
function setAdminMode(active) {
  document.body.classList.toggle("admin-mode", active);
  document.querySelector("#admin-open").textContent = active
    ? "已进入管理"
    : "管理";
}
setAdminMode(Boolean(adminAuth));
document
  .querySelector("#admin-open")
  .addEventListener("click", () => adminDialog.showModal());
adminDialog
  .querySelector(".dialog-close")
  .addEventListener("click", () => adminDialog.close());
document
  .querySelector("#admin-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const auth = authHeader(data.get("username"), data.get("password"));
    const status = document.querySelector("#admin-status");
    status.textContent = "正在验证…";
    const response = await fetch("/api/admin", {
      headers: { Authorization: auth },
    }).catch(() => null);
    if (!response?.ok) return (status.textContent = "用户名或密码不正确。");
    adminAuth = auth;
    sessionStorage.setItem("ride-admin", auth);
    setAdminMode(true);
    adminDialog.close();
  });

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(source);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("compress"))),
        "image/webp",
        0.82,
      );
    };
    image.onerror = reject;
    image.src = source;
  });
}

async function uploadOne(file, gps) {
  const blob = await compressPhoto(file);
  const response = await fetch("/api/photos", {
    method: "POST",
    body: blob,
    headers: {
      Authorization: adminAuth,
      "content-type": "image/webp",
      "x-route": ROUTE_ID,
      "x-lat": String(gps.latitude),
      "x-lon": String(gps.longitude),
    },
  });
  if (!response.ok) throw new Error("upload");
}

function chooseManualPosition(file) {
  pendingFile = file;
  return new Promise((resolve, reject) => {
    const dialog = document.querySelector("#manual-dialog");
    document.querySelector("#manual-cancel").onclick = () => {
      dialog.close();
      pendingFile = null;
      reject(new Error("cancelled"));
    };
    document.querySelector("#manual-choose").onclick = () => {
      dialog.close();
      setSheet(false);
      document.querySelector("#map").classList.add("manual-pin");
      document.querySelector("#photo-status").textContent =
        "请在地图上点选照片位置…";
      pinHandler = (event) => {
        map.off("click", pinHandler);
        document.querySelector("#map").classList.remove("manual-pin");
        pendingFile = null;
        resolve({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      };
      map.once("click", pinHandler);
    };
    dialog.showModal();
  });
}

document
  .querySelector("#photo-input")
  .addEventListener("change", async (event) => {
    const files = [...event.target.files];
    const status = document.querySelector("#photo-status");
    let uploaded = 0,
      failed = 0;
    for (let index = 0; index < files.length; index++) {
      try {
        status.textContent = `正在处理 ${index + 1}/${files.length}：读取 GPS…`;
        let gps = await exifr.gps(files[index]);
        if (!Number.isFinite(gps?.latitude) || !Number.isFinite(gps?.longitude))
          gps = await chooseManualPosition(files[index]);
        status.textContent = `正在上传 ${index + 1}/${files.length}…`;
        await uploadOne(files[index], gps);
        uploaded++;
      } catch (error) {
        if (error.message !== "cancelled") failed++;
      }
    }
    status.textContent = [
      `成功 ${uploaded} 张`,
      failed ? `失败 ${failed} 张` : "",
    ]
      .filter(Boolean)
      .join("；");
    event.target.value = "";
    await loadPhotos();
  });

window.addEventListener("online", () => {
  document.querySelector("#network-warning").hidden = true;
});
window.addEventListener("offline", () => {
  document.querySelector("#network-warning").hidden = false;
});
window.addEventListener("resize", () => map.invalidateSize());
loadRoute()
  .then(() => loadOverview())
  .then((bounds) =>
    map.fitBounds(bounds, {
      padding: window.innerWidth < 761 ? [28, 90] : [50, 50],
    }),
  )
  .catch(() => {
    document.querySelector("#network-warning").hidden = false;
  });
