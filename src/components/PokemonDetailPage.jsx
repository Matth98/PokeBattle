import React, { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import { TYPE_FR, TYPE_COLORS, TYPE_HEX, TYPE_HEX_DARK } from '../hooks/usePokemonTypes';
import { useTranslation } from '../hooks/useTranslation';
import { TabBar, StrategyTab, MovesTab } from './PokemonStrategyTab';

const ALL_TYPES = Object.keys(TYPE_HEX);

/* ── Formes géométriques par type pour le Hero ── */
const HERO_SHAPES = {
  normal: [
    { el:'circle', cx:350, cy:40,  r:110, opacity:0.17 },
    { el:'circle', cx:55,  cy:225, r:85,  opacity:0.11 },
    { el:'circle', cx:385, cy:250, r:55,  opacity:0.07 },
  ],
  fire: [
    { el:'polygon', points:'200,-10 400,260 0,260',     opacity:0.16 },
    { el:'polygon', points:'330,-30 430,120 230,120',   opacity:0.12 },
    { el:'polygon', points:'-30,70 80,280 -140,280',    opacity:0.09 },
  ],
  water: [
    { el:'circle', cx:335, cy:50,  r:125, opacity:0.15 },
    { el:'circle', cx:60,  cy:215, r:90,  opacity:0.10 },
    { el:'circle', cx:365, cy:240, r:58,  opacity:0.07 },
  ],
  electric: [
    { el:'polygon', points:'230,-10 280,-10 160,290 110,290', opacity:0.17 },
    { el:'polygon', points:'330,-10 380,-10 260,290 210,290', opacity:0.12 },
    { el:'polygon', points:'80,-10 130,-10 10,290 -40,290',  opacity:0.08 },
  ],
  grass: [
    { el:'polygon', points:'450,40 400,127 300,127 250,40 300,-47 400,-47',   opacity:0.16 },
    { el:'polygon', points:'130,220 90,289 10,289 -30,220 10,151 90,151',     opacity:0.11 },
    { el:'polygon', points:'375,220 348,268 293,268 265,220 293,172 348,172', opacity:0.08 },
  ],
  ice: [
    { el:'polygon', points:'460,-20 415,68 325,68 280,-20 325,-108 415,-108',   opacity:0.17 },
    { el:'polygon', points:'140,225 98,302 14,302 -28,225 14,148 98,148',       opacity:0.12 },
    { el:'polygon', points:'370,215 344,261 292,261 266,215 292,169 344,169',   opacity:0.08 },
  ],
  fighting: [
    { el:'polygon', points:'300,0 380,80 300,160 220,80',      opacity:0.17 },
    { el:'polygon', points:'80,140 160,220 80,300 0,220',      opacity:0.12 },
    { el:'polygon', points:'360,180 410,230 360,280 310,230',  opacity:0.08 },
  ],
  poison: [
    { el:'polygon', points:'400,50 355,137 265,137 220,50 265,-37 355,-37',   opacity:0.16 },
    { el:'polygon', points:'100,200 60,270 -20,270 -60,200 -20,130 60,130',   opacity:0.11 },
    { el:'polygon', points:'330,210 304,256 252,256 226,210 252,164 304,164', opacity:0.08 },
  ],
  ground: [
    { el:'polygon', points:'-20,70 420,70 420,140 -20,140',    opacity:0.16 },
    { el:'polygon', points:'-40,155 440,155 420,220 -20,220',  opacity:0.12 },
    { el:'polygon', points:'-60,235 460,235 430,290 -30,290',  opacity:0.08 },
  ],
  flying: [
    { el:'ellipse', cx:100, cy:30,  rx:190, ry:100, opacity:0.13 },
    { el:'ellipse', cx:360, cy:230, rx:150, ry:90,  opacity:0.10 },
    { el:'ellipse', cx:200, cy:150, rx:110, ry:65,  opacity:0.07 },
  ],
  psychic: [
    { el:'circle', cx:200, cy:80, r:150, fill:'none', stroke:'white', strokeWidth:25, opacity:0.13 },
    { el:'circle', cx:200, cy:80, r:95,  fill:'none', stroke:'white', strokeWidth:18, opacity:0.16 },
    { el:'circle', cx:200, cy:80, r:48,  opacity:0.18 },
    { el:'circle', cx:350, cy:235, r:65, opacity:0.08 },
  ],
  bug: [
    { el:'polygon', points:'380,10 360,44 320,44 300,10 320,-24 360,-24',  opacity:0.15 },
    { el:'polygon', points:'420,78 400,112 360,112 340,78 360,44 400,44',  opacity:0.11 },
    { el:'polygon', points:'60,210 40,244 0,244 -20,210 0,176 40,176',     opacity:0.13 },
    { el:'polygon', points:'100,278 80,312 40,312 20,278 40,244 80,244',   opacity:0.09 },
  ],
  rock: [
    { el:'polygon', points:'80,260 0,150 60,40 200,70 210,260',       opacity:0.15 },
    { el:'polygon', points:'240,10 380,-10 430,120 360,210 220,160',  opacity:0.12 },
    { el:'polygon', points:'0,10 90,0 100,100 30,150',               opacity:0.09 },
  ],
  ghost: [
    { el:'path', d:'M320,0 Q420,50 400,160 Q380,270 260,210 Q140,150 200,40 Q240,-10 320,0 Z',          opacity:0.14 },
    { el:'path', d:'M60,140 Q-20,190 10,270 Q40,350 120,290 Q200,230 160,150 Q130,110 60,140 Z',         opacity:0.10 },
    { el:'path', d:'M350,180 Q400,210 390,260 Q380,310 330,280 Q280,250 300,200 Q320,170 350,180 Z',     opacity:0.08 },
  ],
  dragon: [
    { el:'polygon', points:'0,-10 200,-10 400,290 200,290', opacity:0.15 },
    { el:'polygon', points:'280,-10 370,-10 400,60 310,60', opacity:0.12 },
    { el:'polygon', points:'-20,220 60,220 100,290 20,290', opacity:0.09 },
  ],
  dark: [
    { el:'polygon', points:'400,0 400,280 180,280',          opacity:0.17 },
    { el:'polygon', points:'0,0 170,0 0,200',               opacity:0.13 },
    { el:'polygon', points:'150,0 290,0 400,140 400,0',     opacity:0.09 },
  ],
  steel: [
    { el:'circle', cx:200, cy:60, r:150, fill:'none', stroke:'white', strokeWidth:30, opacity:0.12 },
    { el:'circle', cx:200, cy:60, r:90,  fill:'none', stroke:'white', strokeWidth:20, opacity:0.15 },
    { el:'circle', cx:370, cy:240, r:60, opacity:0.09 },
  ],
  fairy: [
    { el:'polygon', points:'300,0 315,44 360,60 315,76 300,120 285,76 240,60 285,44',    opacity:0.17 },
    { el:'polygon', points:'75,158 87,198 130,210 87,222 75,262 63,222 20,210 63,198',   opacity:0.13 },
    { el:'polygon', points:'368,178 376,204 404,214 376,224 368,250 360,224 332,214 360,204', opacity:0.09 },
  ],
};

/* ── Formes de transition bas du Hero — 1 forme unique par type ── */
const BOTTOM_SHAPE_PATH = {
  // Vague douce — neutre
  normal:   'M0,80 L0,52 Q200,38 400,52 L400,80 Z',
  // fire : voir FIRE_BOTTOM_D (tracé détaillé dans son propre repère, traité à part)
  // Vague S (deux arcs opposés)
  water:    'M0,80 L0,48 Q100,5 200,48 Q300,90 400,48 L400,80 Z',
  // Éclair irrégulier
  electric: 'M0,80 L0,55 L80,22 L130,48 L220,6 L270,36 L400,20 L400,80 Z',
  // Feuilles arrondies en S — courbes organiques
  grass:    'M0,80 L0,58 Q30,12 60,48 Q90,72 120,42 Q150,14 180,48 Q210,72 240,42 Q270,14 300,48 Q330,72 360,42 Q385,22 400,50 L400,80 Z',
  // Stalactites de glace — pics très aigus et serrés
  ice:      'M0,80 L0,55 L22,6 L44,50 L66,2 L90,46 L116,0 L142,42 L170,8 L196,46 L222,2 L248,44 L274,10 L300,48 L326,4 L352,46 L376,14 L400,40 L400,80 Z',
  // Coupe diagonale franche
  fighting: 'M0,80 L0,65 L400,18 L400,80 Z',
  // Bulbes de virus — cercles irréguliers qui se chevauchent
  poison:   'M0,80 L0,55 Q18,28 38,50 Q48,62 58,46 Q72,24 92,48 Q106,64 118,48 Q134,24 154,50 Q168,64 180,50 Q196,24 216,50 Q230,64 242,50 Q258,24 278,50 Q292,64 304,50 Q318,24 340,52 Q354,66 366,50 Q380,26 396,50 L400,52 L400,80 Z',
  // Dunes de sable — ondulations douces et amples
  ground:   'M0,80 L0,65 Q70,28 140,55 Q200,72 270,42 Q330,22 400,52 L400,80 Z',
  // Deux ailes arrondies depuis le centre
  flying:   'M0,80 L0,40 Q80,0 165,44 L200,50 L235,44 Q320,0 400,40 L400,80 Z',
  // Arc profond (onde mentale)
  psychic:  'M0,80 L0,38 Q200,-25 400,38 L400,80 Z',
  // Pétales de fleurs — grands arcs arrondis alternés
  bug:      'M0,80 L0,62 Q25,18 50,54 Q65,70 80,54 Q105,18 130,54 Q145,70 160,54 Q185,18 210,54 Q225,70 240,54 Q265,18 290,54 Q305,70 320,54 Q345,18 370,54 Q390,66 400,58 L400,80 Z',
  // Colonnes basaltiques hexagonales — piliers à hauteurs variées
  rock:     'M0,80 L0,55 L18,55 L28,32 L54,32 L64,55 L82,55 L92,18 L118,18 L128,55 L146,55 L156,38 L182,38 L192,55 L210,55 L220,24 L246,24 L256,55 L274,55 L284,42 L310,42 L320,55 L338,55 L348,28 L374,28 L384,55 L400,55 L400,80 Z',
  // Ondulation organique fantomatique
  ghost:    'M0,80 L0,52 Q50,18 100,48 Q150,76 200,36 Q250,4 300,42 Q350,74 400,48 L400,80 Z',
  // Nuages japonais Kumo — bosses rondes empilées
  dragon:   'M0,80 L0,58 Q18,32 36,52 Q46,64 56,46 Q70,26 90,46 Q102,60 114,44 Q128,26 148,44 Q160,58 172,44 Q186,26 206,44 Q218,58 230,44 Q244,26 264,46 Q276,60 288,46 Q302,28 322,46 Q334,60 346,46 Q360,26 380,48 Q392,62 400,52 L400,80 Z',
  // Ectoplasme qui dégoutte — stalactites d'ombre vers le bas
  dark:     'M0,80 L0,20 L16,20 L24,60 L32,20 L55,20 L64,68 L74,20 L96,20 L105,52 L114,20 L138,20 L148,72 L158,20 L180,20 L190,46 L200,20 L222,20 L232,64 L242,20 L266,20 L276,56 L286,20 L308,20 L318,70 L328,20 L350,20 L360,50 L370,20 L392,20 L400,20 L400,80 Z',
  // Arc lisse et régulier (mécanique)
  steel:    'M0,80 L0,50 Q200,18 400,50 L400,80 Z',
  // Feston de pétales (arcs alternés)
  fairy:    'M0,80 L0,58 Q25,26 50,58 Q75,80 100,58 Q125,26 150,58 Q175,80 200,58 Q225,26 250,58 Q275,80 300,58 Q325,26 350,58 Q375,80 400,58 L400,80 Z',
};

/* Feu — tracé fourni, repère natif 1022.97×232.79, flammes vers le haut, plein en bas.
   Scale direct sans flip : sx=400/1022.97≈0.39101, sy=80/232.79≈0.34366 */
const FIRE_BOTTOM_D1 = 'M1011.06,119.9c-3.88-2.03-5.87-6.55-4.94-11.3,2.48-12.77,1.13-26.25-9.02-35.55,2.52,7.98,4.48,14.5,1.97,21.69l-5.13,14.75c-3.03,8.69-2.51,16.9,3.42,23.85l10.55,12.35c3.66,4.28,4.96,10.62,3.16,15.87-1.75,5.07-6.92,7.27-11.13,6.45-12.58-2.44-2-21.39-12.43-30.65-.48-.43-1.36.97-.66,1.4,1.69,4.82.08,9.59-1.44,14.26-6.44,19.75,4.15,22.8,11.11,31.06l8.67,10.28c5.33,6.33,7.44,14.51,5.18,22.61-1.34,4.79-5.34,8.7-10.28,8.93-2.54.12-5.21-1.36-6.27-2.73-4.81-6.25,7.78-19.22-11.95-34.53-4.8-.35,5.2,8.99-.07,14.68-2.61,2.82-7.44.72-9.55-2.03-4.54-5.88-4.83-13.63-2-20.57,6.6-16.21-3.67-27.96-4.71-27.33-1.7,1.03,5.04,10.73-4.46,26.13-4.97,8.05-5.29,16.45-.42,24.41,3.27,5.35,3.96,12.79,1.04,18.12-2.58,4.69-8.45,5.19-12.14,2.56-8.84-6.31,4.07-14.49,2.56-21.48-.51-2.36-1.83-5.71-4.79-6.81.47,3.31,1.44,6.01.01,8.44-1.02,1.72-2.99,2.53-4.57,2.38-1.18-.11-2.54-1.9-3.72-2.79-2.97,1.58,1.16,8.56-2.65,10.09-1.14.45-3.43.32-4.4-.87-2.05-2.52-1.67-5.66-2.1-9.34-4.49,4.34-3.42,10.46.46,15.09,2.25,2.69,3.39,7.4,0,9.47-2.68,1.64-5.98-.56-7.61-2.91-5.76-8.32-4.7-18.56.32-27.35l5.83-10.2c7.04-12.34,4.17-21.24-5.74-31.86.04,5.57,5.37,10.97,2,13.79-1.16.98-3.29,1.14-4.77.04-7.19-5.31-4.66-19.1-3.33-30.2-7.15,10.92-10.82,20.96-5.23,31.8l6.1,11.83c1.84,5.79-.33,12.34-5.91,14.65-2.56,1.05-5.83-.51-5.88-2.87l-.22-10.02c-4.8,4.99-8.38,12.57-4.74,18.97,3.2,5.63,14.81,16.04,6.35,22.02-2.49,1.76-6.02,1.4-9-.58-4.91-3.27-5.85-9.39-5.28-15.45.09-.96-1.06-1.02-1.24-.2-3.77,5.17-2.87,10.89-3.39,16.81-.17,1.97-4.05,1.85-5.45.96-6.27-3.97-5.1-12.45.58-19.92,3.55-4.66,6.31-10.86,3.15-16.45-5.87-10.38-19.98-10.26-21.7-26.72-7.04,11.78,8.09,18.78,11.26,30.66.96,3.6-.28,8.97-4.32,9.26-4.08.29-4.92-4.47-4.89-8.77l-6.22,7.44-3.84,5.55c-7.45-9.21-9.63-20.17-7.92-31.57,3.01-20.14,20.19-33.43,24.79-56.83.97-4.97,1.72-10.1-.07-14.87-5.23-13.96-19.17-23.04-16.73-42.3-.31-1.21-1.54-.79-1.45.27-7.96,23.47,7.79,34.06,8.83,46.94.31,3.86-1.79,7.48-4.48,8.45-3.86,1.4-7.11.06-9.98-2.68-6.81-6.48-6.85-15.67-5.9-25.4-7.79,9.49-7.3,22.05-.8,31.38,2.55,3.67,4.52,7.55,4.48,12.13-.03,2.61-2.22,4.68-4.01,5.49-6.66,3-15-6.95-17.84-18.13-3.55,15.86,8.25,29.02,9.96,42.67,1.26,10.18-2.95,19.67-10.7,20.36-7.15.64-12.55-7.62-12.28-17.87.21-7.79,2.3-15.75-1.6-22.95l-8.1,18.76c-2.68,6.22-5.11,13.17-2.19,19.72,5.22,11.74,15.99,19.53,16.67,30.07.3,4.59-2.79,10.04-7.74,10.17-5.23.13-8.24-5.38-7.61-10.26.84-6.48-.97-12.64-7.37-15.4,2.91,8.31.11,15.72-5.49,20.98-2.95-4.39-2.12-8.33-2.79-12.39-.68-4.12-8.21-13.12-8.27-13.14-3.75-1.4,2.72,10.06.21,16.55-.83,2.13-4.62,2.21-6.38.89-1.12-.84-2.05-2.51-3.69-4.72-1.42,2.93-.61,6.09.51,9.17l5.58,15.3c-2.97,1.89-5.75.47-8.45-1.63-9.09-7.04-11.95-19.49-7.57-30.47,5.53-13.88,19.27-23.14,18.11-33.99-.6-5.51-4.53-10.66-7.93-14.79l-9.61-11.7c-.77,8.73,11.24,17.99,4.94,22.89-2.43,1.88-6.19,1.45-8.39-1.14-9.02-10.67-3.8-23.7.32-37.21-7.76,6.93-13.22,16.5-13.75,26.72-.54,10.56,13.4,21.13,7.42,32.61-1.53,2.93-4.39,3.73-7.06,3.23-6.02-1.13-2.15-9.43-6.17-13.95-4.19,12.25-12.57,14.72-6.19,30.96,2.28,5.83,2.73,13.04-1.89,17.45-2.57,2.45-6.5,1.27-8.77-.32-2.39-1.66-3.45-4.37-3.94-7.55-.1-.7-2.24-.5-2.3.27l-.19,2.31,1.01,13.79c-5.05,1.62-8.67-1.12-11.23-4.32-2.54-3.18-2.58-7.49-.91-11.53,4.43-10.72,1.15-22.95-9.08-29.54,4.65,10.16,3.23,22.05-3.08,24.04-5.48,1.72-11.65-5.45-11.35-14.58-4,5.95-1.88,13.25,2.85,17.87,2.75,2.67,5.36,5.23,5.73,9.33.27,2.95-.75,5.76-3.14,7.21-5.89,3.58-14.49-2.65-16.41-11.81-1.84-8.77.69-17.19,5.04-24.99l7.1-12.73c3.52-8.48.25-16.24-7.31-21.01-10.24-6.46-16.55-17.39-15.31-29.58l2.36-14.01c-1-.87-.49.96-1.19,1.24-.49.19-.67.95-1,1.49-7.67,12.69-7.3,27.18.26,39.91,3.23,5.45,6.68,10.8,7.68,17.19,1.19,7.64-1.57,15.35-8.31,18.76-2.47,1.25-5.27,1.12-7.07.03-2.11-1.29-3.18-4.06-2.75-6.76l2.11-13.37c-4.73,4.14-7.29,9.15-10.23,14.3-4.05,7.09-3.51,14.52.5,21.86l4.55,8.34c1.4,2.56-.07,5.54-2.34,6.84-6.26,3.6-12.73-8.24-13.13-18.15-4.67,8.94,4.46,20.94-.16,23.48-3.34,1.85-7.87-1.74-9.12-5.12-2.23-6.05-.04-11.78,2.69-17.25,4.75-9.52,4.84-19.89-.67-28.95-3.92-6.45-6.03-12.84-8.03-20.72-4.43,12.99,7.6,26.91,2.52,37.3-1.02,2.06-2.88,3.37-4.64,3.9-1.67.5-4.45.13-5.47-1.85-3.75-7.28,6.02-15.01,5.34-23-13.47,14.53-24.69,28.98-13.06,46.6,1.91,2.89,1.77,6.81-.19,8.98-1.63,1.79-5.8,2.98-8.57,1.17-11.28-7.39-12.26-24.93-8.64-32.09l12.03-23.87c2.7-5.35,5.53-11.12,5.27-17.27-.42-10.04-5.31-19.38-12.75-26.61,1.01,10.97,2.24,20.69-2.57,29.78-2,3.79-5.21,6.66-8.87,6.88-4.1.23-7.87-1.73-10.06-5.57-4.41-7.71-2.81-16.68,1.93-24.24,8.81-14.03,6.94-24.9-4.29-37.22-6.93-7.61-10.25-16.34-9.96-27.68-7.04,11.59-4.8,24.61,1.44,36,4.28,7.8,4.42,17.41-.57,24.25-5.92,8.12-16.79,10.52-24.07,3.53-10.07-9.67-5.21-24.75,2.44-36.87,9.59-15.19,3.38-33.62-8.41-47.9-.72,4.82-.09,9.18-2.26,13.25-1.89,3.55-5.46,4.81-9.03,4.62-10.25-.53-14.91-14.19-16.34-26.13-1.74-14.51,3.44-26.53,9.26-40.77-18.09,13.73-30.32,39.38-21.34,59.58l9.54,21.46c5.39,12.11,4.02,29.07-7.32,30.46-13.49,1.66-18.33-19.45-15.52-36.26-15.14,15.2-18.27,35.87-6.83,54.42,7.21,11.69,4.35,26.16-4.68,27.91-4.45.86-8.92-.07-11.2-3.94-4.35-7.36-3.87-15.43-4.06-24.92-8.09,7.3-11.62,18.32-10.77,28.82.58,7.08,4.69,12.97,7.78,19.01l5.11,10.01c10.73,21-.97,44-11.66,42.19-3.75-.64-5.39-6.33-3.48-9.72,10.28-18.28,3.19-30.4-11.26-44.88-.7,5.65,2.96,8.35,4.18,12.77.78,2.85,1.33,7.13-1.64,8.82-4.36,2.47-9.34-1.28-10.24-5.78-2.11-10.46,6.52-21.13,3.76-31.07l-8.6,18.74c-3.56,7.77-4.17,15.96-1.06,23.85l4.52,11.44c2.26,5.74-1.02,12.08-6.74,14.24-1.47.55-3.31-.3-3.77-1.13-2.14-3.95,1.84-10,1.02-15.27-3.47,2.35-4.21,6.09-6.78,9.05-2.24,2.59-7.27,4.08-9.13.8-5.33-9.37,16.77-17.71,3.6-37.81l-5.53-8.44-.84,12.62c-.19,2.83-3.24,3.71-5.71,3.29-1.73-.29-3.96-1.23-5.19-3.2-8.3-13.33,9.01-25.03,8.87-38.45-.12-10.86-6.04-20.59-12.65-28.09-.13-.14-.26-.33-.32-.45,12.61,29.29-.09,44.29-6.82,40.48-8.11-4.61,5.23-14.67,4.18-23.04-3.85,6.02-8.53,10.15-12.77,14.91-6.6,7.41-7.15,16.71-1.6,25.06,9.35,14.08,19.23,32.59,5.97,45.37-3.31,3.19-9.41,4.98-12.75,1.11-3.48-4.02-.74-10.54,3.24-13.6,5.5-4.23,8.5-11.05,4.9-17.3-1.6,6.06-3.58,11.46-9.17,12.87-4.38,1.1-8.35-3.45-8.99-7.5-.72-4.63.74-8.17.38-13.63-8.78,6.71-10.75,17.82-6.62,27.34,1.84,4.24.56,8.75-2.32,11.81-2.52,2.68-7.21,5.06-10.95,2.61-2.41-1.58,4.09-13.25-1.89-20.82-1.93,6.89-3,13.51-8.88,14.13-1.98.21-4.5-.84-5.95-2.48-3.87-4.38-2.47-9.27-.85-14.37,2.17-6.81-2.32-14.2-8-17.76.08,4.34,1.8,8.21-.22,11.58-1.36,2.28-4.64,1.89-6.82.87-5.73-2.7-5.07-12.34,2.2-21.49,7.1-8.94,9.4-21.73.08-30.28,5.63,15.65-1.33,23.08-11.16,34.02-6.22,6.93-8.53,15.56-5.05,24.24l5.1,12.7c2.75,6.88-2.11,15.15-9.69,15.86-4.62.44-7.28-4.58-6.32-8.8,2.6-11.48-1.13-18.27-9.8-28.04.42,8.51,3.86,19.32-3.17,19.58-6.17.23-5.52-11.3-2.95-21.42-12.43,11.84-6.98,21.97-9.27,26.62-1.36,2.75-4.68,1.02-6.04.17-4.45-2.76-3.79-10.92,1-18.17l9.09-13.74c8.1-12.25-5.54-25.56-8.43-37.78-.52-2.23-.26-4.69-2.93-5.82-7.62,13.91,4.1,26.95-2.32,34.91-2.4,2.97-6.72,3.04-10.53,1.83-6.91-2.19-9.49-16.74-5.48-26.89l5.93-14.99c2.43-6.17,4.29-12.41,2.41-19.54-3.08,6.88-4.61,12.68-10.24,16.67-2.64,1.87-5.6,3.09-8.19,1.35-5.64-3.78-3.44-11.53,1.24-18.36,6.6-9.63,6.57-21.79-.87-31.2.75,9.71.89,18.42-4.98,25.23-2.89,3.35-7,4.9-10.66,3.5-3.77-1.45-5.67-5.73-4.98-10.18,1.81-11.6,18.24-25.08,7.82-46.53.79,12.29-3.3,22.17-10.43,31.02-5.51,6.84-8.55,14.46-7.15,23.29,2.12,13.4,7.38,25.45,15,36.68,13.97,20.59,13.92,45.7-1.78,65.27-2.08,2.6-5.03,7.94-9.04,6.35-3.32-3.57-1.15-10.18,1.84-13.58,4.37-4.96,5.4-11.67,1.57-17.53-1.42,3.83-1.25,6.72-3.45,9.6-1.81,2.37-5.9,3.4-8.25.86-3.8-4.11-3.22-10.7.52-14.69l8.66-9.24c4.17-4.45,5.79-10.36,3.96-15.98-1.41,5.26-3.43,8.86-7.2,11.76l-13.5,10.36c-7.41,5.69-8.57,14.5-4.37,22.91,3.78,7.57,3.61,15.86-3.46,21.33-2.47,1.91-9.37,2.29-9.87-1.58-.8-6.22.65-12.93-5.7-17.97-.12,6.18-2.67,11.83-7.05,15.75-2.25,2.01-5.39,2.02-7.66.73-1.79-1.02-3.39-3.38-3.24-5.98.59-9.9,11.94-12.9,11.6-19.46-.16-2.97-1.3-5.88-3.88-7.84l-1.19,7.36c-1.7,2.87-6.24,1.62-7.8-1.3-2.22-4.16-.94-9.7,1.95-13.71,5.27-7.34,6.04-17.85-2.9-23.96,2.03,10.48.05,18.61-4.76,27.5-1.57,2.9-4.81,7.83-8.81,4.58-2.73-2.21-.23-8.22,1.52-10.97-3.23,1.31-5.77,4.41-7.34,7.57-1.98,3.99-.45,8.8,2.59,11.93,4.39,4.5,6.49,11.2,3.02,16.49-2.47,3.77-6.73,5.51-10.29,2.69l-.26-10.53c-3.37-3.53-5.45-7.24-4.97-12.55-3.75,3.4-3.33,8.35-2.77,13.25.8,6.95-2.39,14.06-9.95,14.26-2.34.06-5.61-2.42-6.72-4.47-3.6-6.66-2.12-14.29,2.09-20.31,5.68-8.13,6.15-17.41,1.32-25.97-5.39-9.55-5.1-19.55-.72-29.31,2.98-6.63,3.83-14.91-.89-20.62,1.88,16.89-9.26,24.18-11.66,34.85-3.26,14.48,6.79,28.96-4.07,40.97-3.22,3.56-8.88,5.91-12.34,1.51-1.45-1.84-1.23-7.03-.02-8.93l7.04-11.1c-13.57,6.81-19.88,19.22-14.4,33.41,1.24,3.21.12,6.86-3,8.43-6.6,3.34-13.13-1.31-15.17-8.18-2-6.7-.48-13.16,2.72-19.51,7.59-15.06,26.74-21.97,20.29-39.34-2.18-5.88-3.89-11.42-5.45-18.43-8.22,8.37-1.55,21.27-10.26,26.31-2.64,1.53-7.34,1.84-10.14-.46-3.65-2.99-5.41-6.97-5.67-11.14v79.25h1022.97v-116.11c-3.31,3.09-7.84,5.33-11.91,3.22Z';
const FIRE_BOTTOM_D2 = 'M3.79,140.55l13.75-20.26c4.81-7.1,3.84-15.48-.53-22.61-4.1-6.68-6.85-13.99-7.03-21.94l2.86-13.36c-7.82,7.94-8.79,19.45-7.63,30.23l1.08,10.13c.44,4.08-2.17,8.38-6.29,9.05v39.48c.24-3.7,1.58-7.45,3.79-10.72Z';

function HeroBottomShape({ typeName, isDark }) {
  const fill = isDark ? '#18181b' : '#ffffff';
  if (typeName === 'fire') {
    // Repère natif 1023.02×248.83 → retourné verticalement et mis à l'échelle du viewBox 400×80
    return (
      <svg
        className="absolute pointer-events-none"
        style={{ bottom: '0', height: 'auto', width: '200%', left: '-50%', zIndex: 1 }}
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g transform="scale(0.39101 0.34366)">
          <path d={FIRE_BOTTOM_D1} fill={fill} />
          <path d={FIRE_BOTTOM_D2} fill={fill} />
        </g>
      </svg>
    );
  }
  const d = BOTTOM_SHAPE_PATH[typeName] || BOTTOM_SHAPE_PATH.normal;
  return (
    <svg
      className="absolute left-0 right-0 w-full pointer-events-none"
      style={{ bottom: '-6px', height: 'calc(5rem + 6px)', zIndex: 1 }}
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill={fill} />
    </svg>
  );
}

function HeroBg({ typeName }) {
  const shapes = HERO_SHAPES[typeName] || HERO_SHAPES.normal;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {shapes.map(({ el, opacity, fill = 'white', stroke, strokeWidth, ...props }, i) =>
        React.createElement(el, {
          key: i,
          fill,
          ...(stroke ? { stroke, strokeWidth: strokeWidth || 20 } : {}),
          opacity,
          ...props,
        })
      )}
    </svg>
  );
}

