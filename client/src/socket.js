import { io } from 'socket.io-client'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5174' // EDIT in client/.env
export default io(API, { autoConnect: false, transports: ['websocket'] })
