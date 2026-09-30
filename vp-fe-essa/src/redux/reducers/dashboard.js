import { SET_DASHBOARD_DATA } from '../constants/dashboardConstant'

const initialState = {
    dashboardData: {},
}

export const dashboardReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_DASHBOARD_DATA:
            return { ...state, dashboardData: action.payload }

        default:
            return state
    }
}
