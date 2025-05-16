let body = $request.body;
console.log("📥 原始请求体:\n" + body);

let json = JSON.parse(body);

const baseLatInt = 6;
const baseLonInt = 3;

// 动态获取小数位数
function getDecimalPlaces(num) {
  const str = num.toString();
  const parts = str.split(".");
  return parts.length > 1 ? parts[1].length : 0;
}

// 生成指定小数位数的随机值（0.xxxxxx）
function randomFraction(digits) {
  return parseFloat(Math.random().toFixed(digits));
}

function generateRandomLatLonWithPrecision(refLat, refLon) {
  const latPrecision = getDecimalPlaces(refLat);
  const lonPrecision = getDecimalPlaces(refLon);

  const lat = baseLatInt + randomFraction(latPrecision);
  const lon = baseLonInt + randomFraction(lonPrecision);

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
