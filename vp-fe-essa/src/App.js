import './App.css';
import 'react-quill-new/dist/quill.snow.css';
import React, { useEffect } from 'react'
import Routes from './routes' // Ensure this is correctly set up
import { BrowserRouter } from 'react-router-dom' // Use the correct import for React Router v6
import i18n from './i18n';
import useAutoLogout from 'hooks/useAutoLogout'
import { BrandProvider } from './contexts/BrandContext'

function App() {
  

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    changeLanguage(savedLang);
  }, [])

  // auto logout on inactivity
  useAutoLogout()

  return (
    <BrowserRouter>
      <BrandProvider>
        <Routes />
      </BrandProvider>
    </BrowserRouter>
  )
}

export default App
