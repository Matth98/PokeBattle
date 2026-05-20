// src/components/LoginScreen.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginScreen } from './LoginScreen';

test('affiche les deux boutons de connexion', () => {
  render(<LoginScreen onSignInWithGoogle={() => {}} onSignInWithApple={() => {}} />);
  expect(screen.getByText(/Continuer avec Google/i)).toBeInTheDocument();
  expect(screen.getByText(/Continuer avec Apple/i)).toBeInTheDocument();
});

test('appelle onSignInWithGoogle au clic', () => {
  const mockGoogle = jest.fn();
  render(<LoginScreen onSignInWithGoogle={mockGoogle} onSignInWithApple={() => {}} />);
  fireEvent.click(screen.getByText(/Continuer avec Google/i));
  expect(mockGoogle).toHaveBeenCalledTimes(1);
});
