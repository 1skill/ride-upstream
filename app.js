const HOME = { name: "20020 Rodrigues Ave, Cupertino", lat: 37.320471, lon: -122.024028 };
const ROUTES = [
  {id:"regnart",area:"cupertino",place:"Cupertino · 日常",name:"Regnart Creek 环线",distance:9,climb:55,time:"35–45 分",difficulty:"easy",level:"轻松",start:HOME,drive:false,tags:"daily",summary:"溪边、公园与安静住宅区串成的下班后环线，路程短、转弯少。",surface:"铺装路面与骑行道；机动车少。",waypoints:[[37.31692,-122.015625],[37.320662,-122.019779]]},
  {id:"blackberry",area:"cupertino",place:"Cupertino · 日常",name:"Blackberry Farm 自然线",distance:11,climb:70,time:"45–55 分",difficulty:"easy",level:"轻松",start:HOME,drive:false,tags:"daily",summary:"沿 McClellan 隔离车道进入自然保护区，在树荫与溪流边完成一圈。",surface:"以铺装路为主；Nature Trail 土路禁止骑车，请遵守现场标识。",waypoints:[[37.313493,-122.063536],[37.31402,-122.063287]]},
  {id:"apple",area:"cupertino",place:"Cupertino · 日常",name:"Apple Park 环线",distance:7,climb:38,time:"20–30 分",difficulty:"easy",level:"轻松",start:HOME,drive:false,tags:"daily",summary:"一条快速城市环线，经过 Apple Park Visitor Center 与 Portal Park。",surface:"铺装自行车道；避开工作日通勤高峰。",waypoints:[[37.322961,-122.007739],[37.323059,-122.008659]]},
  {id:"mary",area:"cupertino",place:"Cupertino · 日常",name:"Lawson–Mary Bridge 环线",distance:13,climb:85,time:"50–65 分",difficulty:"easy",level:"轻松",start:HOME,drive:false,tags:"daily",summary:"穿过公园与校园区，骑上 Mary Avenue 自行车桥后回家。",surface:"住宅区与独立骑行桥；过街处注意右转车辆。",waypoints:[[37.326726,-122.027664],[37.335616,-122.050621]]},
  {id:"los-gatos-creek",area:"south-bay",place:"南湾 · 中距离",name:"Los Gatos Creek 绿廊",distance:29,climb:190,time:"1.5–2 小时",difficulty:"moderate",level:"适中",start:{name:"Vasona Lake County Park",lat:37.2355,lon:-121.9624},drive:true,tags:"medium",summary:"从 Vasona Lake 沿溪谷北上，串联 Campbell 与 Willow Glen 的连续绿道。",surface:"大部分为铺装多用途路径；公园人多时减速让行。",waypoints:[[37.2572,-121.9674],[37.2792,-121.9501],[37.2955,-121.9307],[37.323,-121.9401],[37.2792,-121.9501]]},
  {id:"coyote-creek",area:"south-bay",place:"南湾 · 长途",name:"Coyote Creek 远行",distance:95,climb:430,time:"4.5–6 小时",difficulty:"hard",level:"挑战",start:{name:"Hellyer County Park",lat:37.2446,lon:-121.8307},drive:true,tags:"long",summary:"沿 Coyote Creek 的长距离往返，城市逐渐退到身后，进入开阔河谷。",surface:"铺装绿道为主；补给点间隔长，炎热天气务必带足水。",waypoints:[[37.2147,-121.8095],[37.1753,-121.744],[37.1305,-121.6548],[37.0887,-121.6135],[37.1305,-121.6548],[37.1753,-121.744]]},
  {id:"sawyer-camp",area:"peninsula",place:"半岛 · 中距离",name:"Sawyer Camp 水库线",distance:34,climb:360,time:"2–2.5 小时",difficulty:"moderate",level:"适中",start:{name:"Sawyer Camp Trail South Entrance",lat:37.5312,lon:-122.3647},drive:true,tags:"medium",summary:"沿 Crystal Springs 水库边缘穿过林荫与开阔水景，是半岛最稳定的无车路线之一。",surface:"铺装多用途路径；周末行人密集，弯道控制速度。",waypoints:[[37.5601,-122.3874],[37.5904,-122.4137],[37.6119,-122.423],[37.5904,-122.4137]]},
  {id:"portola-loop",area:"peninsula",place:"半岛 · 中距离",name:"Woodside–Portola 环线",distance:29,climb:520,time:"2–2.5 小时",difficulty:"hard",level:"挑战",start:{name:"Woodside Town Hall",lat:37.4426,lon:-122.2279},drive:true,tags:"medium",summary:"从 Woodside 进入 Portola Valley 的起伏乡间公路，短而有足够爬升。",surface:"全铺装公路；部分路段无独立车道，建议非高峰时段骑行。",waypoints:[[37.3867,-122.2388],[37.373,-122.2082],[37.3836,-122.1782],[37.4255,-122.1987]]},
  {id:"west-cliff",area:"santa-cruz",place:"Santa Cruz · 中距离",name:"West Cliff–Capitola 海岸线",distance:33,climb:280,time:"2–2.5 小时",difficulty:"moderate",level:"适中",start:{name:"Depot Park, Santa Cruz",lat:36.9646,lon:-122.0231},drive:true,tags:"medium",summary:"先沿 West Cliff 看海，再向东穿过港口到 Capitola，回程重新进入 Santa Cruz。",surface:"海岸骑行道与城市街道混合；景区路段行人多。",waypoints:[[36.9502,-122.0475],[36.9546,-122.0579],[36.9608,-122.0811],[36.9502,-122.0475],[36.9735,-121.9528]]},
  {id:"wilder-ranch",area:"santa-cruz",place:"Santa Cruz · 中距离",name:"Wilder Ranch 北海岸",distance:39,climb:590,time:"2.5–3.5 小时",difficulty:"hard",level:"挑战",start:{name:"Wilder Ranch State Park",lat:36.9608,lon:-122.0811},drive:true,tags:"medium",summary:"沿北海岸向 Davenport 延伸，海崖、农田与太平洋风景贯穿全程。",surface:"以铺装公路为主；CA-1 路肩骑行，强风或能见度差时不建议出发。",waypoints:[[36.9774,-122.1266],[37.015,-122.1937],[37.0461,-122.2264],[37.015,-122.1937]]},
  {id:"alameda-loop",area:"east-bay",place:"东湾 · 中距离",name:"Alameda 岛屿环线",distance:42,climb:160,time:"2–3 小时",difficulty:"easy",level:"轻松",start:{name:"Alameda Seaplane Lagoon Ferry Terminal",lat:37.7716,lon:-122.2797},drive:true,tags:"medium",summary:"贴着 Alameda 岛岸线完成开阔平坦的一圈，远眺旧金山与东湾港区。",surface:"铺装道路与 Bay Trail；港区路口注意大型车辆。",waypoints:[[37.7863,-122.3067],[37.769,-122.3292],[37.7412,-122.318],[37.7324,-122.2476]]},
  {id:"iron-horse",area:"east-bay",place:"东湾 · 长途",name:"Iron Horse Trail 纵走",distance:61,climb:390,time:"3.5–4.5 小时",difficulty:"moderate",level:"适中",start:{name:"Dublin/Pleasanton BART",lat:37.7067,lon:-121.9383},drive:true,tags:"long",summary:"从 Dublin 一路向北穿过 San Ramon 与 Walnut Creek，长距离但坡度温和。",surface:"大部分为铺装多用途路径；穿越市区道路时按信号灯通行。",waypoints:[[37.7624,-121.9535],[37.8079,-121.9942],[37.8783,-122.0702],[37.9014,-122.0617],[37.8783,-122.0702]]}
];

