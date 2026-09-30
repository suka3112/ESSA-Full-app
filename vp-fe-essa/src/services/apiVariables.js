import { generateQuery } from './helperFunctions'

export const authApi = {
  loginApi: {
    url: '/v1/users/login',
    method: 'post',
    baseURL: 'auth'
  },
  forgotApi: {
    url: '/v1/users/forgotPassword',
    method: 'post',
    baseURL: 'auth'
  },
  userRegApi: {
    url: '/v1/users/registerVendor',
    method: 'post',
    baseURL: 'auth'
  }
}

export const dashboardApi = {
  getDashboardData: {
    url: '/v1/dashboard/vendorDashboard'
  }
}

export const soaApi = {
  listSoaApi: {
    api: '/v1/SOA/soaListing',
    method: 'post',
    baseURL: 'soa'
  },
  soaHistoryApi: {
    api: '/v1/SOA/soaHistory',
    method: 'get',
    baseURL: 'soa'
  },
  uploadSoaApi: {
    api: '/v1/SOA/uploadSOA',
    method: 'post',
    baseURL: 'soa'
  },
  reconcileSoaApi: {
    api: '/v1/SOA/reconciliationSOA',
    method: 'post',
    baseURL: 'soa'
  }
}

export const adminFlowApi = {
  getAddressList: {
    url: 'v1/places/',
    method: 'get',
    baseURL: 'auth'
  },
  forgotApi: {
    url: '/v1/users/forgotPassword',
    method: 'post',
    baseURL: 'auth'
  },
  userRegApi: {
    url: '/v1/users/registerVendor',
    method: 'post',
    baseURL: 'auth'
  }
}

export const purchaseOrderApi = {
  getPurchaseOrderApi: {
    url: '/v1/purchaseOrder/purchaseOrderListing',
    method: 'get',
    baseURL: 'auth',
    query: {
      entity_id: null
    },
    get api() {
      return this.url + generateQuery(this.query)
    },
    set addQuery({ key, payload }) {
      this.query[key] = payload
    }
  }
}

export const poBasedApi = {
  getPoBasedListApi: {
    url: '/v1/invoice/poInvoiceListing',
    method: 'get',
    baseURL: 'auth',
    query: {
      entity_id: null
    },
    get api() {
      return this.url + generateQuery(this.query)
    },
    set addQuery({ key, payload }) {
      this.query[key] = payload
    }
  }
}
