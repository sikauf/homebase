import { seedDemoData } from './db/schema'
import { createApp } from './app'

const port = process.env.PORT ? Number(process.env.PORT) : 3001

seedDemoData()

createApp().listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