const maps = new Map();
const routeData = new Map();
const photoLayers = new Map();
let adminAuth = sessionStorage.getItem("ride-admin") || "";
let selectedPhoto = null;

const areaLabels = {cupertino:"Cupertino", "south-bay":"南湾", peninsula:"半岛", "santa-cruz":"Santa Cruz", "east-bay":"东湾"};
const routeList = document.querySelector("#route-list");
const template = document.querySelector("#route-template");

function mapsUrl(route, provider, driving = false) {
  const start = driving ? HOME : route.start;
  const end = route.start;
  if (provider === "apple") {
    const params = new URLSearchParams({saddr:`${start.lat},${start.lon}`,daddr:`${end.lat},${end.lon}`,dirflg:driving?"d":"b"});
    if (!driving) params.set("waypoints", route.waypoints.map(([lat,lon]) => `${lat},${lon}`).join("|"));
    return `https://maps.apple.com/?${params}`;
  }
  const params = new URLSearchParams({api:"1",origin:`${start.lat},${start.lon}`,destination:`${end.lat},${end.lon}`,travelmode:driving?"driving":"bicycling"});
  if (!driving) params.set("waypoints", route.waypoints.map(([lat,lon]) => `${lat},${lon}`).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

function renderRoutes() {
  ROUTES.forEach((route, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.id = `route-${route.id}`; node.dataset.area = route.area; node.dataset.length = route.tags; node.dataset.difficulty = route.difficulty;
    node.querySelector(".route-index").textContent = String(index + 1).padStart(2,"0");
    node.querySelector(".route-place").textContent = route.place; node.querySelector("h2").textContent = route.name; node.querySelector(".route-summary").textContent = route.summary;
    node.querySelector(".metric-distance").textContent = route.distance; node.querySelector(".metric-climb").textContent = route.climb; node.querySelector(".metric-time").textContent = route.time; node.querySelector(".metric-level").textContent = route.level;
    node.querySelector(".start-note").textContent = route.drive ? `先开车到：${route.start.name}；抵达后再开始骑行。` : `从家门口直接开始骑行：${route.start.name}。`;
    node.querySelector(".surface-note").textContent = route.surface;
    const drive = node.querySelector(".drive-link");
    if (route.drive) drive.href = mapsUrl(route,"google",true); else { drive.textContent = "无需开车 · 从家出发"; drive.removeAttribute("href"); drive.setAttribute("aria-disabled","true"); }
    node.querySelector(".apple-link").href = mapsUrl(route,"apple"); node.querySelector(".google-link").href = mapsUrl(route,"google");
    node.querySelector(".gpx-button").addEventListener("click",() => downloadGpx(route));
    const map = node.querySelector(".map"); map.id = `map-${route.id}`; map.setAttribute("aria-label",`${route.name}道路级地图`);
    const input = node.querySelector(".photo-input"); input.dataset.route = route.id; input.addEventListener("change",() => uploadFiles(route,node,input));
    routeList.append(node);
  });
}

async function initMap(route) {
  if (maps.has(route.id)) return;
  const map = L.map(`map-${route.id}`,{zoomControl:false,scrollWheelZoom:false});
  L.control.zoom({position:"bottomright"}).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
  maps.set(route.id,map);
  try {
    const data = await fetch(`${route.id}.geojson`).then(response => { if(!response.ok) throw new Error("route"); return response.json(); });
    routeData.set(route.id,data);
    const line = L.geoJSON(data,{style:{color:"#f06a3a",weight:6,opacity:.94}}).addTo(map);
    if (L.polylineDecorator) L.polylineDecorator(line,{patterns:[{offset:"8%",repeat:"16%",symbol:L.Symbol.arrowHead({pixelSize:9,polygon:true,pathOptions:{color:"#fff",fillColor:"#0c362e",fillOpacity:1,weight:1}})}]}).addTo(map);
    const icon = L.divIcon({className:"",html:`<div class="${route.drive?"start":"home"}-marker"></div>`,iconSize:[18,18],iconAnchor:[9,9]});
    L.marker([route.start.lat,route.start.lon],{icon}).addTo(map).bindTooltip(route.drive?"骑行起点":"从家出发");
    const photos = L.layerGroup().addTo(map); photoLayers.set(route.id,photos);
    map.fitBounds(line.getBounds(),{padding:[24,24]});
    await loadPhotos(route).catch(() => {});
  } catch { document.querySelector(`#route-${route.id} .photo-status`).textContent = "地图暂时无法载入，导航与 GPX 仍可使用。"; }
}

function observeMaps() {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { const route = ROUTES.find(item => `map-${item.id}` === entry.target.id); if(route) initMap(route); observer.unobserve(entry.target); } }),{rootMargin:"400px"});
  document.querySelectorAll(".map").forEach(map => observer.observe(map));
}

