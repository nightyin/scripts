const STORE_KEY = "NS_ATTENDANCE_HEADERS_V1";

function done(v) { v === undefined ? $done() : $done(v); }
function notify(t, s, b) { $notification.post(t, s || "", b || ""); }

function safeVal(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join("; ");
  return String(v);
}

function getHeader(h, name) {
  if (!h) return "";
  if (h[name]) return safeVal(h[name]);
  const lower = name.toLowerCase();
  if (h[lower]) return safeVal(h[lower]);
  const upper = name.toUpperCase();
  if (h[upper]) return safeVal(h[upper]);

  const keys = Object.getOwnPropertyNames(h);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k && k.toLowerCase() === lower) return safeVal(h[k]);
  }
  return "";
}

function pack(cookie, sign, key, ver, ua) {
  return (cookie || "") + "\n" + (sign || "") + "\n" + (key || "") + "\n" + (ver || "") + "\n" + (ua || "");
}

function unpack(raw) {
  const a = raw.split("\n");
  return { cookie: a[0] || "", sign: a[1] || "", key: a[2] || "", ver: a[3] || "", ua: a[4] || "" };
}

if (typeof $request !== "undefined") {
  const url = $request.url || "";

  if (url.indexOf("https://www.nodeseek.com/api/attendance?random=true") !== 0) {
    done({});
  } else {
    const h = $request.headers || {};

    const cookie = getHeader(h, "cookie");
    const sign = getHeader(h, "refract-sign");
    const key = getHeader(h, "refract-key");
    const ver = getHeader(h, "refract-version");
    const ua = getHeader(h, "user-agent");

    if (!cookie || !sign || !key) {
      notify("NS 抓取签到鉴权失败", "缺少字段", `cookie=${cookie ? "OK" : "MISS"} | sign=${sign ? "OK" : "MISS"} | key=${key ? "OK" : "MISS"}`);
      done({});
    } else {
      const ok = $persistentStore.write(pack(cookie, sign, key, ver, ua), STORE_KEY);
      notify("NS 签到鉴权已保存", "", ok ? "OK" : "保存失败");
      done({});
    }
  }
} else {
  const raw = $persistentStore.read(STORE_KEY);

  if (!raw) {
    notify("NS签到失败", "", "没有 attendance 鉴权：请先在网页点一次签到触发抓取");
    done();
  } else {
    const s = unpack(raw);

    if (!s.cookie || !s.sign || !s.key) {
      notify("NS签到失败", "", "鉴权不完整：请重新抓取 attendance 请求");
      done();
    } else {
      const url = "https://www.nodeseek.com/api/attendance?random=true";

      const headers = {
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": s.ua || "Mozilla/5.0",
        "Content-Type": "text/plain;charset=UTF-8",
        Cookie: s.cookie,
        "refract-version": s.ver || "0.3.33",
        Origin: "https://www.nodeseek.com",
        Referer: "https://www.nodeseek.com/",
        "refract-sign": s.sign,
        "refract-key": s.key,
      };

      $httpClient.post({ url, headers, body: "" }, (err, resp, body) => {
        if (err) {
          notify("NS签到结果", "请求错误", String(err));
          done();
          return;
        }

        const status = resp && resp.status ? resp.status : 0;

        let msg = "";
        if (body && body[0] === "{") {
          try { const o = JSON.parse(body); if (o && o.message) msg = String(o.message); } catch (_) {}
        }

        if (status >= 200 && status < 300) notify("NS签到结果", "签到成功", msg || "OK");
        else notify("NS签到结果", `HTTP ${status}`, msg || body || "UNKNOWN");

        done();
      });
    }
  }
}
