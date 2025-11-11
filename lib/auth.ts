import { api } from "./api.ts";

/**
 * API information structure from Synology NAS.
 */
export interface ApiInfo {
  "SYNO.API.Auth"?: {
    maxVersion?: number;
    version?: number;
  };
  "SYNO.DownloadStation.Task"?: {
    maxVersion?: number;
    version?: number;
  };
}

/**
 * Login response structure.
 */
export interface LoginResponse {
  success: boolean;
  data?: {
    sid: string;
  };
  error?: {
    code: number;
  };
}

/**
 * Retrieves API information from the Synology NAS, including available APIs and their versions.
 * @returns A promise that resolves to an object containing API information.
 * @throws If the API request fails or returns unsuccessful response.
 */
export async function getApiInfo(): Promise<ApiInfo> {
  const { data } = await api("/webapi/query.cgi", {
    api: "SYNO.API.Info",
    version: "1",
    method: "query",
    query: "SYNO.API.Auth,SYNO.DownloadStation.Task",
  });
  const response = data as { success?: boolean; data?: ApiInfo };
  if (!response?.success) {
    throw new Error("Failed to retrieve API information from server");
  }
  return response.data || {};
}

/**
 * Logs into the Synology NAS using the provided credentials and returns session information.
 * @param account - The username for authentication.
 * @param passwd - The password for authentication.
 * @param session - The session name to use (default: "DownloadStation").
 * @param authApiVersion - The API version to use for authentication (default: "7").
 * @returns A promise that resolves to the login response data, including session ID.
 * @throws If the login request fails.
 */
export async function login(
  account: string,
  passwd: string,
  session = "DownloadStation",
  authApiVersion = "7"
): Promise<LoginResponse> {
  const { data } = await api("/webapi/auth.cgi", {
    api: "SYNO.API.Auth",
    version: authApiVersion,
    method: "login",
    account,
    passwd,
    session,
    format: "sid",
  });

  return data as LoginResponse;
}

/**
 * Logs out from the Synology NAS session.
 * @param sid - The session ID obtained from login.
 * @param authApiVersion - The API version to use for authentication (default: "7").
 * @returns A promise that resolves when logout is complete.
 * @throws If the logout request fails.
 */
export async function logout(sid: string, authApiVersion = "7"): Promise<void> {
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
 * @param info - The API information object retrieved from getApiInfo.
 * @returns The API version string to use for authentication.
 */
export function pickAuthVersion(info: ApiInfo): string {
  const auth = info["SYNO.API.Auth"];
  if (auth?.maxVersion) return String(auth.maxVersion);
  if (auth?.version) return String(auth.version);
  return "7";
}

