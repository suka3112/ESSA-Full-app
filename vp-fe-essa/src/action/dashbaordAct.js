import { dashboardApi } from "services/apiVariables";

export const getDashboardDataApi =
  () =>
  (dispatch, getState, { apiCall }) => {
    return new Promise((resolve, reject) => {
      apiCall({
        ...dashboardApi.getDashboardData,
      })
        .then(({ data, message }) => {
          resolve(data);
        })
        .catch(({ message }) => {
        });
    });
  };