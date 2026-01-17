const STORE_KEY = "NS_Nodeseek_MinHeaders_v3";

function done(v) { v === undefined ? $done() : $done(v); }

function safeVal(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join("; ");
  return String(v);
}

function maskCookie(s) {
  if (!s) return "";
  const x = String(s);
  if (x.length <= 12) return "***";
  return x.slice(0, 6) + "..." + x.slice(-6);
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

function log(s) {
  try { console.log(s); } catch (_) {}
}

if (typeof $request !== "undefined") {
  const h = $request.headers || {};

  const cookie = getHeader(h, "cookie");
  const sign = getHeader(h, "refract-sign");
  const key = getHeader(h, "refract-key");
  const ver = getHeader(h, "refract-version");
  const ua = getHeader(h, "user-agent");

  log("[NS][CAPTURE] url=" + ($request.url || ""));
  log("[NS][CAPTURE] keys=" + Object.getOwnPropertyNames(h).join(","));
  log("[NS][CAPTURE] cookie=" + (cookie ? maskCookie(cookie) : "MISS"));
  log("[NS][CAPTURE] refract-sign=" + (sign ? sign : "MISS"));
  log("[NS][CAPTURE] refract-key=" + (key ? key.slice(0, 10) + "..." : "MISS"));
  log("[NS][CAPTURE] refract-version=" + (ver ? ver : "MISS"));
  log("[NS][CAPTURE] ua=" + (ua ? ua.slice(0, 40) + "..." : "MISS"));

  if (!cookie || !sign || !key) {
    log("[NS][CAPTURE] RESULT=FAIL (missing required fields)");
    $notification.post("NS 抓鉴权失败", "缺少关键字段", `cookie=${cookie ? "OK" : "MISS"} | sign=${sign ? "OK" : "MISS"} | key=${key ? "OK" : "MISS"}`);
    done({});
  } else {
    const ok = $persistentStore.write(pack(cookie, sign, key, ver, ua), STORE_KEY);
    log("[NS][CAPTURE] store_write=" + (ok ? "OK" : "FAIL") + " key=" + STORE_KEY);
    $notification.post("NS Headers 获取成功", "", "已保存鉴权信息（Debug版）");
    done({});
  }
} else {
  const raw = $persistentStore.read(STORE_KEY);

  log("[NS][CHECKIN] store_read=" + (raw ? "OK" : "MISS") + " key=" + STORE_KEY);

  if (!raw) {
    $notification.post("NS签到失败", "", "本地没有鉴权信息：请先进入个人信息页触发抓包");
    done();
  } else {
    const s = unpack(raw);
    log("[NS][CHECKIN] cookie=" + maskCookie(s.cookie));
    log("[NS][CHECKIN] sign=" + (s.sign ? s.sign : "MISS"));
    log("[NS][CHECKIN] key=" + (s.key ? s.key.slice(0, 10) + "..." : "MISS"));
    log("[NS][CHECKIN] ver=" + (s.ver || "0.3.33"));

    const url = "https://www.nodeseek.com/api/attendance?random=true";
    const headers = {
      Cookie: s.cookie,
      "refract-sign": s.sign,
      "refract-key": s.key,
      "refract-version": s.ver || "0.3.33",
      "User-Agent": s.ua || "Mozilla/5.0",
      Accept: "*/*",
      "Content-Type": "text/plain;charset=UTF-8",
      Referer: "https://www.nodeseek.com/",
      Origin: "https://www.nodeseek.com",
    };

    $httpClient.post({ url, headers, body: "" }, (err, resp, body) => {
      if (err) {
        log("[NS][CHECKIN] http_error=" + String(err));
        $notification.post("NS签到结果", "请求错误", String(err));
        done();
        return;
      }

      const status = resp && resp.status ? resp.status : 0;
      log("[NS][CHECKIN] status=" + status);

      let msg = "";
      if (body && body[0] === "{") {
        try { const o = JSON.parse(body); if (o && o.message) msg = String(o.message); } catch (_) {}
      }

      if (status >= 200 && status < 300) $notification.post("NS签到结果", "签到成功", msg || "OK");
      else $notification.post("NS签到结果", `异常状态 ${status}`, msg || body || "UNKNOWN");

      done();
    });
  }
}
