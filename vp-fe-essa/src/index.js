import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import reportWebVitals from './reportWebVitals'
import './assets/scss/abstracts/abstracts.scss'
import './assets/scss/main.scss'
import './assets/scss/essa/toast.scss'
import App from 'App'
import { ThemeProvider } from 'styled-components'
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles'
import { theme } from './theme'
import { MUITheme } from './MuiTheme'
import { Provider } from 'react-redux'
import { store, persistor } from './redux/store'
import { PersistGate } from 'redux-persist/integration/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ToastMessage from 'components/Common/ToastMessage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000
    }
  }
})

function RootApp() {
  const [rehydrated, setRehydrated] = useState(false)

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <PersistGate
          persistor={persistor}
          loading={null} // optional: replace with loader
          onBeforeLift={() => setRehydrated(true)}
        >
          {rehydrated && (
            <MUIThemeProvider theme={MUITheme}>
              <ThemeProvider theme={theme}>
                <App />
                <ToastMessage />
              </ThemeProvider>
            </MUIThemeProvider>
          )}
        </PersistGate>
      </QueryClientProvider>
    </Provider>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
)

reportWebVitals()
