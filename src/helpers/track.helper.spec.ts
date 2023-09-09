import { isBNTrack } from './track.helper'

test('finds bn mallorca tracks', async () => {
  expect(isBNTrack({ artist: 'bn mallorca', name: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ artist: 'bn mallorca'.toUpperCase(), name: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ artist: 'BN mallorca', name: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ artist: 'publicidad', name: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ artist: 'bn mca', name: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ artist: 'bn mca'.toUpperCase(), name: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ artist: 'PuBlICIdad', name: 'ad 1' })).toBeTruthy()

  expect(isBNTrack({ name: 'bn mallorca', artist: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ name: 'bn mallorca'.toUpperCase(), artist: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ name: 'BN mallorca', artist: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ name: 'publicidad', artist: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ name: 'bn mca', artist: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ name: 'bn mca'.toUpperCase(), artist: 'ad 1' })).toBeTruthy()
  expect(isBNTrack({ name: 'PuBlICIdad', artist: 'ad 1' })).toBeTruthy()

  expect(isBNTrack({ name: 'Holiday in mallorca', artist: 'BN Singer' })).toBeFalsy()
})
