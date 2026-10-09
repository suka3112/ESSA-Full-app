import axiosInstance from 'services/axiosSetup'

export async function getEssaPurchaseOrders(query) {
  return axiosInstance.get('/essa/purchase-orders', { params: query })
}
