const STORE_KEY = "NS_Nodeseek_MinHeaders_v1";
const FIELDS = ["cookie", "refract-sign", "refract-key", "user-agent", "referer", "origin"];

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

function pack(min) {
  return (
    (min.cookie || "") + "\n" +
    (min["refract-sign"] || "") + "\n" +
    (min["refract-key"] || "") + "\n" +
    (min["user-agent"] || "") + "\n" +
    (min.referer || "") + "\n" +
    (min.origin || "")
  );
}

function unpack(raw) {
  const arr = raw.split("\n");
  return {
    cookie: arr[0] || "",
    "refract-sign": arr[1] || "",
    "refract-key": arr[2] || "",
    "user-agent": arr[3] || "",
    referer: arr[4] || "",
    origin: arr[5] || "",
  };
}

if (typeof $request !== "undefined") {
  const h = $request.headers || {};
  const idx = lowerIndex(h);
  const min = Object.create(null);

  for (let i = 0; i < FIELDS.length; i++) {
    const key = FIELDS[i];
    const val = idx[key];
    if (val) min[key] = val;
  }

  if (!min.cookie || !min["refract-key"] || !min["refract-sign"]) {
    notify("NS Headers 获取失败", "", "缺少 Cookie 或 refract-key/sign，请重新进入一次个人信息页触发抓包。");
    done({});
  } else {
    const packed = pack(min);
    const ok = $persistentStore.write(packed, STORE_KEY);
    if (ok) notify("NS Headers 获取成功", "", "已保存最小必要字段（省内存版）。");
    else notify("NS Headers 保存失败", "", "写入持久化失败。");
    done({});
  }
} else {
  const raw = $persistentStore.read(STORE_KEY);

  if (!raw) {
    notify("NS签到失败", "", "本地没有保存 Headers：请先打开个人信息页面抓包一次。");
    done();
  } else {
    const saved = unpack(raw);

    if (!saved.cookie || !saved["refract-key"] || !saved["refract-sign"]) {
      notify("NS签到失败", "", "本地 Headers 数据不完整，请重新抓包。");
      done();
    } else {
      const url = "https://www.nodeseek.com/api/attendance?random=true";

      const headers = {
        Cookie: saved.cookie,
        "refract-sign": saved["refract-sign"],
        "refract-key": saved["refract-key"],
        "User-Agent": saved["user-agent"] || "Mozilla/5.0",
      };

      if (saved.referer) headers.Referer = saved.referer;
      if (saved.origin) headers.Origin = saved.origin;

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
          notify("NS签到结果", "403 风控", msg || body || "触发风控，稍后再试");
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
