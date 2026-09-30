import { apiService } from 'constants/api/services'
import axiosInstance from '../../src/services/axiosSetup'
import {
  CREATE_FAQ_HEADER,
  ADD_FAQ_QUESTION,
  GET_FAQ_HEADERS,
  GET_FAQ_QUESTIONS,
  UPDATE_FAQ_HEADER,
  UPDATE_FAQ_QUESTION,
  DELETE_FAQ_HEADER,
  DELETE_FAQ_QUESTION
} from '../constants/api/Faq'

// 1. Create FAQ Header
export const createFaqHeader = async (payload, service = apiService) => {
  try {
    return await axiosInstance.post(CREATE_FAQ_HEADER, payload, { service })
  } catch (error) {
    console.error('Create FAQ header error:', error)
    throw error
  }
}

// 2. Add FAQ Question (Pass headerId as query param)
export const addFaqQuestion = async (headerId, payload,query, service = apiService) => {
  try {
    return await axiosInstance.post(`${ADD_FAQ_QUESTION}/${headerId}`, payload, {
      params: query, // e.g., { headerId: 4 }
      service
    })
  } catch (error) {
    console.error('Add FAQ question error:', error)
    throw error
  }
}

// 3. Get All FAQ Headers
export const getFaqHeaders = async (query = {}, service = apiService) => {
  try {
    return await axiosInstance.get(GET_FAQ_HEADERS, {
      params: query,
      service
    })
  } catch (error) {
    console.error('Get FAQ headers error:', error)
    throw error
  }
}

// 4. Get FAQ Questions (Pass headerId as query param)
export const getFaqQuestions = async (headerId,query, service = apiService) => {
  try {
    return await axiosInstance.get(`${GET_FAQ_QUESTIONS}/${headerId}`, {
      params: query, // e.g., { headerId: 1 }
      service
    })
  } catch (error) {
    console.error('Get FAQ questions error:', error)
    throw error
  }
}

// 5. Update FAQ Header (Pass headerId as query param)
export const updateFaqHeader = async (id, payload,query, service = apiService) => {
  try {
    return await axiosInstance.put(`${UPDATE_FAQ_HEADER}/${id}`, payload, {
      params: query, // e.g., { headerId: 3 }
      service
    })
  } catch (error) {
    console.error('Update FAQ header error:', error)
    throw error
  }
}

// 6. Update FAQ Question (Pass questionId as query param)
export const updateFaqQuestion = async (id, payload,query, service = apiService) => {
  try {
    return await axiosInstance.put(`${UPDATE_FAQ_QUESTION}/${id}`, payload, {
      params: query, // e.g., { questionId: 7 }
      service
    })
  } catch (error) {
    console.error('Update FAQ question error:', error)
    throw error
  }
}

// 7. Delete FAQ Header (Pass headerId as query param)
export const deleteFaqHeader = async (headerId,query, service = apiService) => {
  try {
    return await axiosInstance.delete(`${DELETE_FAQ_HEADER}/${headerId}`, {
      params: query, // e.g., { headerId: 2 }
      service
    })
  } catch (error) {
    console.error('Delete FAQ header error:', error)
    throw error
  }
}

// 8. Delete FAQ Question (Pass questionId as query param)
export const deleteFaqQuestion = async (questionId,query, service = apiService) => {
  try {
    return await axiosInstance.delete(`${DELETE_FAQ_QUESTION}/${questionId}`, {
      params: query, // e.g., { questionId: 2 }
      service
    })
  } catch (error) {
    console.error('Delete FAQ question error:', error)
    throw error
  }
}
