// src/components/ClaimPlayerScreen.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimPlayerScreen } from './ClaimPlayerScreen';

const mockPlayers = [
  { _id: 'p1', name: 'Ash', avatar: null },
  { _id: 'p2', name: 'Misty', avatar: null },
];

test('affiche la liste des joueurs disponibles', () => {
  render(
    <ClaimPlayerScreen
      availablePlayers={mockPlayers}
      onClaim={jest.fn()}
      onCreatePlayer={jest.fn()}
      loading={false}
    />
  );
  expect(screen.getByText('Ash')).toBeInTheDocument();
  expect(screen.getByText('Misty')).toBeInTheDocument();
});

test('affiche l\'option de création', () => {
  render(
    <ClaimPlayerScreen
      availablePlayers={mockPlayers}
      onClaim={jest.fn()}
      onCreatePlayer={jest.fn()}
      loading={false}
    />
  );
  expect(screen.getByText(/Créer mon profil/i)).toBeInTheDocument();
});

test('appelle onClaim avec le bon playerId', () => {
  const mockClaim = jest.fn();
  render(
    <ClaimPlayerScreen
      availablePlayers={mockPlayers}
      onClaim={mockClaim}
      onCreatePlayer={jest.fn()}
      loading={false}
    />
  );
  fireEvent.click(screen.getByText('Ash'));
  expect(mockClaim).toHaveBeenCalledWith('p1');
});

test('affiche une erreur si le nom est vide ou seulement des espaces', () => {
  const mockCreatePlayer = jest.fn();
  render(
    <ClaimPlayerScreen
      availablePlayers={mockPlayers}
      onClaim={jest.fn()}
      onCreatePlayer={mockCreatePlayer}
      loading={false}
    />
  );

  // Open the create form
  fireEvent.click(screen.getByText('Créer mon profil'));

  // Leave name empty and click submit
  fireEvent.click(screen.getByText('Créer mon profil'));

  expect(screen.getByText('Donne un nom à ton profil.')).toBeInTheDocument();
  expect(mockCreatePlayer).not.toHaveBeenCalled();
});

test('appelle onCreatePlayer avec le bon { name, avatar } à la soumission du formulaire', async () => {
  const mockCreatePlayer = jest.fn();
  render(
    <ClaimPlayerScreen
      availablePlayers={mockPlayers}
      onClaim={jest.fn()}
      onCreatePlayer={mockCreatePlayer}
      loading={false}
    />
  );

  // Open the create form (the initial "Créer mon profil" button)
  fireEvent.click(screen.getByText('Créer mon profil'));

  // Fill in the name input
  const input = screen.getByPlaceholderText('Ton nom de joueur');
  fireEvent.change(input, { target: { value: 'Gary' } });

  // Click the submit button (also labelled "Créer mon profil", now enabled)
  fireEvent.click(screen.getByText('Créer mon profil'));

  expect(mockCreatePlayer).toHaveBeenCalledWith({ name: 'Gary', avatar: null });
});
