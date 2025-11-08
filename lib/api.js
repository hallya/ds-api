import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function api(path, paramsObj = {}) {
  const url = new URL(path, process.env.NAS_URL || "https://download.lcn-dlc.dev");
  Object.entries(paramsObj).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", agent }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          const start = data.indexOf("{");
          const end = data.lastIndexOf("}");
          if (start >= 0 && end > start) {
            try {
              const json = JSON.parse(data.slice(start, end + 1));
              resolve({ status: res.statusCode, data: json });
              return;
            } catch (e2) {
              reject(
                new Error(`Invalid JSON response: ${e2.message}\nRaw: ${data}`)
              );
              return;
            }
          }
          reject(new Error(`Non-JSON response.\nRaw: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}