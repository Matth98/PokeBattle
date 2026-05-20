// src/hooks/useAuth.test.js
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';

jest.mock('../firebase', () => ({ auth: {} }));

const mockDbUser = { _id: 'u1', playerId: null, role: 'user' };

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => {
    cb({ uid: 'abc', getIdToken: () => Promise.resolve('tok') });
    return () => {};
  },
  GoogleAuthProvider: jest.fn(),
  OAuthProvider:      jest.fn().mockImplementation(() => ({ addScope: jest.fn() })),
  signInWithPopup:    jest.fn(),
  signOut:            jest.fn(),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockDbUser,
  });
});

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

test('useAuth expose dbUser après chargement', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.dbUser).not.toBeNull());
  expect(result.current.dbUser.role).toBe('user');
});

test('isSuperAdmin est false pour un user standard', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.dbUser).not.toBeNull());
  expect(result.current.isSuperAdmin).toBe(false);
});

test('useAuth expose refetchDbUser comme une fonction', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.dbUser).not.toBeNull());
  expect(typeof result.current.refetchDbUser).toBe('function');
});
