import { CVEList } from './components/CVEList/CVEList'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <CVEList />
      </div>
    </ErrorBoundary>
  )
}

export default App
