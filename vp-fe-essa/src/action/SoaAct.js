import { soaApi } from '../services/apiVariables'

export const listSoaApi =
  (body) =>
    (dispatch, getState, { apiCall }) => {
      return new Promise((resolve, reject) => {
        apiCall({
          ...soaApi.listSoaApi,
          body,
        })
          .then(({ data, message }) => {
            resolve(data);
          })
          .catch(({ message }) => {
          });
      });
    };