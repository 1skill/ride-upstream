const ROUTE_ID = "blackberry";
const STATE_KEY = "ride-mobile-state-v1";
const savedState = (() => {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
  } catch {
    return {};
  }
})();
function saveState(patch) {
  let current = {};
  try {
    current = JSON.parse(localStorage.getItem(STATE_KEY)) || {};
  } catch {}
  localStorage.setItem(STATE_KEY, JSON.stringify({ ...current, ...patch }));
}
const START = { lat: 37.317705, lon: -122.060421 };
const map = L.map("map", { zoomControl: false, preferCanvas: true });
map.setView([37.38, -122.02], 8);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.DomEvent.disableClickPropagation(document.querySelector("#routes-browser"));
L.DomEvent.disableScrollPropagation(document.querySelector("#routes-browser"));

const baseLayers = {
  outdoor: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      detectRetina: true,
      attribution: "Tiles © Esri",
    },
  ),
  street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    detectRetina: true,
    attribution: "© OpenStreetMap contributors",
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
let mainRouteDecorator;
let adminAuth = sessionStorage.getItem("ride-admin") || "";
let selectedPhoto;
let pendingFile;
let pinHandler;
let selectedRouteId = null;
let locationMarker;
let locationAccuracy;
let wakeLock;
let didRestoreState = false;
const overviewLayers = new Map();
const overviewDecorators = new Map();
const routeSelectors = new Map();
const selectionMarkers = L.layerGroup().addTo(map);
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
function routeMetrics(route) {
  const climb = Number.isFinite(route.climbM)
    ? `↑ ${route.climbM} m`
    : "爬升待实骑";
  return `${route.distanceKm} km · ${climb}`;
}
function fitRouteLayer(layer) {
  if (window.innerWidth < 761)
    map.fitBounds(layer.getBounds(), {
      paddingTopLeft: [28, 170],
      paddingBottomRight: [28, 150],
    });
  else map.fitBounds(layer.getBounds(), { padding: [50, 50] });
}

function setLinkState(link, href, label) {
  link.textContent = label;
  link.classList.toggle("disabled", !href);
  link.setAttribute("aria-disabled", String(!href));
  if (href) link.href = href;
  else link.removeAttribute("href");
}

function routeEndpoints(data) {
  const coordinates = data.features[0].geometry.coordinates;
  const midpoint = Math.floor((coordinates.length - 1) / 2);
  return {
    start: coordinates[0],
    turnaround: coordinates[midpoint],
  };
}

function routeDuration(distanceKm) {
  const minutes = Math.max(10, Math.round((distanceKm / 15) * 60 / 5) * 5);
  return `${minutes}–${minutes + Math.max(5, Math.round(minutes * 0.2 / 5) * 5)}`;
}

function routeDifficulty(route) {
  if ((route.climbM || 0) > 300 || route.distanceKm >= 50) return "挑战";
  if ((route.climbM || 0) > 120 || route.distanceKm >= 20) return "适中";
  return "轻松";
}

