import { SET_APPLICATION_STATUS } from "../constants/trackApplication";

export const setApplicationStatus = (data) => ({
    type: SET_APPLICATION_STATUS,
    payload: data
})