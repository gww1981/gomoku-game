const ROOM_ID_LENGTH = 6
const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RECONNECT_TIMEOUT = 60000

function generateRoomId() {
  let id = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  }
  return id
}

export function createRoomManager() {
  const rooms = new Map()

  return {
    createRoom(socketId) {
      let roomId
      do {
        roomId = generateRoomId()
      } while (rooms.has(roomId))

      rooms.set(roomId, {
        roomId,
        blackId: socketId,
        whiteId: null,
        moves: [],
        status: 'waiting',
        disconnectedAt: null,
      })
      return roomId
    },

    joinRoom(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return { success: false, error: '房间不存在' }
      if (room.status !== 'waiting') return { success: false, error: '房间已满' }
      if (room.whiteId) return { success: false, error: '房间已满' }

      room.whiteId = socketId
      room.status = 'playing'
      return { success: true, role: 'white' }
    },

    leaveRoom(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return null
      if (room.blackId !== socketId && room.whiteId !== socketId) return null
      room.status = 'finished'
      return room
    },

    getRoom(roomId) {
      return rooms.get(roomId) || null
    },

    getRoomBySocket(socketId) {
      for (const room of rooms.values()) {
        if (room.blackId === socketId || room.whiteId === socketId) return room
      }
      return null
    },

    recordMove(roomId, move) {
      const room = rooms.get(roomId)
      if (room) room.moves.push(move)
    },

    getOpponentId(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return null
      if (room.blackId === socketId) return room.whiteId
      if (room.whiteId === socketId) return room.blackId
      return null
    },

    markDisconnected(roomId, socketId) {
      const room = rooms.get(roomId)
      if (!room) return
      room.disconnectedAt = Date.now()
    },

    reconnect(roomId, socketId, newSocketId) {
      const room = rooms.get(roomId)
      if (!room) return { success: false, error: '房间不存在' }
      if (room.disconnectedAt === null) return { success: false, error: '房间未断线' }

      if (room.blackId === socketId) room.blackId = newSocketId
      else if (room.whiteId === socketId) room.whiteId = newSocketId
      else return { success: false, error: '非房间成员' }

      room.disconnectedAt = null
      return { success: true, moves: room.moves }
    },

    checkTimeout(roomId) {
      const room = rooms.get(roomId)
      if (!room || room.disconnectedAt === null) return null
      if (Date.now() - room.disconnectedAt > RECONNECT_TIMEOUT) {
        const disconnectedPlayer = room.disconnectedAt ? 'timeout' : null
        room.status = 'finished'
        return room
      }
      return null
    },

    deleteRoom(roomId) {
      rooms.delete(roomId)
    },
  }
}
