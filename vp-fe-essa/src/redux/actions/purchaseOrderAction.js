import { SET_PO_LIST, SET_PO_LIST_DETAILS, SET_PO_MATERIAL_LIST } from '../constants/purchaseOrderConstant'

export const setPoList = (poList) => ({
  type: SET_PO_LIST,
  payload: poList,
});

export const setPoListDetails = (poListDetails) => ({
  type: SET_PO_LIST_DETAILS,
  payload: poListDetails,
});

export const setPoMaterialList = (poMaterialList) => ({
  type: SET_PO_MATERIAL_LIST,
  payload: poMaterialList,
});