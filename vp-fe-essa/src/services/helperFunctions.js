import React from "react";
//add Query
export const addQuery = (dataObject, apiObject) => {
  if (!dataObject) {
    return "";
  }
  const keys = [
    "entity_id"
  ];

  keys.forEach((key) => {
    if (dataObject.hasOwnProperty(key) && typeof dataObject[key] != "object") {
      if (apiObject.query.hasOwnProperty(key)) {
        apiObject.addQuery = { key, payload: dataObject[key] };
      }
      
    } else {
      dataObject[key] &&
        Object.keys(dataObject[key]).map((keyName) => {
          if (apiObject.query.hasOwnProperty(keyName)) {
            apiObject.addQuery = {
              key: keyName,
              payload: dataObject[key][keyName],
            };
          }
          return null;
        });
    }
    return null;
  });
};

//generate Query
export const generateQuery = (query) => {
  let url = "";

  if (query.hasOwnProperty("url_id")) {
    url = `/${query.url_id}`;
  }

  let emptyData = [];
  return (
    url +
    Object.keys(query).reduce((accumulator, key, index) => {
      if (
        query[key] !== "" &&
        query[key] !== null &&
        query[key] !== undefined
      ) {
        emptyData.push(key);
      }
      if (
        query[key] === "" ||
        query[key] == null ||
        key === "url_id" ||
        (query[key] !== null && query[key].toString().trim() === "")
      ) {
        return accumulator;
      } else {
        return (
          accumulator +
          `${index !== 0 && emptyData.length > 1 ? "&" : "?"}${key}=${
            query[key]
          }`
        );
      }
    }, "")
  );
};

export const routerAuthTokenGuard = (history) => {
  if (!localStorage.getItem("authToken")) {
    // Preserve language preference
    const appLanguage = localStorage.getItem('appLanguage');
    
    history.push(`/auth/login`);
    localStorage.clear();
    
    // Restore language preference
    if (appLanguage) {
      localStorage.setItem('appLanguage', appLanguage);
    }
  }
};

export const ternaryCondition = (val1, val2 = "", defaultValue = "") => {
  return val1 ? val2 : defaultValue;
};

export const conditionalLoad = (val, valToShow) => {
  return val && valToShow;
};

export const getUserDetailsBasedToken = () => {
  const token = localStorage.getItem("secondaryToken")
    ? localStorage.getItem("secondaryToken")
    : localStorage.getItem("authToken");
  let decoded = {};
  // decoded = token !== null && jwt_decode(token);
  return decoded;
};

export const getAuthToken = () => {
  if (localStorage.getItem("secondaryToken")) {
    return localStorage.getItem("secondaryToken");
  } else {
    return localStorage.getItem("authToken");
  }
};

// export const customMomentFormat = (date, formatType, utfOffSet = 0) => {
//   return moment(date)
//     .utcOffset(utfOffSet * 60)
//     .format(formatType);
// };

export const errorMessageToDisplay = (
  validator,
  errorName,
  errorValue,
  validationMethod
) => {
  return (
    <div className="error_msg_text">
      {validator.message(errorName, errorValue, validationMethod)}
    </div>
  );
};

export const scrollToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
};

export const bytesToSize = (bytes) => {
  var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "n/a";
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  if (i == 0) return bytes + " " + sizes[i];
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
};

export const objectToQueryString = (filterData) => {
  const queryParams = [];
  for (const key in filterData) {
    if (filterData[key] !== "") {
      if (typeof filterData[key] === "object" && "value" in filterData[key]) {
        // Handle nested objects with a "value" property
        queryParams.push(`${key}=${filterData[key].value}`);
      } else {
        queryParams.push(`${key}=${filterData[key]}`);
      }
    }
  }
  return queryParams.join("&");
};

 
export const getUserType = ()=>{
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem("userType"));
  }
}

export const fetchImage = async (url) => {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
        return null;
    }
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
        });
        if (!response.ok) {
            return null;
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.warn('fetchImage failed:', error);
        return null;
    }
};

// Function to handle file URLs and convert internal IP addresses to accessible URLs
export const getAccessibleFileUrl = async (url) => {
  if (!url || typeof url !== 'string') return url;

  // Relative paths from legacy seed data → full upload URL
  if (!/^https?:\/\//i.test(url.trim())) {
    const apiBase = (process.env.REACT_APP_AUTH_API_BASE_URL || 'http://localhost:8000/vendor-portal').trim();
    const normalized = url.replace(/\\/g, '/');
    url = `${apiBase.replace(/\/$/, '')}/uploads/${normalized}`;
  }
  
  // Check if it's an internal IP address URL that might cause connection issues
  if (url.includes(process.env.REACT_APP_AUTH_API_BASE_URL) || url.includes('localhost:8000')) {
    try {
      // Get the authentication token
      const token = sessionStorage.getItem('secondaryToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Make an authenticated request to get the file as blob
      const response = await fetch(url, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Create a blob URL from the response
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (error) {
      console.error('Error fetching file:', error);
      // Return the original URL as fallback
      return url;
    }
  }
  return url;
};

// Function to check if a URL is an internal IP address
export const isInternalUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('10.45.1.96:8000') || url.includes('localhost:8000');
};

// Function to download file with proper authentication
export const downloadFile = async (url, filename) => {
  try {
    const token = sessionStorage.getItem('secondaryToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
};

// Function to format input value to allow only numbers with specified decimal places
export const formatDecimalInput = (value, decimalPlaces = 2) => {
  let inputValue = value;
  // Allow only numbers and one decimal point
  inputValue = inputValue.replace(/[^0-9.]/g, '');
  // Prevent multiple decimal points
  const parts = inputValue.split('.');
  if (parts.length > 2) {
    inputValue = parts[0] + '.' + parts.slice(1).join('');
  }
  // Limit to specified decimal places
  if (parts.length === 2 && parts[1].length > decimalPlaces) {
    inputValue = parts[0] + '.' + parts[1].slice(0, decimalPlaces);
  }
  return inputValue;
};

// Function to handle keydown event for decimal input validation
export const handleDecimalKeyDown = (e, decimalPlaces = 2) => {
  // Prevent invalid characters
  if (["-", "+", "e", "E"].includes(e.key)) {
    e.preventDefault();
    return;
  }
  
  // Check if trying to add more decimal places
  const value = e.target.value || '';
  const decimalIndex = value.indexOf('.');
  const cursorPosition = e.target.selectionStart;
  
  if (
    decimalIndex !== -1 &&
    cursorPosition > decimalIndex &&
    value.split('.')[1]?.length >= decimalPlaces &&
    e.key !== 'Backspace' &&
    e.key !== 'Delete' &&
    e.key !== 'ArrowLeft' &&
    e.key !== 'ArrowRight' &&
    e.key !== 'Tab' &&
    !e.ctrlKey &&
    !e.metaKey
  ) {
    e.preventDefault();
  }
};