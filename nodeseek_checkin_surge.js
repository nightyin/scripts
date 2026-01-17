const STORE_KEY = "NS_Nodeseek_MinHeaders_v2";

function notify(t, s, b) {
  $notification.post(t, s || "", b || "");
}

function done(v) {
  if (v === undefined) $done();
  else $done(v);
}

function lowerIndex(headers) {
  const idx = Object.create(null);
  for (const k in headers) idx[k.toLowerCase()] = headers[k];
  return idx;
}

function safeVal(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join("; ");
  return String(v);
}

function pack(o) {
  return (
    safeVal(o.cookie) + "\n" +
    safeVal(o.sign) + "\n" +
    safeVal(o.key) + "\n" +
    safeVal(o.ver) + "\n" +
    safeVal(o.ua) + "\n" +
    safeVal(o.referer) + "\n" +
    safeVal(o.origin)
  );
}

function unpack(raw) {
  const a = raw.split("\n");
  return {
    cookie: a[0] || "",
    sign: a[1] || "",
    key: a[2] || "",
    ver: a[3] || "",
    ua: a[4] || "",
    referer: a[5] || "",
    origin: a[6] || "",
  };
}

if (typeof $request !== "undefined") {
  const h = $request.headers || {};
  const idx = lowerIndex(h);

  const cookie = safeVal(idx["cookie"]);
  const sign = safeVal(idx["refract-sign"]);
  const key = safeVal(idx["refract-key"]);
  const ver = safeVal(idx["refract-version"]);
  const ua = safeVal(idx["user-agent"]);
  const referer = safeVal(idx["referer"]);
  const origin = safeVal(idx["origin"]);

  if (!cookie || !sign || !key) {
    notify(
      "NS 抓鉴权失败",
      "缺少关键字段",
      `cookie=${cookie ? "OK" : "MISS"} | sign=${sign ? "OK" : "MISS"} | key=${key ? "OK" : "MISS"}`
    );
    done({});
  } else {
    const raw = pack({ cookie, sign, key, ver, ua, referer, origin });
    const ok = $persistentStore.write(raw, STORE_KEY);
    if (ok) notify("NS Headers 获取成功", "", "已保存 Cookie + refract-sign + refract-key (+ refract-version)");
    else notify("NS Headers 保存失败", "", "写入持久化失败");
    done({});
  }
} else {
  const raw = $persistentStore.read(STORE_KEY);

  if (!raw) {
    notify("NS签到失败", "", "本地没有鉴权信息：请先进入个人信息页触发抓包");
    done();
  } else {
    const s = unpack(raw);

    if (!s.cookie || !s.sign || !s.key) {
      notify("NS签到失败", "", "鉴权信息不完整：请重新抓包");
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
      };

      if (s.referer) headers.Referer = s.referer;
      if (s.origin) headers.Origin = s.origin;

      $httpClient.post({ url, headers, body: "" }, (err, resp, body) => {
        if (err) {
          notify("NS签到结果", "请求错误", String(err));
          done();
          return;
        }

        const status = resp && resp.status ? resp.status : 0;

        let msg = "";
        if (body && body.length > 0 && body[0] === "{") {
          try {
            const obj = JSON.parse(body);
            if (obj && obj.message) msg = String(obj.message);
          } catch (_) {}
        }

        if (status === 403) {
          notify("NS签到结果", "403 风控/鉴权失败", msg || body || "可能 Cookie 不完整，请重新抓包");
        } else if (status === 500) {
          notify("NS签到结果", "500 服务器错误", msg || body || "服务器错误(500)");
        } else if (status >= 200 && status < 300) {
          notify("NS签到结果", "签到成功", msg || "已签到（无 message 返回）");
        } else {
          notify("NS签到结果", `异常状态 ${status}`, msg || body || "未知错误");
        }

        done();
      });
    }
  }
}