const statColor = (v) =>
  v >= 150 ? '#22c55e' : v >= 100 ? '#84cc16' : v >= 70 ? '#eab308' : v >= 50 ? '#f97316' : '#ef4444';

function TypeBadge({ typeName }) {
  return (
    <span
      className="pl-1 inline-flex items-stretch rounded-full overflow-hidden"
      style={{ backgroundColor: TYPE_HEX[typeName] || '#828282' }}
    >
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt=""
        className="w-6 h-6 object-contain flex-shrink-0"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <span className="self-center pr-3 text-xs font-bold text-white uppercase leading-none">
        {TYPE_FR[typeName] || typeName}
      </span>
    </span>
  );
}

function TypePictogram({ typeName }) {
  const hex = TYPE_HEX[typeName] || '#A8A77A';
  const c = TYPE_COLORS[typeName] || { text: 'text-white' };
  const label = TYPE_FR[typeName] || typeName;
  return (
    <div className="relative w-8 h-8 flex-shrink-0" title={label}>
      <img
        src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeName}.svg`}
        alt={label}
        className="w-8 h-8 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextSibling.style.display = 'flex';
        }}
      />
      <div
        className="hidden w-8 h-8 rounded-full items-center justify-center absolute inset-0"
        style={{ backgroundColor: hex }}
      >
        <span className={`text-[9px] font-black ${c.text} uppercase tracking-wide`}>
          {label.slice(0, 3)}
        </span>
      </div>
    </div>
  );
}

function MultBadge({ mult, isDark }) {
  const isWeak = typeof mult === 'number' && mult >= 2;
  return (
    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
      <span className={`text-[11px] font-black ${isWeak ? 'text-red-500' : 'text-green-600'}`}>×{mult}</span>
    </div>
  );
}

function EffectivenessSection({ label, grouped, isDark }) {
  if (grouped.length === 0) return null;
  return (
    <div>
      <h3 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</h3>
      <div className="space-y-3">
        {grouped.map(({ mult, types }) => (
          <div key={mult} className="flex items-start gap-4">
            <MultBadge mult={mult} isDark={isDark} />
            <div className="flex flex-wrap gap-4">
              {types.map(tn => <TypePictogram key={tn} typeName={tn} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const INFO_ICONS = {
  'pokemon.weight': '⚖️', 'pokemon.height': '📏', 'pokemon.captureRate': '🎯',
  'pokemon.generation': '📅', 'pokemon.eggGroup': '🥚',
  'pokemon.gender': '⚧️', 'pokemon.growthRate': '📈', 'pokemon.species': '🔬',
  'pokemon.effortPoints': '💪', 'pokemon.baseExp': '⭐',
};

function InfoRow({ labelKey, label, value, accentColor, isDark }) {
  const icon = INFO_ICONS[labelKey];
  return (
    <div className="py-3 flex items-center gap-3">
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>{label}</p>
        <p className={`text-base mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{value}</p>
      </div>
    </div>
  );
}