function updateRouteDetails(route, data) {
  const { start, turnaround } = routeEndpoints(data);
  const parkingVerified = route.parking && !route.parking.unverified;
  const destination = parkingVerified
    ? encodeURIComponent(`${route.parking.lat},${route.parking.lon}`)
    : null;
  const apple = destination
    ? `https://maps.apple.com/?daddr=${destination}&dirflg=d`
    : null;
  const google = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    : null;
  setLinkState(document.querySelector("#apple-drive"), apple, parkingVerified ? "Apple Maps 驾车" : "停车点待核验");
  setLinkState(document.querySelector("#google-drive"), google, parkingVerified ? "Google Maps 驾车" : "停车点待核验");
  const mobileApple = document.querySelector("#mobile-apple-drive");
  const mobileGoogle = document.querySelector("#mobile-google-drive");
  mobileApple.innerHTML = `<i class="ri-parking-box-line" aria-hidden="true"></i>${parkingVerified ? "Apple 停车" : "停车待核验"}`;
  mobileGoogle.innerHTML = `<i class="ri-car-line" aria-hidden="true"></i>${parkingVerified ? "Google 停车" : "停车待核验"}`;
  setLinkState(mobileApple, apple, mobileApple.textContent);
  setLinkState(mobileGoogle, google, mobileGoogle.textContent);
  document.querySelector("#detail-gpx").href = route.gpx;
  document.querySelector("#mobile-gpx").href = route.gpx;
  document.querySelector("#detail-kicker").textContent = `${route.area.toUpperCase()} · 往返线`;
  document.querySelector("#detail-title").textContent = route.name;
  document.querySelector("#map").setAttribute("aria-label", `${route.name} 完整骑行轨迹`);
  document.querySelector("#detail-description").textContent =
    `沿已核对的道路级骑行轨迹前往折返点，再沿同一路线返回。全程 ${route.distanceKm} 公里，当前状态为地图核验完成、待实骑确认。`;
  document.querySelector("#distance").textContent = route.distanceKm;
  document.querySelector("#climb").textContent = Number.isFinite(route.climbM) ? route.climbM : "—";
  document.querySelector("#duration").textContent = routeDuration(route.distanceKm);
  document.querySelector("#difficulty").textContent = routeDifficulty(route);
  document.querySelector("#detail-start").textContent = `${start[1].toFixed(5)}, ${start[0].toFixed(5)}`;
  document.querySelector("#detail-parking").textContent = parkingVerified
    ? route.parking.name
    : "合法停车位置尚未现场确认；请自行核对现场标志，驾车导航暂不开放";
  document.querySelector("#detail-surface").textContent = "道路级往返轨迹；到蓝色折返点后沿原路返回";
  document.querySelector("#detail-review-note").textContent = route.reviewNote;
  document.querySelector("#photos-section").hidden = route.id !== ROUTE_ID;
  const summary = document.querySelector(".ride-route-summary");
  summary.querySelector("strong").textContent = route.name;
  summary.querySelector("span").textContent = `${routeMetrics(route)} · 地图已核验`;
  selectionMarkers.clearLayers();
  L.marker([start[1], start[0]], { icon: markerIcon("start"), zIndexOffset: 500 })
    .addTo(selectionMarkers)
    .bindTooltip("骑行起点 / 终点");
  L.marker([turnaround[1], turnaround[0]], { icon: markerIcon("turnaround"), zIndexOffset: 480 })
    .addTo(selectionMarkers)
    .bindTooltip("折返点 · 沿原路返回");
  if (parkingVerified)
    L.marker([route.parking.lat, route.parking.lon], { icon: markerIcon("parking"), zIndexOffset: 450 })
      .addTo(selectionMarkers)
      .bindTooltip("已核对停车点");
}

function markerIcon(type) {
  const html =
    type === "parking"
      ? '<div class="parking-marker">P</div>'
      : type === "turnaround"
        ? '<div class="turnaround-marker">↩</div>'
      : '<div class="route-marker"></div>';
  return L.divIcon({
    className: "",
    html,
    iconSize: type === "parking" ? [26, 26] : [20, 20],
    iconAnchor: type === "parking" ? [13, 13] : [10, 10],
  });
}

function directionDecorator(layer, color) {
  if (!L.polylineDecorator) return null;
  const decorators = L.layerGroup();
  const addArrows = (line) =>
    decorators.addLayer(
      L.polylineDecorator(line, {
        patterns: [
          {
            offset: "8%",
            repeat: "14%",
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              polygon: true,
              pathOptions: {
                color: "#fff",
                fillColor: color,
                fillOpacity: 1,
                opacity: 1,
                weight: 1.5,
              },
            }),
          },
        ],
      }),
    );
  if (layer.eachLayer) layer.eachLayer(addArrows);
  else addArrows(layer);
  return decorators;
}

function outboundDirectionLayer(data) {
  const coordinates = data.features[0].geometry.coordinates;
  const midpoint = Math.floor((coordinates.length - 1) / 2);
  return L.polyline(
    coordinates.slice(0, midpoint + 1).map(([lon, lat]) => [lat, lon]),
  );
}

