import { SET_SOA_HISTORY, SET_SOA_LIST } from '../constants/soaConstant'


export const setSoaList = (payload) => {
  return {
    type: SET_SOA_LIST,
    payload: payload
  }
}

export const setSoaHistory = (payload) => {
  return {
    type: SET_SOA_HISTORY,
    payload: payload
  }
}