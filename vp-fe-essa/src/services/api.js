import { axiosInstance, logout } from './utilities'

//api
export let apiCall = async function ({
  method = "get",
  api,
  body,
  status = false,
  isForgotPassword = false,
  baseURL = "normal",
}) {
  return new Promise((resolve, reject) => {
    // Setting token
    let tokenKey = "token";
    if (localStorage.getItem("secondaryToken")) {
      // alert("token")
      tokenKey = "secondaryToken";
    }

    if (localStorage.getItem(tokenKey) && !isForgotPassword) {
      axiosInstance.defaults.headers.common["Authorization"] =
        JSON.parse(localStorage.getItem(tokenKey));
    }
    axiosInstance.defaults.headers["Access-Control-Allow-Origin"] = "*";

    axiosInstance[method](`${getServiceUrl(baseURL)}${api}`, body ? body : "")
      .then((data) => {
        resolve(statusHelper(status, data));
      })
      .catch((error) => {
        try {
          if (error.response) {
            reject(statusHelper(status, error.response));
          } else {
            reject(error);
          }
        } catch (err) {
          reject(err);
        }
      });
  });
};
let statusHelper = (status, data) => {
  if (data.status === 401 || data.status === 403) {
    logout();
  }
  if (status) {
    return {
      status: data.status,
      ...data.data,
    };
  } else {
    return data.data;
  }
};

let getServiceUrl = (baseURL) => {
  let finalURL = "";
  const { REACT_APP_AUTH_API_BASE_URL } = process.env;
  switch (baseURL) {
    case "auth":
      finalURL = REACT_APP_AUTH_API_BASE_URL;
      break;
    case "soa":
      finalURL = REACT_APP_AUTH_API_BASE_URL;
      break;
    default:
      finalURL = REACT_APP_AUTH_API_BASE_URL;
      break;
  }
  return finalURL;
};
