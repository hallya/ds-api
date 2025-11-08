import https from "https";
import config from "./config.js";
import { retry } from "./retry.js";

const rejectUnauthorized = !config.synologyDisableSslVerification;
const agent = new https.Agent({ rejectUnauthorized });

/**
 * Makes an HTTPS GET request to the Synology NAS API endpoint with retry logic.
 * @param {string} path - The API endpoint path relative to the NAS URL.
 * @param {Object} [paramsObj={}] - An object containing query parameters to append to the URL.
 * @returns {Promise<Object>} A promise that resolves to an object with 'status' (HTTP status code) and 'data' (parsed JSON response).
 */
export async function api(path, paramsObj = {}) {
  return retry(async () => {
    const url = new URL(path, config.nasUrl);
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
                  new Error(`Server returned invalid JSON response: ${e2.message}`)
                );
                return;
              }
            }
            reject(new Error(`Server returned non-JSON response`));
          }
        });
      });
      req.on("error", reject);
      req.end();
    });
  });
}