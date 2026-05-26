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
        currentPlayer: 'black',
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
      if (room) {
        room.moves.push(move)
        room.currentPlayer = move.player === 'black' ? 'white' : 'black'
      }
    },

    setCurrentPlayer(roomId, player) {
      const room = rooms.get(roomId)
      if (room) room.currentPlayer = player
    },

    // 悔棋：从尾部移除最后一手属于 player 的棋，返回悔棋后的 currentPlayer
    rollbackLastMoveOf(roomId, player) {
      const room = rooms.get(roomId)
      if (!room) return null
      // 从后往前找到该玩家最后一手并移除
      for (let i = room.moves.length - 1; i >= 0; i--) {
        if (room.moves[i].player === player) {
          room.moves.splice(i, 1)
          break
        }
      }
      // 悔棋后轮到 player 自己重新下
      room.currentPlayer = player
      return player
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
