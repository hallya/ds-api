import { api } from './api.js';

export async function getApiInfo() {
  const { data } = await api("/webapi/query.cgi", {
    api: "SYNO.API.Info",
    version: "1",
    method: "query",
    query: "SYNO.API.Auth,SYNO.DownloadStation.Task",
  });
  if (!data?.success) throw new Error("Failed to query API info");
  return data.data || {};
}

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

export async function logout(sid, authApiVersion = "7") {
  await api("/webapi/auth.cgi", {
    api: "SYNO.API.Auth",
    version: authApiVersion,
    method: "logout",
    _sid: sid,
    session: "DownloadStation",
  });
}

export function pickAuthVersion(info) {
  const auth = info["SYNO.API.Auth"];
  if (auth?.maxVersion) return String(auth.maxVersion);
  if (auth?.version) return String(auth.version);
  return "7";
}