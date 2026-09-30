import { SET_PROFILE_DATA } from '../constants/myProfileConstant'

const initialState = {
    profileData: {},
}

export const myProfileReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_PROFILE_DATA:
            return { ...state, profileData: action.payload }

        default:
            return state
    }
}
