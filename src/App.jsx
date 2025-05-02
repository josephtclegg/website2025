import { useState } from 'react'
import './App.css'
import FyiBanner from './components/FyiBanner';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <FyiBanner />
    </>
  )
}

export default App
