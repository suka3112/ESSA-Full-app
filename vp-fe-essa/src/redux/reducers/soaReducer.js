import { SET_SOA_HISTORY, SET_SOA_LIST } from '../constants/soaConstant'


const initialState = {
  soaList: [],
  soaHistory: []
}

export const soaReducer = function(state = initialState, action) {
  switch (action.type) {
    case SET_SOA_LIST: {
      return {...state, soaList: action.payload}
    }
    case SET_SOA_HISTORY: {
      return {...state, soaHistory: action.payload}
    }
    default: {
      return state;
    }
  }
}