async function loadPhotos(route) {
  const response = await fetch(`/api/photos?route=${encodeURIComponent(route.id)}`);
  if (!response.ok) throw new Error("photos");
  (await response.json()).forEach(photo => addPhotoMarker(route,photo));
}

function addPhotoMarker(route,photo) {
  const layer = photoLayers.get(route.id); if (!layer) return;
  const safeUrl = encodeURI(photo.url).replace(/"/g,"%22");
  const icon = L.divIcon({className:"",html:`<img class="photo-marker" src="${safeUrl}" alt="骑行照片">`,iconSize:[42,42],iconAnchor:[21,21]});
  L.marker([photo.lat,photo.lon],{icon}).addTo(layer).on("click",() => showPhoto(route,photo));
}

const photoDialog = document.querySelector("#photo-dialog");
function showPhoto(route,photo) { selectedPhoto={route,photo}; photoDialog.querySelector("img").src=photo.url; photoDialog.querySelector("p").textContent=new Date(photo.created).toLocaleString("zh-CN"); photoDialog.showModal(); }
photoDialog.querySelector(".dialog-close").addEventListener("click",()=>photoDialog.close());
photoDialog.addEventListener("click",event=>{if(event.target===photoDialog) photoDialog.close();});
photoDialog.querySelector(".delete-photo").addEventListener("click",async()=>{
  if(!selectedPhoto || !adminAuth || !confirm("确定删除这张照片？此操作会从云端永久删除。")) return;
  const {route,photo}=selectedPhoto; const response=await fetch(`/api/photos?route=${encodeURIComponent(route.id)}`,{method:"DELETE",headers:{Authorization:adminAuth,"x-route":route.id,"x-photo-url":photo.url}});
  if(!response.ok){alert("删除失败，请重新登录管理模式。");return;}
  photoDialog.close(); photoLayers.get(route.id)?.clearLayers(); await loadPhotos(route);
});

function authHeader(username,password){ return `Basic ${btoa(unescape(encodeURIComponent(`${username}:${password}`)))}`; }
const adminDialog=document.querySelector("#admin-dialog"), adminStatus=document.querySelector("#admin-status");
function setAdminMode(active){document.body.classList.toggle("admin-mode",active);document.querySelector("#admin-open").textContent=active?"已进入管理":"管理";}
setAdminMode(Boolean(adminAuth));
document.querySelector("#admin-open").addEventListener("click",()=>adminDialog.showModal()); adminDialog.querySelector(".dialog-close").addEventListener("click",()=>adminDialog.close());
document.querySelector("#admin-form").addEventListener("submit",async event=>{event.preventDefault(); const data=new FormData(event.currentTarget); const auth=authHeader(data.get("username"),data.get("password")); adminStatus.textContent="正在验证…"; const response=await fetch("/api/admin",{headers:{Authorization:auth}}).catch(()=>null); if(response?.ok){adminAuth=auth;sessionStorage.setItem("ride-admin",auth);setAdminMode(true);adminDialog.close();event.currentTarget.reset();event.currentTarget.elements.username.value="ride";}else{adminStatus.textContent="用户名或密码不正确。";}});

function compressPhoto(file){return new Promise((resolve,reject)=>{const image=new Image(),source=URL.createObjectURL(file);image.onload=()=>{const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(source);canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("compress")),"image/webp",.82)};image.onerror=()=>{URL.revokeObjectURL(source);reject(new Error("decode"))};image.src=source;});}
function currentPosition(){return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000}));}
async function uploadFiles(route,card,input){const files=[...(input.files||[])];if(!files.length||!adminAuth)return;const status=card.querySelector(".photo-status");input.disabled=true;let uploaded=0,missing=0,failed=0,fallback;try{for(let i=0;i<files.length;i++){status.textContent=`正在处理 ${i+1}/${files.length}：读取 GPS…`;try{let gps=await exifr.gps(files[i]);if(!Number.isFinite(gps?.latitude)||!Number.isFinite(gps?.longitude)){missing++;if(!fallback){status.textContent=`第 ${i+1} 张无 GPS，正在获取手机位置…`;const pos=await currentPosition();fallback={latitude:pos.coords.latitude,longitude:pos.coords.longitude};}gps=fallback;}const blob=await compressPhoto(files[i]);status.textContent=`正在上传 ${i+1}/${files.length}…`;const response=await fetch("/api/photos",{method:"POST",body:blob,headers:{Authorization:adminAuth,"content-type":"image/webp","x-route":route.id,"x-lat":String(gps.latitude),"x-lon":String(gps.longitude)}});if(!response.ok)throw new Error("upload");addPhotoMarker(route,await response.json());uploaded++;}catch{failed++;}}status.textContent=[`成功 ${uploaded} 张`,missing?`${missing} 张使用手机位置`:"",failed?`失败 ${failed} 张`:""].filter(Boolean).join("；");}finally{input.disabled=false;input.value="";}}

