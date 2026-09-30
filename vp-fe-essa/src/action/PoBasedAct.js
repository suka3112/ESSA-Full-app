import { poBasedApi } from "services/apiVariables";
import { addQuery } from "services/helperFunctions";

export const getPoBasedListApi =
  (query) =>
  (dispatch, getState, { apiCall }) => {    
    addQuery(query, poBasedApi.getPoBasedListApi);
    return new Promise((resolve, reject) => {
      apiCall({
        ...poBasedApi.getPoBasedListApi,
      })
        .then(({ data, message }) => {
          resolve(data);
        })
        .catch(({ message }) => {
        });
    });
  };