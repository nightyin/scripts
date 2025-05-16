let body = $request.body;
console.log("📥 原始请求体:\n" + body);

let json = JSON.parse(body);

const baseLatInt = 6;
const baseLonInt = 3;

// 获取小数位数
function getDecimalPlaces(num) {
  const str = num.toString();
  const parts = str.split(".");
  return parts.length > 1 ? parts[1].length : 0;
}

// 生成固定小数位数的随机数（避免 parseFloat 剪掉）
function randomFractionFixed(digits) {
  const factor = Math.pow(10, digits);
  const rand = Math.floor(Math.random() * factor); // 0 ~ 999999...
  return rand / factor;
}

function generateRandomLatLonWithPrecision(refLat, refLon) {
  const latPrecision = getDecimalPlaces(refLat);
  const lonPrecision = getDecimalPlaces(refLon);

  const lat = baseLatInt + randomFractionFixed(latPrecision);
  const lon = baseLonInt + randomFractionFixed(lonPrecision);

  return { lat, lon };
}

if (json.transits && Array.isArray(json.transits)) {
  for (const t of json.transits) {
    if (t.geo_point) {
      const { lat: refLat, lon: refLon } = t.geo_point;

      const { lat, lon } = generateRandomLatLonWithPrecision(refLat, refLon);
      t.geo_point.lat = lat;
      t.geo_point.lon = lon;
    }
  }
}

console.log("🛠️ 修改后请求体:\n" + JSON.stringify(json, null, 2));

$done({ body: JSON.stringify(json) });
