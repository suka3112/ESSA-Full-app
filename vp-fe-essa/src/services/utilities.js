import axios from 'axios'

import { ENTRA_LOGOUT } from 'constants/api/Login'
import { clearAuthSession, isBffAuth, markLocalLogout } from 'utils/authStorage'
import { jwtDecode } from "jwt-decode";

export const axiosInstance = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'text/plain'
  }
})

const LOGIN_PATH = '/auth/login?sso=logged_out'
const ENTRA_LOGOUT_TIMEOUT_MS = 4000

const withTimeout = (promise, ms) =>
  Promise.race([
    promise.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])

const isLogoutAccepted = (res) =>
  Boolean(
    res &&
      (res.ok ||
        res.type === 'opaqueredirect' ||
        res.status === 204 ||
        (res.status >= 300 && res.status < 400))
  )

const clearEntraAppSession = async (apiBase) => {
  const logoutUrl = `${apiBase}${ENTRA_LOGOUT}?local=1`
  const requestInit = {
    credentials: 'include',
    redirect: 'manual',
    headers: { Accept: 'application/json' },
  }

  try {
    const postRes = await fetch(logoutUrl, {
      ...requestInit,
      method: 'POST',
      headers: {
        ...requestInit.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ local: true }),
    })
    if (isLogoutAccepted(postRes)) return
  } catch {
    // Fall through to GET for backends that only expose logout as a redirect.
  }

  try {
    await fetch(logoutUrl, { ...requestInit, method: 'GET' })
  } catch {
    // FE still lands on login; BE cookie may linger until local logout is deployed.
  }
}

// App-only logout: clear ESSA session, keep the Microsoft account signed in.
export const logout = () => {
    const entraLogout = isBffAuth()
    const apiBase = (process.env.REACT_APP_DEFAULT_API_BASE_URL || '').replace(/\/$/, '')

    markLocalLogout()

    const goToLogin = () => {
      markLocalLogout()
      window.location.assign(LOGIN_PATH)
    }

    Promise.resolve(clearAuthSession())
      .then(async () => {
        if (entraLogout && apiBase) {
          await withTimeout(clearEntraAppSession(apiBase), ENTRA_LOGOUT_TIMEOUT_MS)
        }
      })
      .finally(goToLogin)
}


export const downloadHelper = (data, filename) => {
  const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename || "download.csv",
  });

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const getParsedTokenDetails = () => {
  const token  = localStorage.getItem('token');
  if (token) {
    return jwtDecode(token);
  }
}

  export const titleCase = (str) => 
  str.split(' ')
     .map(word => word.charAt(0).toUpperCase() + word.slice(1))
     .join(' ');

export function getFileType(filename) {
  if (typeof filename !== "string" || !filename.includes(".")) {
    return "Unknown";
  }

  const extension = filename.split(".").pop().toLowerCase();

  const fileTypes = {
    document: ["pdf", "doc", "docx", "txt", "rtf", "odt"],
    spreadsheet: ["xls", "xlsx", "csv", "ods"],
    video: ["mp4", "avi", "mov", "wmv", "flv", "mkv"],
    image: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "svg", "webp"]
  };

  for (const [type, extensions] of Object.entries(fileTypes)) {
    if (extensions.includes(extension)) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  return "Unknown";
}


export const getEntityId = () => {
  if (typeof window !== "undefined") {
    const entityId =
      localStorage.getItem("entity_id") || sessionStorage.getItem("entity_id");
    return entityId ? JSON.parse(entityId) : null;
  }
  return null;
};

export const getVendorId = () => {
  if (typeof window !== "undefined") {
    const vendorId =
      localStorage.getItem("vendorId") || sessionStorage.getItem("vendorId");
    return vendorId ? JSON.parse(vendorId) : null;
  }
  return null;
};

export const generateCsv = async (backendEndpoint, fileName, queryParams = {}) => {
  try {
    // Make a GET request to the backend with query params
    const response = await axios.get(backendEndpoint, {
      headers: {
        Authorization: localStorage.getItem("token") || sessionStorage.getItem("token"),
        Accept: "text/csv", 
      },
      params: queryParams, 
      responseType: "arraybuffer",
    });

    // Create a Blob from the response data
    const blob = new Blob([response.data], { type: "text/csv" });

    // Trigger download
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    // Clean up
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error downloading CSV:", error);

    // Detailed error logging
    if (error.response) {
      console.error("Backend responded with status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
};

export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// Format number to USA international format with commas and 2 decimal places
export function formatUSDNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export const parseJSON = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const storeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};
