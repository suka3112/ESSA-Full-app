import axiosInstance from '../services/axiosSetup'
import { TRACK_APPLICATION } from 'constants/api/TrackApplication'

export const trackApplication = async (query) => {
  try {
    return await axiosInstance.get(TRACK_APPLICATION, {
      params: query,
      service: 'avensys_daikin_be'
    })
  } catch (error) {
    console.error('Error in trackApplication:', error)
    throw error
  }
}
