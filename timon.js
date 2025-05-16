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

// 生成与原始精度完全一致的随机数
function randomFractionWithExactPrecision(digits) {
  const factor = Math.pow(10, digits);
  const rand = Math.floor(Math.random() * factor);
  
  // 将随机数转为字符串并补零以保持完全相同的位数
  let randStr = rand.toString();
  while (randStr.length < digits) {
    randStr = "0" + randStr;
  }
  
  return parseFloat("0." + randStr);
}

function generateRandomLatLonWithPrecision(refLat, refLon) {
  const latPrecision = getDecimalPlaces(refLat);
  const lonPrecision = getDecimalPlaces(refLon);

  // 格式化为与原始数据相同的精度
  const lat = (baseLatInt + randomFractionWithExactPrecision(latPrecision)).toFixed(latPrecision);
  const lon = (baseLonInt + randomFractionWithExactPrecision(lonPrecision)).toFixed(lonPrecision);

  // 转换回数字类型，但保留精确的小数位数
  return { 
    lat: parseFloat(lat), 
    lon: parseFloat(lon) 
  };
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
