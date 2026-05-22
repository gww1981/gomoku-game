import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRoomManager } from './roomManager.js'

describe('roomManager', () => {
  test('createRoom 应生成 6 位房间号', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    assert.equal(typeof roomId, 'string')
    assert.equal(roomId.length, 6)
  })

  test('joinRoom 成功后第二人为白方', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    const result = rm.joinRoom(roomId, 'socket2')
    assert.equal(result.success, true)
    assert.equal(result.role, 'white')
  })

  test('joinRoom 不存在的房间应失败', () => {
    const rm = createRoomManager()
    const result = rm.joinRoom('NOTEXIST', 'socket2')
    assert.equal(result.success, false)
  })

  test('joinRoom 已满房间应失败', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    const result = rm.joinRoom(roomId, 'socket3')
    assert.equal(result.success, false)
  })

  test('getOpponentId 返回对方 socketId', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    assert.equal(rm.getOpponentId(roomId, 'socket1'), 'socket2')
    assert.equal(rm.getOpponentId(roomId, 'socket2'), 'socket1')
  })

  test('recordMove 应追加到房间走子历史', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    const room = rm.getRoom(roomId)
    assert.equal(room.moves.length, 1)
    assert.deepEqual(room.moves[0], { row: 7, col: 7, player: 'black' })
  })

  test('reconnect 成功后返回完整 moves 历史', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    rm.markDisconnected(roomId, 'socket1')
    const result = rm.reconnect(roomId, 'socket1', 'socket1-new')
    assert.equal(result.success, true)
    assert.equal(result.moves.length, 1)
    const room = rm.getRoom(roomId)
    assert.equal(room.blackId, 'socket1-new')
  })
})
