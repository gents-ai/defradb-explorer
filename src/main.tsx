import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, DEFAULT_HOST, DEFAULT_TOKEN } from './context/ConfigContext'
import { useConnectionStore } from './store/connectionStore'
import { activateConnection } from './store/uiStore'
import './index.css'
import App from './App'

useConnectionStore.getState().boot(DEFAULT_HOST, DEFAULT_TOKEN)
activateConnection(useConnectionStore.getState().activeConnectionId)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
