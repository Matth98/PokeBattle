// src/hooks/useAPI.test.js
import { renderHook, act } from '@testing-library/react';
import { useAPI } from './useAPI';

// Mock firebase auth
jest.mock('../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: () => Promise.resolve('mock-token'),
    },
  },
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => [],
});

beforeEach(() => {
  fetch.mockClear();
});

test('fetchPlayers envoie le header Authorization', async () => {
  const { result } = renderHook(() => useAPI());
  await act(async () => {
    await result.current.fetchPlayers();
  });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/players'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
    })
  );
});

test('createPlayer envoie le header Authorization', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ _id: '1', name: 'Ash' }) });
  const { result } = renderHook(() => useAPI());
  await act(async () => {
    await result.current.createPlayer({ name: 'Ash' });
  });
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/players'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
    })
  );
});
