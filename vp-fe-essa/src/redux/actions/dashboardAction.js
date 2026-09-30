import { SET_DASHBOARD_DATA } from "../constants/dashboardConstant";

export const setDashboardData = (userData) => ({
    type: SET_DASHBOARD_DATA,
    payload: userData
})