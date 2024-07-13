import { useEffect } from "react"

const worker = new SharedWorker(new URL('./nes-runner-worker.ts', import.meta.url), {
  type: 'module'
})

worker.port.onmessage = (e) => {
  if (e.data.type === "ping") {
    console.log("PING", e.data.data)
    return
  } else if (e.data.type === "screen") {
    const canvas = document.getElementById("screen") as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(e.data.data, 0, 0)
  }
}

function Screen() {
  return <div>
    <canvas id="screen" width={256 * 2} height={240 * 2}
      className=""
    />
  </div>
}
function App() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      worker.port.postMessage({ type: "keydown", key: e.key })
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="p-4 pt-1 font-mono">
      <h2 className="text-red-300 text-3xl">Nes</h2>
      <div className="flex flex-wrap space-x-1">
        <div>
          <Screen />
        </div>
      </div>
    </div>
  )
}

export default App
