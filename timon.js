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

// 生成具有指定小数位数的随机小数部分
function generateRandomFraction(digits) {
  if (digits === 0) return 0;
  let randomDigitsStr = "";
  for (let i = 0; i < digits; i++) {
    randomDigitsStr += Math.floor(Math.random() * 10);
  }
  // parseFloat will convert "0.12300" to 0.123
  // This is numerically correct. The number of visible decimal places
  // in the final JSON depends on JSON.stringify's behavior.
  return parseFloat("0." + randomDigitsStr);
}

function generateRandomLatLonWithPrecision(refLat, refLon) {
  const latPrecision = getDecimalPlaces(refLat);
  const lonPrecision = getDecimalPlaces(refLon);

  // Generate random fractions using the determined precision
  const latFraction = generateRandomFraction(latPrecision);
  const lonFraction = generateRandomFraction(lonPrecision);

  const lat = baseLatInt + latFraction;
  const lon = baseLonInt + lonFraction;

  // The following lines are for demonstration/debugging if you want to force string formatting
  // However, the geo_point values are expected to be numbers.
  // const latStr = (baseLatInt + latFraction).toFixed(latPrecision);
  // const lonStr = (baseLonInt + lonFraction).toFixed(lonPrecision);
  // return { lat: parseFloat(latStr), lon: parseFloat(lonStr) };

  return { lat, lon };
}

if (json.transits && Array.isArray(json.transits)) {
  for (const t of json.transits) {
    if (t.geo_point) {
      const { lat: refLat, lon: refLon } = t.geo_point;

      // Check the precision being detected (for debugging)
      // console.log(`Original Lat: ${refLat}, Precision: ${getDecimalPlaces(refLat)}`);
      // console.log(`Original Lon: ${refLon}, Precision: ${getDecimalPlaces(refLon)}`);

      const { lat, lon } = generateRandomLatLonWithPrecision(refLat, refLon);
      t.geo_point.lat = lat;
      t.geo_point.lon = lon;
    }
  }
}

console.log("🛠️ 修改后请求体:\n" + JSON.stringify(json, null, 2));

$done({ body: JSON.stringify(json) });
