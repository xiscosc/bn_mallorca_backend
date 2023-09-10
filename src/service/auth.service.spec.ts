import { when } from 'jest-when'
import { verify } from 'jsonwebtoken'
import { AuthService } from './auth.service'
import { getSecretValue } from '../net/secrets-manager'

jest.mock('../net/secrets-manager')
jest.mock('jsonwebtoken')
jest.mock('lambda-log')

beforeEach(() => {
  jest.clearAllMocks()
})

test('JWT secret can not be retrieved', async () => {
  const service = new AuthService()
  when(getSecretValue).mockResolvedValue(undefined)
  await expect(service.isValidJwt('')).rejects.toThrow('Could not load JWT secret')
  expect(verify).toBeCalledTimes(0)
})

test('Valid jwt', async () => {
  const service = new AuthService()
  when(getSecretValue).mockResolvedValue('secret1')
  when(verify).mockReturnValue()

  const result = await service.isValidJwt('token1')
  expect(verify).toBeCalledTimes(1)
  expect(verify).toBeCalledWith('token1', 'secret1', { complete: true, ignoreExpiration: false })
  expect(result).toBeTruthy()
})

test('Invalid jwt', async () => {
  const service = new AuthService()
  when(getSecretValue).mockResolvedValue('secret1')
  when(verify).mockImplementation((...args) => {
    throw Error(`${args}`)
  })

  const result = await service.isValidJwt('token1')
  expect(verify).toBeCalledTimes(1)
  expect(verify).toBeCalledWith('token1', 'secret1', { complete: true, ignoreExpiration: false })
  expect(result).toBeFalsy()
})
