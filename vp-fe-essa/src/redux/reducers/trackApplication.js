
import { SET_APPLICATION_STATUS } from '../constants/trackApplication'

const initialState = {
    applicationStatus: null
}

export const trackApplicationReducer = (state = initialState, action) => {
    switch (action.type) {
        case SET_APPLICATION_STATUS:
            return { ...state, applicationStatus: action.payload }

        default:
            return state
    }
}