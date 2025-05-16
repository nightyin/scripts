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

// 生成与原始精度完全一致的随机值
function generateExactDecimal(baseInt, digits) {
  // 生成指定位数的随机小数部分
  let decimalPart = "";
  for (let i = 0; i < digits; i++) {
    decimalPart += Math.floor(Math.random() * 10).toString();
  }
  
  // 构建完整数字字符串并解析为数字
  const fullNumStr = baseInt + "." + decimalPart;
  return Number(fullNumStr);
}

function generateRandomLatLonWithPrecision(refLat, refLon) {
  const latPrecision = getDecimalPlaces(refLat);
  const lonPrecision = getDecimalPlaces(refLon);

  const lat = generateExactDecimal(baseLatInt, latPrecision);
  const lon = generateExactDecimal(baseLonInt, lonPrecision);

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
