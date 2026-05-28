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

  test('rollbackLastMoveOf 应移除该玩家最后一手及其后续所有棋步', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    rm.recordMove(roomId, { row: 8, col: 8, player: 'white' })
    const result = rm.rollbackLastMoveOf(roomId, 'white')
    assert.equal(result, 'white')
    const room = rm.getRoom(roomId)
    assert.equal(room.moves.length, 1)
    assert.deepEqual(room.moves[0], { row: 7, col: 7, player: 'black' })
    assert.equal(room.currentPlayer, 'white')
  })

  test('rollbackLastMoveOf 应同时删除请求方之后的对手应手', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    // 黑 B1 → 白 W1 → 黑 B2
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    rm.recordMove(roomId, { row: 8, col: 8, player: 'white' })
    rm.recordMove(roomId, { row: 9, col: 9, player: 'black' })
    // 白方请求悔棋：客户端 UNDO 会撤回 2 步（W1 + B2）
    const result = rm.rollbackLastMoveOf(roomId, 'white')
    assert.equal(result, 'white')
    const room = rm.getRoom(roomId)
    // splice(i) 删除 white 最后一手及其后所有棋步
    assert.equal(room.moves.length, 1, '应只保留黑方 B1')
    assert.deepEqual(room.moves[0], { row: 7, col: 7, player: 'black' })
  })

  test('rollbackLastMoveOf 空 moves 应安全返回', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    const result = rm.rollbackLastMoveOf(roomId, 'black')
    assert.equal(result, 'black')
    const room = rm.getRoom(roomId)
    assert.equal(room.moves.length, 0)
    assert.equal(room.currentPlayer, 'black')
  })

  test('rollbackLastMoveOf 该玩家只有一手时应正确移除', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    const result = rm.rollbackLastMoveOf(roomId, 'black')
    assert.equal(result, 'black')
    const room = rm.getRoom(roomId)
    assert.equal(room.moves.length, 0)
    assert.equal(room.currentPlayer, 'black')
  })

  test('rollbackLastMoveOf 不存在的房间返回 null', () => {
    const rm = createRoomManager()
    const result = rm.rollbackLastMoveOf('NOTEXIST', 'black')
    assert.equal(result, null)
  })

  test('resetGame 应在 ended 状态下重置房间', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    rm.recordMove(roomId, { row: 7, col: 7, player: 'black' })
    const room = rm.getRoom(roomId)
    room.status = 'ended' // 模拟超时判负
    const result = rm.resetGame(roomId)
    assert.equal(result, true)
    const reset = rm.getRoom(roomId)
    assert.equal(reset.moves.length, 0)
    assert.equal(reset.status, 'playing')
    assert.equal(reset.currentPlayer, 'black')
    assert.equal(reset.undoRequester, null)
  })

  test('resetGame 非 ended 状态应返回 false', () => {
    const rm = createRoomManager()
    const roomId = rm.createRoom('socket1')
    rm.joinRoom(roomId, 'socket2')
    const result = rm.resetGame(roomId) // status is 'playing'
    assert.equal(result, false)
  })

  test('resetGame 不存在的房间应返回 false', () => {
    const rm = createRoomManager()
    const result = rm.resetGame('NOTEXIST')
    assert.equal(result, false)
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
