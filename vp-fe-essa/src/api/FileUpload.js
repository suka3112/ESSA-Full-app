import axiosInstance from '../services/axiosSetup'
import { FILE_UPLOAD, DELETE_FILES } from '../constants/api/FileUpload'

export const fileUpload = async (formData) => {
  try {
    const response = await axiosInstance.post(FILE_UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error // Rethrow so the caller can handle it
  }
}

// export const deleteFiles = async (fileId, query = {}) => {
//   try {
//     const response = await axiosInstance.delete(`${DELETE_FILES}?id=${fileId}`, {
//       params: query
//     })
//     return response
//   } catch (error) {
//     console.error('Error deleting file:', error)
//     throw error
//   }
// }

export const deleteFiles = async (fileData, query = {}) => {
  try {
    const { id, url } = fileData;

    const response = await axiosInstance.delete(`${DELETE_FILES}`, {
      params: {
        id,
        url,
        ...query, // keep extra params if any
      },
    });

    return response;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

