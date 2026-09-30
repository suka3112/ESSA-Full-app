import { SET_PO_LIST, SET_PO_LIST_DETAILS, SET_PO_MATERIAL_LIST } from '../constants/purchaseOrderConstant';

const initialState = {
  poListData: {},
  poListDetailsData: {},
  poMaterialListData: {},
};

export const purchaseOrderReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_PO_LIST:
      return {
        ...state,
        poListData: action.payload,
      };
    case SET_PO_LIST_DETAILS:
      return {
        ...state,
        poListDetailsData: action.payload,
      };
    case SET_PO_MATERIAL_LIST:
      return {
        ...state,
        poMaterialListData: action.payload,
      };
    default:
      return state;
  }
}