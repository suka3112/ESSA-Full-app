import { purchaseOrderApi } from "services/apiVariables";
import { addQuery } from "services/helperFunctions";

export const getPurchaseOrderListApi =
  (query) =>
  (dispatch, getState, { apiCall }) => {    
    addQuery(query, purchaseOrderApi.getPurchaseOrderApi);
    return new Promise((resolve, reject) => {
      apiCall({
        ...purchaseOrderApi.getPurchaseOrderApi,
      })
        .then(({ data, message }) => {
          resolve(data);
        })
        .catch(({ message }) => {
        });
    });
  };