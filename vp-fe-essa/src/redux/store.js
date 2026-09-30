import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import thunk from 'redux-thunk';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage

import toastReducer from './reducers/toastReducer';
import { userReducer } from './reducers/userInfoReducer';
import sidebarReducer from './reducers/sidebarReducer';
import { userRegisterReducer } from './reducers/userRegisterReducer';
import { soaReducer } from './reducers/soaReducer';
import { advancePaymentReducer } from './reducers/advancePaymentReducer';
import { enquiryReducer } from './reducers/enquiryReducer';
import { dashboardReducer } from './reducers/dashboard';
import { myProfileReducer } from './reducers/myProfile';
import { logisticInvoiceReducer } from './reducers/logisticInvoiceReducer';
import { trackApplicationReducer } from './reducers/trackApplication';
import { purchaseOrderReducer } from './reducers/purchaseOrderReducer';

import { apiCall } from 'services/api';
import { getPersistStorage } from './persistStorage';

// Step 1: Combine reducers
const rootReducer = combineReducers({
  toast: toastReducer,
  userInfo: userReducer,
  sidebar: sidebarReducer,
  userReg: userRegisterReducer,
  soa: soaReducer,
  advancePayment: advancePaymentReducer,
  enquiry: enquiryReducer,
  dashboard: dashboardReducer,
  myProfile: myProfileReducer,
  logisticInvoice: logisticInvoiceReducer,
  trackApplication: trackApplicationReducer,
  purchaseOrder: purchaseOrderReducer,
});
// Step 2: Redux Persist config
const persistConfig = {
  key: 'root',
  storage:getPersistStorage(),
  // blacklist: ['toast'],
  whitelist: ['userInfo', 'trackApplication', 'dashboard'],// Add reducers you do NOT want to persist
};

// Step 3: Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Step 4: Setup Redux DevTools
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Step 5: Create the store
export const store = createStore(
  persistedReducer,
  composeEnhancers(
    applyMiddleware(thunk.withExtraArgument({ apiCall }))
  )
);

// Step 6: Export persistor
export const persistor = persistStore(store);
