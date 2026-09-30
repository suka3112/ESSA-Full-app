import { SET_PROFILE_DATA } from "../constants/myProfileConstant";

export const setProfileData = (profileData) => ({
    type: SET_PROFILE_DATA,
    payload: profileData
})