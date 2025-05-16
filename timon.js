let body = $request.body;
console.log("📥 原始请求体:\n" + body);  // 打印原始 JSON 字符串

let json = JSON.parse(body);

const baseLat = 6.5244;
const baseLon = 3.3792;

function randomOffset(meters) {
  const offset = meters / 111320;
  return (Math.random() - 0.5) * 2 * offset;
}

function randomLatLon() {
  const lat = baseLat + randomOffset(500);
  const lon = baseLon + randomOffset(500 / Math.cos(baseLat * Math.PI / 180));
  return { lat, lon };
}

if (json.transits && Array.isArray(json.transits)) {
  for (const t of json.transits) {
    if (t.geo_point) {
      const { lat, lon } = randomLatLon();
      t.geo_point.lat = lat;
      t.geo_point.lon = lon;
    }
  }
}

console.log("🛠️ 修改后请求体:\n" + JSON.stringify(json, null, 2));  // 美化输出

$done({ body: JSON.stringify(json) });