function downloadGpx(route){const feature=routeData.get(route.id);if(!feature){initMap(route);alert("路线正在载入，请稍后再点一次下载。");return;}const coords=feature.features[0].geometry.coordinates;const points=coords.map(([lon,lat])=>`<trkpt lat="${lat}" lon="${lon}"></trkpt>`).join("");const xml=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Bay Rides" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${route.name}</name></metadata><trk><name>${route.name}</name><trkseg>${points}</trkseg></trk></gpx>`;const url=URL.createObjectURL(new Blob([xml],{type:"application/gpx+xml"}));const link=document.createElement("a");link.href=url;link.download=`${route.id}.gpx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function applyFilters(){const area=document.querySelector("#area-filter").value,length=document.querySelector("#length-filter").value,difficulty=document.querySelector("#difficulty-filter").value;let count=0;document.querySelectorAll(".route-card").forEach(card=>{const visible=(area==="all"||card.dataset.area===area)&&(length==="all"||card.dataset.length===length)&&(difficulty==="all"||card.dataset.difficulty===difficulty);card.hidden=!visible;if(visible){count++;maps.get(card.id.replace("route-",""))?.invalidateSize();}});document.querySelector("#result-count").textContent=`找到 ${count} 条路线 · ${area==="all"?"湾区":areaLabels[area]}`;}
document.querySelectorAll(".filter-grid select").forEach(select=>select.addEventListener("change",applyFilters));

renderRoutes(); applyFilters(); observeMaps();