export const PokemonDetailPage = ({ pokeId, pokeName, t, isDark, onBack, backLabel = 'Recherche' }) => {
  const tr = useTranslation();
  const { data, loading, error } = usePokemonDetail(pokeId, pokeName);
  const [activeTab, setActiveTab] = useState('presentation');

  useEffect(() => {
    const bg = isDark ? '#18181b' : '#ffffff';
    document.body.style.backgroundColor = bg;
    return () => { document.body.style.backgroundColor = ''; };
  }, [isDark]);

  const scrollPositions = useRef({ presentation: 0, strategie: 0, attaques: 0 });

  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTab(tab);
  }, [activeTab]);

  useLayoutEffect(() => {
    window.scrollTo({ top: scrollPositions.current[activeTab] ?? 0, behavior: 'instant' });
  }, [activeTab]);

  const primaryType = data?.types?.[0] || 'normal';
  const accentHex = (isDark ? TYPE_HEX_DARK : TYPE_HEX)[primaryType] || '#6390F0';

  const groupByMult = (multValues) =>
    multValues
      .map(({ multVal, label }) => ({
        mult: label,
        types: ALL_TYPES.filter(tn => (data?.effectiveness?.[tn] ?? 1) === multVal),
      }))
      .filter(g => g.types.length > 0);

  const resistanceGroups = groupByMult([
    { multVal: 0, label: '0' }, { multVal: 0.25, label: '¼' }, { multVal: 0.5, label: '½' },
  ]);
  const weaknessGroups = groupByMult([
    { multVal: 2, label: 2 }, { multVal: 4, label: 4 },
  ]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      {/* ── Bouton retour — flotte par-dessus le hero ── */}
      <div className="sticky top-0 z-20" style={{ height: 0, overflow: 'visible' }}>
        <div className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
          <button
            onClick={onBack}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl ${isDark ? '' : 'border border-white/20'} ${isDark ? '' : 'shadow-[0_4px_24px_rgba(0,0,0,0.12)]'} ${isDark ? 'bg-white/10 text-white' : 'bg-white/60 text-gray-900'}`}
            style={isDark ? { boxShadow: 'rgba(255, 255, 255, .21) .5px .75px', borderTop: '1px solid #ffffff36' } : undefined}
            aria-label={tr('common.back')}
          >
            <ChevronLeft size={24} className="-translate-x-px" />
          </button>
        </div>
      </div>

      {/* ── États de chargement ── */}
      {loading && (
        <div className="flex items-center justify-center pt-48">
          <Loader2 size={32} className="animate-spin" style={{ color: accentHex }} />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center px-8 text-center pt-48">
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
            Impossible de charger les données : {error}
          </p>
        </div>
      )}

      {/* ── Contenu ── */}
      {!loading && !error && data && (
        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>
          {/* Hero */}
          <div
            className="relative flex justify-center items-end"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
              minHeight: 'calc(env(safe-area-inset-top) + 200px)',
              overflow: 'visible',
              background: `linear-gradient(160deg, ${accentHex}ee 0%, ${accentHex}88 55%, ${isDark ? '#1c1c1e' : 'white'} 100%)`,
            }}
          >
            <HeroBg typeName={primaryType} />
            <HeroBottomShape typeName={primaryType} isDark={isDark} />
            <img
              src={data.officialArtwork || data.sprite}
              alt={pokeName}
              className="object-contain object-center"
              style={{
                width: '22rem',
                height: '22rem',
                marginBottom: '-2.2rem',
                position: 'relative',
                zIndex: 2,
                flexShrink: 0,
              }}
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
          </div>

          {/* Numéro + nom + types — toujours visibles */}
          <div className="px-5 pb-0" style={{ paddingTop: '2.3rem' }}>
            <p className={`text-sm font-mono font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              #{String(data.id).padStart(4, '0')}
            </p>
            <h1 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{data?.name || pokeName}</h1>
            <div className="flex gap-2 mb-5">
              {data.types.map(tn => <TypeBadge key={tn} typeName={tn} />)}
            </div>
          </div>

          <div className="px-5 pt-2 pb-2" style={{ display: activeTab === 'presentation' ? 'block' : 'none' }}>
              {data.flavorText && (
                <p className={`text-[18px] leading-relaxed mb-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {data.flavorText}
                </p>
              )}

              {/* Stats */}
              <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.stats')}</h2>
              <div className="space-y-2 mb-10">
                {data.stats.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{name}</span>
                    <span className={`w-8 text-base font-semibold text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{value}</span>
                    <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-200'} overflow-hidden`}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (value / 255) * 100)}%`, backgroundColor: statColor(value) }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <span className="w-12 text-base font-semibold" style={{ color: accentHex }}>{tr('pokemon.base')}</span>
                  <span className={`w-8 text-base font-black text-left tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{data.total}</span>
                  <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-200'} overflow-hidden`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (data.total / 780) * 100)}%`, backgroundColor: accentHex }} />
                  </div>
                </div>
              </div>

              {/* Résistances / Faiblesses */}
              <div className="space-y-6 mb-10">
                <EffectivenessSection label={tr('pokemon.resistances')} grouped={resistanceGroups} isDark={isDark} />
                <EffectivenessSection label={tr('pokemon.weaknesses')}  grouped={weaknessGroups}  isDark={isDark} />
              </div>

              {/* Talents */}
              {data.abilities.length > 0 && (
                <div className="mb-10">
                  <h2 className={`text-xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.abilities')}</h2>
                  <div className="space-y-3">
                    {data.abilities.map(({ nameFr, descFr, isHidden }, i) => (
                      <div key={i}>
                        <p className="text-base font-bold mb-0.5" style={{ color: accentHex }}>
                          {nameFr}{isHidden && ` (${tr('pokemon.hidden')})`}
                        </p>
                        {descFr && <p className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{descFr}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caractéristiques */}
              <h2 className={`text-xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tr('pokemon.characteristics')}</h2>
              <div>
                <InfoRow labelKey="pokemon.weight"       label={tr('pokemon.weight')}       value={`${data.weight} kg  —  ${(data.weight * 2.205).toFixed(1)} lbs.`} accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.height"       label={tr('pokemon.height')}       value={`${data.height} m  —  ${Math.floor(data.height * 3.281)}'${String(Math.round((data.height * 3.281 % 1) * 12)).padStart(2, '0')}'`} accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.captureRate"  label={tr('pokemon.captureRate')}  value={String(data.captureRate)}  accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.generation"   label={tr('pokemon.generation')}   value={data.generation}           accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.eggGroup"     label={tr('pokemon.eggGroup')}     value={data.eggGroups}            accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.gender"       label={tr('pokemon.gender')}       value={data.genderText}           accentColor={accentHex} isDark={isDark} />
                <InfoRow labelKey="pokemon.growthRate"   label={tr('pokemon.growthRate')}   value={data.growthRate}           accentColor={accentHex} isDark={isDark} />
                {data.genus && <InfoRow labelKey="pokemon.species" label={tr('pokemon.species')} value={data.genus} accentColor={accentHex} isDark={isDark} />}
                {data.evYield !== '—' && <InfoRow labelKey="pokemon.effortPoints" label={tr('pokemon.effortPoints')} value={data.evYield} accentColor={accentHex} isDark={isDark} />}
                <InfoRow labelKey="pokemon.baseExp"      label={tr('pokemon.baseExp')}      value={String(data.baseExperience)} accentColor={accentHex} isDark={isDark} />
              </div>
            </div>

          <div style={{ display: activeTab === 'strategie' ? 'block' : 'none' }}>
            <StrategyTab pokeId={pokeId} isDark={isDark} accentHex={accentHex} />
          </div>

          <div style={{ display: activeTab === 'attaques' ? 'block' : 'none' }}>
            <MovesTab pokeId={pokeId} isDark={isDark} accentHex={accentHex} />
          </div>
        </div>
      )}

      {/* ── Onglets — fixe en bas d'écran ── */}
      {!loading && !error && data && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-20 border-t ${isDark ? 'bg-zinc-900 border-zinc-800/80' : 'bg-white border-gray-200/80'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} accentHex={accentHex} isDark={isDark} />
        </div>
      )}
    </div>
  );
};
