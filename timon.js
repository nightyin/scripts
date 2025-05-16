let body = $request.body;
console.log("📥 原始请求体:\n" + body);

let json = JSON.parse(body);

// 固定尼日利亚拉各斯附近坐标整数部分
const baseLatInt = 6;
const baseLonInt = 3;

function randomFraction(digits = 6) {
  return parseFloat(Math.random().toFixed(digits));
}

function randomLatLon() {
  const lat = baseLatInt + randomFraction(6);
  const lon = baseLonInt + randomFraction(6);
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

console.log("🛠️ 修改后请求体:\n" + JSON.stringify(json, null, 2));

$done({ body: JSON.stringify(json) });
