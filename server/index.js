import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import os from 'os'
import { createRoomManager } from './roomManager.js'

const PORT = process.env.PORT || 3001
const RECONNECT_TIMEOUT_MS = 60000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  // 仅适合内网环境，公网部署请改为白名单
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
})

const roomManager = createRoomManager()
const timeoutHandles = new Map() // roomId -> timeoutId

// 显示本机局域网 IP
function getLocalIP() {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return 'localhost'
}

io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id}`)

  socket.on('create-room', (callback) => {
    const roomId = roomManager.createRoom(socket.id)
    socket.join(roomId)
    console.log(`[创建房间] ${roomId} by ${socket.id}`)
    callback({ roomId })
  })

  socket.on('join-room', ({ roomId }, callback) => {
    const result = roomManager.joinRoom(roomId, socket.id)
    if (result.success) {
      socket.join(roomId)
      const room = roomManager.getRoom(roomId)
      io.to(roomId).emit('game-start', { blackId: room.blackId, whiteId: room.whiteId })
      console.log(`[加入房间] ${socket.id} -> ${roomId}`)
    }
    callback(result)
  })

  socket.on('move', ({ roomId, row, col, player }) => {
    roomManager.recordMove(roomId, { row, col, player })
    socket.to(roomId).emit('opponent-move', { row, col, player })
  })

  socket.on('request-undo', ({ roomId }) => {
    socket.to(roomId).emit('undo-requested')
  })

  socket.on('respond-undo', ({ roomId, accepted }) => {
    socket.to(roomId).emit('undo-responded', { accepted })
  })

  socket.on('chat', ({ roomId, message }) => {
    socket.to(roomId).emit('opponent-chat', { message })
  })

  socket.on('resign', ({ roomId }) => {
    socket.to(roomId).emit('opponent-resigned')
  })

  socket.on('disconnect', () => {
    console.log(`[断开] ${socket.id}`)
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    if (room.status === 'waiting') {
      // 房主在等待加入时离开，直接清理
      console.log(`[清理 waiting 房间] ${room.roomId}`)
      roomManager.deleteRoom(room.roomId)
      return
    }

    if (room.status === 'playing') {
      roomManager.markDisconnected(room.roomId, socket.id)
      socket.to(room.roomId).emit('opponent-disconnected')

      // 60 秒后未重连判离线方负
      const handle = setTimeout(() => {
        const r = roomManager.getRoom(room.roomId)
        if (r && r.disconnectedAt !== null) {
          console.log(`[超时判负] ${room.roomId}`)
          io.to(room.roomId).emit('opponent-timeout')
          roomManager.deleteRoom(room.roomId)
        }
        timeoutHandles.delete(room.roomId)
      }, RECONNECT_TIMEOUT_MS)
      timeoutHandles.set(room.roomId, handle)
    }
  })

  socket.on('reconnect', ({ roomId, oldSocketId }, callback) => {
    const result = roomManager.reconnect(roomId, oldSocketId, socket.id)
    if (result.success) {
      socket.join(roomId)
      const handle = timeoutHandles.get(roomId)
      if (handle) {
        clearTimeout(handle)
        timeoutHandles.delete(roomId)
      }
      io.to(roomId).emit('opponent-reconnected')
    }
    callback(result)
  })

  socket.on('leave-room', ({ roomId }) => {
    if (!roomId) return
    socket.to(roomId).emit('opponent-left')
    roomManager.deleteRoom(roomId)
    const handle = timeoutHandles.get(roomId)
    if (handle) {
      clearTimeout(handle)
      timeoutHandles.delete(roomId)
    }
    socket.leave(roomId)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[服务端] 运行在 http://localhost:${PORT}`)
  console.log(`[局域网] 分享给对方: http://${getLocalIP()}:3001`)
})
