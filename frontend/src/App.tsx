import { CVEDemo } from './components/CVEDemo/CVEDemo'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <CVEDemo />
      </div>
    </ErrorBoundary>
  )
}

export default App
