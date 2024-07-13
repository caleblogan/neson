import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import DebugApp from './DebugApp.tsx'


ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <DebugApp />
  // </React.StrictMode>,
)
