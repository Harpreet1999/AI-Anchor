import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Tells the boot skeleton (index.html) the real app has actually
// mounted, so it can reveal on a real signal instead of blind timing —
// see that file's own script for what happens if this never fires.
window.dispatchEvent(new Event('app-ready'))
