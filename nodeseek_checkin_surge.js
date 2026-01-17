const STORE_KEY = "NS_Nodeseek_MinHeaders_v3";

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
  if (url.indexOf("https://www.nodeseek.com/api/account/getInfo/") !== 0 || url.indexOf("readme=1") === -1) {
    done({});
  } else {
    const h = $request.headers || {};
    const cookie = getHeader(h, "cookie");
    const sign = getHeader(h, "refract-sign");
    const key = getHeader(h, "refract-key");
    const ver = getHeader(h, "refract-version");
    const ua = getHeader(h, "user-agent");

    if (!cookie || !sign || !key) {
      notify("NS 抓鉴权失败", "缺少关键字段", `cookie=${cookie ? "OK" : "MISS"} | sign=${sign ? "OK" : "MISS"} | key=${key ? "OK" : "MISS"}`);
      done({});
    } else {
      const ok = $persistentStore.write(pack(cookie, sign, key, ver, ua), STORE_KEY);
      notify("NS Headers 获取成功", "", ok ? "鉴权已保存" : "保存失败");
      done({});
    }
  }
} else {
  notify("NS签到", "开始执行", "准备请求 /api/attendance");

  const raw = $persistentStore.read(STORE_KEY);
  if (!raw) {
    notify("NS签到", "失败", "本地无鉴权信息，请先进入个人信息页触发抓包");
    done();
  } else {
    const s = unpack(raw);
    if (!s.cookie || !s.sign || !s.key) {
      notify("NS签到", "失败", "鉴权字段不完整，请重新抓包");
      done();
    } else {
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

      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          notify("NS签到", "超时", "10 秒无响应（策略/节点可能阻断）");
          done();
        }
      }, 10000);

      $httpClient.post({ url, headers, body: "" }, (err, resp, body) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (err) {
          notify("NS签到", "请求错误", String(err));
          done();
          return;
        }

        const status = resp && resp.status ? resp.status : 0;

        let msg = "";
        if (body && body[0] === "{") {
          try { const o = JSON.parse(body); if (o && o.message) msg = String(o.message); } catch (_) {}
        }

        notify("NS签到", `HTTP ${status}`, msg || body || "无返回内容");
        done();
      });
    }
  }
}
