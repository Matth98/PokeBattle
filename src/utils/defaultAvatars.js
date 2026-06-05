const DEFAULT_AVATARS = [
  '/avatars/lilie.png',
  '/avatars/cynthia.png',
  '/avatars/erika.png',
  '/avatars/professeur_chen.png',
  '/avatars/pepper.png',
  '/avatars/gladio.png',
  '/avatars/serena.png',
  '/avatars/giovanni.png',
  '/avatars/mashynn.png',
  '/avatars/red.jpg',
];

export function getRandomDefaultAvatar() {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}