async function loadRoute() {
  try {
    const auditResponse = await fetch("routes-audit.json", { cache: "no-store" });
    if (!auditResponse.ok) throw new Error("audit");
    const audit = await auditResponse.json();
    auditedRoutes = audit.routes;
    const routeAudit = auditedRoutes.find((route) => route.id === ROUTE_ID);
    if (!routeAudit || routeAudit.mapStatus?.startsWith("hidden-invalid")) {
      map.setView([START.lat, START.lon], 12);
      await loadPhotos().catch(() => {});
      return;
    }
    const response = await fetch("blackberry-v2.geojson");
    if (!response.ok) throw new Error("route");
    routeFeature = await response.json();
    const line = L.geoJSON(routeFeature, {
      style: { color: "#ed6943", weight: 7, opacity: 0.96 },
    }).addTo(map);
    mainRouteLayer = line;
    mainRouteDecorator = directionDecorator(
      outboundDirectionLayer(routeFeature),
      "#123c33",
    );
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
  document.querySelector(".map-stage").inert = expanded;
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
document
  .querySelector("#mobile-filter-open")
  .addEventListener("click", () => setRoutesBrowser(true));

function setMobileMode(mode) {
  const selectedRoute = auditedRoutes.find((route) => route.id === selectedRouteId);
  if (mode === "ride" && !selectedRoute) return;
  document.body.classList.toggle("ride-mode", mode === "ride");
  saveState({ mode, selectedRouteId });
  document
    .querySelectorAll("[data-mobile-mode]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.mobileMode === mode),
    );
  if (mode === "ride") {
    map.closePopup();
    overviewLayers.forEach((layer, id) => {
      if (id !== selectedRouteId && map.hasLayer(layer)) map.removeLayer(layer);
    });
    overviewDecorators.forEach((layer, id) => {
      if (id !== selectedRouteId && map.hasLayer(layer)) map.removeLayer(layer);
    });
    const selectedLayer = overviewLayers.get(selectedRouteId);
    if (selectedLayer) fitRouteLayer(selectedLayer);
  } else {
    document.body.classList.remove("route-focused");
    document.querySelector("#overview-area").value = "all";
    document.querySelector("#overview-distance").value = "all";
    overviewLayers.forEach((layer) =>
      layer.setStyle({ weight: 4, opacity: 0.72 }),
    );
    document
      .querySelectorAll(".mobile-route-card")
      .forEach((item) => item.classList.remove("selected"));
    document.querySelector("#route-legend-label").textContent = "全部路线";
    map.closePopup();
    applyOverviewFilters();
  }
  setTimeout(() => map.invalidateSize(), 80);
  if (mode === "ride" && navigator.wakeLock?.request)
    navigator.wakeLock
      .request("screen")
      .then((lock) => (wakeLock = lock))
      .catch(() => {});
  if (mode !== "ride" && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
  syncMobileControlA11y();
}
function syncMobileControlA11y() {
  const focused = document.body.classList.contains("route-focused");
  const riding = document.body.classList.contains("ride-mode");
  const showAll = document.querySelector("#show-all-routes");
  const locate = document.querySelector("#locate-me");
  showAll.setAttribute("aria-hidden", String(!focused && !riding));
  showAll.tabIndex = focused || riding ? 0 : -1;
  locate.setAttribute("aria-hidden", String(!riding));
  locate.tabIndex = riding ? 0 : -1;
  document
    .querySelector(".ride-action-bar")
    .setAttribute("aria-hidden", String(!riding));
  document
    .querySelector(".ride-route-summary")
    .setAttribute("aria-hidden", String(!riding));
}
function showAllRoutes() {
  selectedRouteId = null;
  saveState({
    mode: "explore",
    selectedRouteId: null,
    area: "all",
    category: "all",
  });
  setMobileMode("explore");
  selectionMarkers.clearLayers();
}
document
  .querySelector("#show-all-routes")
  .addEventListener("click", showAllRoutes);
document
  .querySelectorAll("[data-mobile-mode]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setMobileMode(button.dataset.mobileMode),
    ),
  );

function applyOverviewFilters() {
  const area = document.querySelector("#overview-area").value;
  const category = document.querySelector("#overview-distance").value;
  saveState({
    mode: document.body.classList.contains("ride-mode") ? "ride" : "explore",
    selectedRouteId,
    area,
    category,
  });
  const visibleBounds = L.latLngBounds();
  auditedRoutes.forEach((route) => {
    const visible =
      (area === "all" || route.area === area) &&
      (category === "all" || route.category === category);
    document.querySelector(`[data-overview-route="${route.id}"]`).hidden =
      !visible;
    const layer = overviewLayers.get(route.id);
    const decorator = overviewDecorators.get(route.id);
    if (!layer) return;
    if (visible && !map.hasLayer(layer)) layer.addTo(map);
    if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
    const showDecorator = visible && selectedRouteId === route.id;
    if (decorator && showDecorator && !map.hasLayer(decorator)) decorator.addTo(map);
    if (decorator && !showDecorator && map.hasLayer(decorator))
      map.removeLayer(decorator);
    if (visible) visibleBounds.extend(layer.getBounds());
  });
  if (visibleBounds.isValid())
    map.fitBounds(visibleBounds, {
      padding: window.innerWidth < 761 ? [28, 76] : [50, 50],
    });
}

async function loadOverview() {
  if (!auditedRoutes.length) {
    const audit = await fetch("routes-audit.json", { cache: "no-store" }).then(
      (response) => response.json(),
    );
    auditedRoutes = audit.routes;
  }
  document.querySelector("#routes-open b").textContent = auditedRoutes.length;
  const list = document.querySelector("#overview-list");
  const carousel = document.querySelector("#mobile-route-carousel");
  list.replaceChildren();
  carousel.replaceChildren();
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
    const invalid = route.mapStatus?.startsWith("hidden-invalid");
    const published = verified && !invalid;
    button.type = "button";
    button.className = `overview-route${verified ? " verified" : ""}${invalid ? " invalid" : ""}`;
    button.dataset.overviewRoute = route.id;
    button.disabled = !published;
    button.innerHTML = `<strong>${route.name}</strong><span>${published ? `${route.area} · ${routeMetrics(route)} · 地图已核验` : `${route.area} · ${invalid ? "异常轨迹已隐藏" : "候选数据复核中"}`}</span>`;
    list.append(button);
    const card = document.createElement("article");
    card.className = `mobile-route-card${published ? " verified" : " invalid"}`;
    card.dataset.carouselRoute = route.id;
    card.innerHTML = `<button class="route-card-main" type="button" aria-label="选择 ${route.name}" ${published ? "" : "disabled"}><span class="route-card-status">${published ? "已核验" : invalid ? "已隐藏" : "复核中"}</span><strong>${route.name}</strong><span>${published ? `${route.area} · ${routeMetrics(route)}` : `${route.area} · 距离与爬升待复核`}</span><small>${published ? "可查看完整轨迹与 GPX" : invalid ? "异常轨迹已撤下，等待重建" : "详细轨迹暂停展示"}</small></button>${published ? '<button class="route-card-details" type="button">详情</button>' : ""}`;
    carousel.append(card);
    if (published) allBounds.extend(L.geoJSON(data).getBounds());
    if (route.id === ROUTE_ID) {
      overviewLayers.set(route.id, mainRouteLayer);
      if (mainRouteDecorator)
        overviewDecorators.set(route.id, mainRouteDecorator);
    }
    if (route.id !== ROUTE_ID && published) {
      const layer = L.geoJSON(data, {
        style: { color: routeColors[index], weight: 4, opacity: 0.72 },
      }).addTo(map);
      layer.bindPopup(
        `<b>${route.name}</b><br>${routeMetrics(route)}<br><small>地图已核验 · 待实骑复核</small>`,
      );
      overviewLayers.set(route.id, layer);
      const decorator = directionDecorator(
        outboundDirectionLayer(data),
        routeColors[index],
      );
      if (decorator) overviewDecorators.set(route.id, decorator);
    }
    const selectRoute = () => {
      selectedRouteId = route.id;
      document.body.classList.add("route-focused");
      saveState({ selectedRouteId: route.id });
      const layer =
        route.id === ROUTE_ID
          ? routeFeature && L.geoJSON(routeFeature)
          : overviewLayers.get(route.id);
      if (layer) fitRouteLayer(layer);
      if (route.id !== ROUTE_ID) overviewLayers.get(route.id)?.openPopup();
      else map.closePopup();
      overviewLayers.forEach((item, id) =>
        item.setStyle({
          weight: id === route.id ? 7 : 3,
          opacity: id === route.id ? 0.96 : 0.2,
        }),
      );
      overviewDecorators.forEach((item, id) => {
        if (id === route.id && !map.hasLayer(item)) item.addTo(map);
        if (id !== route.id && map.hasLayer(item)) map.removeLayer(item);
      });
      document.querySelector("#sheet-toggle b").textContent = route.name;
      document.querySelector("#sheet-toggle small").textContent =
        `${routeMetrics(route)} · ${verified ? "点按查看详情" : "候选待核验"}`;
      document.querySelector("#route-legend-label").textContent = verified
        ? "完整骑行轨迹"
        : "候选轨迹";
      updateRouteDetails(route, data);
      document
        .querySelectorAll(".mobile-route-card")
        .forEach((item) =>
          item.classList.toggle(
            "selected",
            item.dataset.carouselRoute === route.id,
          ),
        );
      document
        .querySelector('[data-mobile-mode="ride"]')
        .toggleAttribute("disabled", !verified);
      setRoutesBrowser(false);
      setSheet(false);
      syncMobileControlA11y();
    };
    if (published) {
      button.addEventListener("click", selectRoute);
      routeSelectors.set(route.id, selectRoute);
      overviewLayers.get(route.id)?.on("click", selectRoute);
      card
        .querySelector(".route-card-main")
        .addEventListener("click", selectRoute);
    }
    card
      .querySelector(".route-card-details")
      ?.addEventListener("click", () => {
        selectRoute();
        setSheet(true);
      });
  }
  syncMobileControlA11y();
  document
    .querySelectorAll(".overview-filters select")
    .forEach((select) =>
      select.addEventListener("change", applyOverviewFilters),
    );
  if (savedState.area)
    document.querySelector("#overview-area").value = savedState.area;
  if (savedState.category)
    document.querySelector("#overview-distance").value = savedState.category;
  if (
    savedState.selectedRouteId &&
    routeSelectors.has(savedState.selectedRouteId)
  ) {
    routeSelectors.get(savedState.selectedRouteId)();
    didRestoreState = true;
  }
  if (savedState.mode === "ride" && selectedRouteId)
    setMobileMode("ride");
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
function resetMobileViewport() {
  document.activeElement?.blur();
  requestAnimationFrame(() => map.invalidateSize());
}
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
adminDialog.addEventListener("close", resetMobileViewport);
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
document.querySelector("#locate-me").addEventListener("click", () => {
  const button = document.querySelector("#locate-me");
  button.classList.add("locating");
  button.querySelector("span").textContent = "定位中";
  map.locate({ enableHighAccuracy: true, setView: true, maxZoom: 17 });
});
map.on("locationfound", (event) => {
  if (!locationMarker)
    locationMarker = L.circleMarker(event.latlng, {
      radius: 8,
      color: "#fff",
      weight: 3,
      fillColor: "#2678e8",
      fillOpacity: 1,
    }).addTo(map);
  else locationMarker.setLatLng(event.latlng);
  if (!locationAccuracy)
    locationAccuracy = L.circle(event.latlng, {
      radius: event.accuracy,
      color: "#2678e8",
      weight: 1,
      fillOpacity: 0.08,
    }).addTo(map);
  else locationAccuracy.setLatLng(event.latlng).setRadius(event.accuracy);
  const button = document.querySelector("#locate-me");
  button.classList.remove("locating");
  button.querySelector("span").textContent = "我的位置";
});
map.on("locationerror", () => {
  const button = document.querySelector("#locate-me");
  button.classList.remove("locating");
  button.querySelector("span").textContent = "定位失败";
});
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    document.body.classList.contains("ride-mode") &&
    navigator.wakeLock?.request &&
    (!wakeLock || wakeLock.released)
  ) {
    navigator.wakeLock
      .request("screen")
      .then((lock) => (wakeLock = lock))
      .catch(() => {});
  }
});
map.on("zoomend", () => {
  const showArrows = map.getZoom() >= 9;
  const focusedRoute = document.querySelector(".mobile-route-card.selected")
    ?.dataset.carouselRoute;
  overviewDecorators.forEach((decorator, id) => {
    const routeVisible = map.hasLayer(overviewLayers.get(id));
    const arrowVisible =
      showArrows && routeVisible && focusedRoute === id;
    if (arrowVisible && !map.hasLayer(decorator)) decorator.addTo(map);
    if (!arrowVisible && map.hasLayer(decorator)) map.removeLayer(decorator);
  });
});
window.addEventListener("resize", () => map.invalidateSize());
loadRoute()
  .then(() => loadOverview())
  .then((bounds) => {
    if (!didRestoreState && bounds.isValid())
      map.fitBounds(bounds, {
        padding: window.innerWidth < 761 ? [28, 90] : [50, 50],
      });
  })
  .catch(() => {
    document.querySelector("#network-warning").hidden = false;
  });
