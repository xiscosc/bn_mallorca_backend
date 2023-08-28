import { ProxyResult } from 'aws-lambda'

export function stringIsValid(value: string | null): boolean {
  return !(value === null || value === undefined || value.replace(' ', '').length === 0)
}

export function getBadRequest(message: object): ProxyResult {
  return {
    statusCode: 400,
    body: JSON.stringify(message),
  }
}
