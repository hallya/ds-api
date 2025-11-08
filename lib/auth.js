import { api } from './api.js';

/**
 * Retrieves API information from the Synology NAS, including available APIs and their versions.
 * @returns {Promise<Object>} A promise that resolves to an object containing API information.
 * @throws {Error} If the API request fails or returns unsuccessful response.
 */
export async function getApiInfo() {
  const { data } = await api("/webapi/query.cgi", {
    api: "SYNO.API.Info",
    version: "1",
    method: "query",
    query: "SYNO.API.Auth,SYNO.DownloadStation.Task",
  });
  if (!data?.success) throw new Error("Failed to retrieve API information from server");
  return data.data || {};
}

/**
 * Logs into the Synology NAS using the provided credentials and returns session information.
 * @param {string} account - The username for authentication.
 * @param {string} passwd - The password for authentication.
 * @param {string} [session="DownloadStation"] - The session name to use.
 * @param {string} [authApiVersion="7"] - The API version to use for authentication.
 * @returns {Promise<Object>} A promise that resolves to the login response data, including session ID.
 * @throws {Error} If the login request fails.
 */
export async function login(
  account,
  passwd,
  session = "DownloadStation",
  authApiVersion = "7"
) {
  const { data } = await api("/webapi/auth.cgi", {
    api: "SYNO.API.Auth",
    version: authApiVersion,
    method: "login",
    account,
    passwd,
    session,
    format: "sid",
  });

  return data;
}

/**
 * Logs out from the Synology NAS session.
 * @param {string} sid - The session ID obtained from login.
 * @param {string} [authApiVersion="7"] - The API version to use for authentication.
 * @returns {Promise<void>} A promise that resolves when logout is complete.
 * @throws {Error} If the logout request fails.
 */
export async function logout(sid, authApiVersion = "7") {
  await api("/webapi/auth.cgi", {
    api: "SYNO.API.Auth",
    version: authApiVersion,
    method: "logout",
    _sid: sid,
    session: "DownloadStation",
  });
}

/**
 * Determines the appropriate authentication API version based on server API information.
 * @param {Object} info - The API information object retrieved from getApiInfo.
 * @returns {string} The API version string to use for authentication.
 */
export function pickAuthVersion(info) {
  const auth = info["SYNO.API.Auth"];
  if (auth?.maxVersion) return String(auth.maxVersion);
  if (auth?.version) return String(auth.version);
  return "7";
}