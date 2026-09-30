// persistStorage.js
import localStorageEngine from 'redux-persist/lib/storage';
import sessionStorageEngine from 'redux-persist/lib/storage/session';

export const getPersistStorage = () => {
  const rememberMe = JSON.parse(localStorage.getItem('rememberMe'));
  return rememberMe ? localStorageEngine : sessionStorageEngine;
}
