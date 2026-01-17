const NS_HEADER_KEY = "NS_NodeseekHeaders";
const isRequest = typeof $request !== "undefined";

const NEED_KEYS = [
  "Connection",
  "Accept-Encoding",
  "Priority",
  "Content-Type",
  "Origin",
  "refract-sign",
  "User-Agent",
  "refract-key",
  "refract-version",
  "Sec-Fetch-Mode",
  "Cookie",
  "Host",
  "Referer",
  "Accept-Language",
  "Accept",
];

function isSurge() {
  return typeof $persistentStore !== "undefined" && typeof $httpClient !== "undefined";
}
function isQX() {
  return typeof $prefs !== "undefined" && typeof $task !== "undefined";
}

function notify(title, subtitle, body) {
  if (typeof $notification !== "undefined" && $notification.post) {
    $notification.post(title, subtitle || "", body || "");
  } else if (typeof $notify !== "undefined") {
    $notify(title, subtitle || "", body || "");
  }
}

function done(v) {
  if (typeof $done === "function") $done(v);
}

function getStore(key) {
  if (isSurge()) return $persistentStore.read(key);
  if (isQX()) return $prefs.valueForKey(key);
  return null;
}
function setStore(key, val) {
  if (isSurge()) return $persistentStore.write(val, key);
  if (isQX()) return $prefs.setValueForKey(val, key);
  return false;
}

function safeVal(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.join("; ");
  return String(v);
}

function getHeaderAnyCase(src, name) {
  if (!src) return "";
  if (src[name] !== undefined) return safeVal(src[name]);

  const lower = name.toLowerCase();
  if (src[lower] !== undefined) return safeVal(src[lower]);

  const upper = name.toUpperCase();
  if (src[upper] !== undefined) return safeVal(src[upper]);

  const keys = Object.getOwnPropertyNames(src);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k && k.toLowerCase() === lower) return safeVal(src[k]);
  }
  return "";
}

function pickNeedHeaders(src = {}) {
  const dst = {};
  for (let i = 0; i < NEED_KEYS.length; i++) {
    const k = NEED_KEYS[i];
    const v = getHeaderAnyCase(src, k);
    if (v !== "") dst[k] = v;
  }
  return dst;
}

function fetchRequest(req, cb) {
  if (isQX()) {
    $task.fetch(req).then(
      (resp) => cb(null, resp, resp.body || ""),
      (reason) => cb(reason, null, "")
    );
    return;
  }

  if (isSurge()) {
    const method = (req.method || "GET").toUpperCase();
    const opt = { url: req.url, headers: req.headers || {}, body: req.body || "" };
    const handler = (err, resp, body) => {
      if (err) return cb(err, null, "");
      cb(null, resp, body || "");
    };
    if (method === "POST") $httpClient.post(opt, handler);
    else $httpClient.get(opt, handler);
    return;
  }

  cb(new Error("Unsupported runtime"), null, "");
}

function normalizeHeadersForSend(saved) {
  const h = saved || {};
  return {
    Connection: h["Connection"] || "keep-alive",
    "Accept-Encoding": h["Accept-Encoding"] || "gzip, deflate, br",
    Priority: h["Priority"] || "u=3, i",
    "Content-Type": h["Content-Type"] || "text/plain;charset=UTF-8",
    Origin: h["Origin"] || "https://www.nodeseek.com",
    "refract-sign": h["refract-sign"] || "",
    "User-Agent": h["User-Agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1",
    "refract-key": h["refract-key"] || "",
    "refract-version": h["refract-version"] || "0.3.33",
    "Sec-Fetch-Mode": h["Sec-Fetch-Mode"] || "cors",
    Cookie: h["Cookie"] || "",
    Host: h["Host"] || "www.nodeseek.com",
    Referer: h["Referer"] || "https://www.nodeseek.com/",
    "Accept-Language": h["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
    Accept: h["Accept"] || "*/*",
  };
}

function shouldCapture(url) {
  if (!url) return false;
  if (url.indexOf("https://www.nodeseek.com/api/account/getInfo/") === 0) return true;
  if (url.indexOf("https://www.nodeseek.com/api/attendance") === 0) return true;
  return false;
}

if (isRequest) {
  const url = $request.url || "";
  if (!shouldCapture(url)) {
    done({});
  } else {
    const allHeaders = $request.headers || {};
    const picked = pickNeedHeaders(allHeaders);

    const hasCookie = !!picked["Cookie"];
    const hasSign = !!picked["refract-sign"];
    const hasKey = !!picked["refract-key"];

    if (!hasCookie || !hasSign || !hasKey) {
      notify("NS Headers 获取失败", "", `缺少字段：Cookie=${hasCookie ? "OK" : "MISS"} | sign=${hasSign ? "OK" : "MISS"} | key=${hasKey ? "OK" : "MISS"}`);
      done({});
    } else {
      const ok = setStore(NS_HEADER_KEY, JSON.stringify(picked));
      if (ok) notify("NS Headers 获取成功", "", "指定请求头已保存（getInfo/attendance 都可更新）。");
      else notify("NS Headers 保存失败", "", "写入持久化失败。");
      done({});
    }
  }
} else {
  const raw = getStore(NS_HEADER_KEY);

  if (!raw) {
    notify("NS签到结果", "无法签到", "本地没有保存的请求头：请先打开个人信息页或点击签到一次触发抓包。");
    done();
  } else {
    let savedHeaders = {};
    try {
      savedHeaders = JSON.parse(raw) || {};
    } catch (e) {
      notify("NS签到结果", "无法签到", "本地保存的请求头损坏：请重新抓包保存。");
      done();
    }

    const url = "https://www.nodeseek.com/api/attendance?random=true";
    const method = "POST";
    const headers = normalizeHeadersForSend(savedHeaders);

    if (!headers.Cookie || !headers["refract-sign"] || !headers["refract-key"]) {
      notify("NS签到结果", "无法签到", "保存的鉴权字段不完整：请重新抓包。");
      done();
    } else {
      const req = { url, method, headers, body: "" };

      fetchRequest(req, (err, resp, body) => {
        if (err) {
          notify("NS签到结果", "请求错误", String(err));
          done();
          return;
        }

        const status = isQX() ? (resp ? resp.statusCode : 0) : (resp ? resp.status : 0);
        let msg = "";

        if (body && body[0] === "{") {
          try {
            const obj = JSON.parse(body);
            msg = obj && obj.message ? String(obj.message) : "";
          } catch (_) {}
        }

        if (status === 403) {
          notify("NS签到结果", "403 风控/签名失效", msg || body || "建议：打开 Nodeseek 个人信息页或点一次签到刷新 refract-sign/key");
        } else if (status === 500) {
          notify("NS签到结果", "500 服务器错误", msg || body || "服务器错误(500)");
        } else if (status >= 200 && status < 300) {
          notify("NS签到结果", "签到成功", msg || "OK");
        } else {
          notify("NS签到结果", `请求异常 ${status}`, msg || body || "UNKNOWN");
        }

        done();
      });
    }
  }
}
