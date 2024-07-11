import { useContext } from "react"
import { NesContext } from "./context"

function Screen() {
  return <div>
    <canvas id="screen" width={283 * 2} height={242 * 2}
      className="border-2 border-black"
    />
  </div>
}

function PatternDebugScreen({ id }: { id: number }) {
  return <div>
    <p>Table: {id}</p>
    <canvas id="screen" width={128} height={128}
      className="border-2 border-black"
    />
  </div>
}

function App() {
  const nes = useContext(NesContext)
  console.log(nes)
  return (
    <div className="p-4">
      <h1 className='text-3xl text-red-300'>hi nes</h1>

      <div className="flex">
        <Screen />
        <PatternDebugScreen id={0} />
        <PatternDebugScreen id={1} />
      </div>
    </div>
  )
}

export default App
