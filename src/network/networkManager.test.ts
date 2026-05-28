import { describe, test, expect, vi, beforeEach } from 'vitest'
import { io } from 'socket.io-client'
import { NetworkManager } from './networkManager'

// 模拟 socket.io-client
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(),
  }
})

type Listener = (...args: unknown[]) => void

function createFakeSocket() {
  const listeners = new Map<string, Listener>()
  return {
    on: vi.fn((event: string, cb: Listener) => {
      listeners.set(event, cb)
    }),
    off: vi.fn((event: string) => {
      listeners.delete(event)
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'fake-id',
    // 测试辅助：触发事件
    __trigger: (event: string, ...args: unknown[]) => {
      const cb = listeners.get(event)
      if (cb) cb(...args)
    },
  }
}

describe('NetworkManager - 连接生命周期事件', () => {
  let networkManager: NetworkManager
  let fakeSocket: ReturnType<typeof createFakeSocket>

  beforeEach(() => {
    vi.clearAllMocks()
    fakeSocket = createFakeSocket()
    vi.mocked(io).mockReturnValue(fakeSocket as unknown as ReturnType<typeof io>)
    networkManager = new NetworkManager()
  })

  test('connect() 后应注册 connect_error 监听器', () => {
    networkManager.connect('http://localhost:3001')

    const connectErrorCall = fakeSocket.on.mock.calls.find(
      (call) => call[0] === 'connect_error'
    )
    expect(connectErrorCall).toBeDefined()
  })

  test('connect_error 触发时应调用 handler.onConnectError 并携带错误', () => {
    networkManager.connect('http://localhost:3001')

    const onConnectError = vi.fn()
    networkManager.setHandlers({
      onGameStart: vi.fn(),
      onOpponentMove: vi.fn(),
      onUndoRequested: vi.fn(),
      onUndoResponded: vi.fn(),
      onOpponentChat: vi.fn(),
      onOpponentResigned: vi.fn(),
      onOpponentDisconnected: vi.fn(),
      onOpponentReconnected: vi.fn(),
      onOpponentTimeout: vi.fn(),
      onMoveTimerStart: vi.fn(),
      onMoveTimeout: vi.fn(),
      onGameReset: vi.fn(),
      onOpponentLeft: vi.fn(),
      onConnectError,
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
    })

    const err = new Error('xhr poll error')
    fakeSocket.__trigger('connect_error', err)

    expect(onConnectError).toHaveBeenCalledOnce()
    expect(onConnectError).toHaveBeenCalledWith(err)
  })

  test('connect 事件触发时应调用 handler.onConnect', () => {
    networkManager.connect('http://localhost:3001')

    const onConnect = vi.fn()
    networkManager.setHandlers({
      onGameStart: vi.fn(),
      onOpponentMove: vi.fn(),
      onUndoRequested: vi.fn(),
      onUndoResponded: vi.fn(),
      onOpponentChat: vi.fn(),
      onOpponentResigned: vi.fn(),
      onOpponentDisconnected: vi.fn(),
      onOpponentReconnected: vi.fn(),
      onOpponentTimeout: vi.fn(),
      onMoveTimerStart: vi.fn(),
      onMoveTimeout: vi.fn(),
      onGameReset: vi.fn(),
      onOpponentLeft: vi.fn(),
      onConnectError: vi.fn(),
      onConnect,
      onDisconnect: vi.fn(),
    })

    fakeSocket.__trigger('connect')

    expect(onConnect).toHaveBeenCalledOnce()
  })

  test('disconnect 事件触发时应调用 handler.onDisconnect', () => {
    networkManager.connect('http://localhost:3001')

    const onDisconnect = vi.fn()
    networkManager.setHandlers({
      onGameStart: vi.fn(),
      onOpponentMove: vi.fn(),
      onUndoRequested: vi.fn(),
      onUndoResponded: vi.fn(),
      onOpponentChat: vi.fn(),
      onOpponentResigned: vi.fn(),
      onOpponentDisconnected: vi.fn(),
      onOpponentReconnected: vi.fn(),
      onOpponentTimeout: vi.fn(),
      onMoveTimerStart: vi.fn(),
      onMoveTimeout: vi.fn(),
      onGameReset: vi.fn(),
      onOpponentLeft: vi.fn(),
      onConnectError: vi.fn(),
      onConnect: vi.fn(),
      onDisconnect,
    })

    fakeSocket.__trigger('disconnect', 'transport close')

    expect(onDisconnect).toHaveBeenCalledOnce()
  })

  test('未连接时调用 createRoom 应立即 reject 而非 hang', async () => {
    networkManager.connect('http://localhost:3001')
    // socket.connected 仍为 false

    await expect(networkManager.createRoom()).rejects.toThrow(/未连接|未就绪|not connected/i)
  })

  test('未连接时调用 joinRoom 应立即 reject 而非 hang', async () => {
    networkManager.connect('http://localhost:3001')

    await expect(networkManager.joinRoom('ABC123')).rejects.toThrow(/未连接|未就绪|not connected/i)
  })

  test('connect() 使用 websocket transport 避免 polling 刷屏', () => {
    networkManager.connect('http://localhost:3001')

    const ioCall = vi.mocked(io).mock.calls[0]
    const opts = ioCall[1] as { transports?: string[] }
    expect(opts.transports).toEqual(['websocket'])
  })
})
