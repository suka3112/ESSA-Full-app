import { SET_USER_DATA, CLEAR_USER_DATA, SET_DROPDOWN_DATA } from '../constants/userRegisterConstant'

const initialState = {
    // Default: No user logged in
    userData: {},
    dropdownData: {}
}

export const userRegisterReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_USER_DATA:
            return { ...state, userData: action.payload }

        case CLEAR_USER_DATA:
            return {}

        case SET_DROPDOWN_DATA:
            return { ...state,  dropdownData: {
                ...state.dropdownData, // Preserve previous data
                ...action.payload // Merge new data
              } }

        default:
            return state
    }
}
