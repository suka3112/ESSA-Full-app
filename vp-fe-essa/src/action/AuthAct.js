import { authApi } from "../services/apiVariables";

export const loginApi =
  (body) =>
  (dispatch, getState, { apiCall }) => {
    return new Promise((resolve, reject) => {
      apiCall({
        ...authApi.loginApi,
        body,
      })
        .then(({ data, message }) => {
          resolve(data);
        })
        .catch(({ message }) => {
        });
    });
  };

export const forgotPwdApi =
  (body) =>
  (dispatch, getState, { apiCall }) => {
    return new Promise((resolve, reject) => {
      apiCall({
        ...authApi.forgotApi,
        body,
      })
        .then(({ data, message }) => {
          resolve(data);
        })
        .catch(({ message }) => {
        });
    });
  };

  export const userRegApi =
  (body) =>
  (dispatch, getState, { apiCall }) => {
    return new Promise((resolve, reject) => {
      apiCall({
        ...authApi.userRegApi,
        body,
      })
        .then(({ data, message }) => {
          resolve(data);
        })
        .catch(({ message }) => {
        });
    });
  };