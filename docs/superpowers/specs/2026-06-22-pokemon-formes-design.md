# Design — Section "Formes" dans PokemonDetailPage

Date : 2026-06-22

## Contexte

`PokemonDetailPage` affiche la fiche complète d'un Pokémon. Certains Pokémon ont plusieurs formes (régionales, méga-évolutions, formes spéciales). L'objectif est d'afficher ces formes et de permettre la navigation entre elles sans quitter la fiche.

`PokemonDetailModal` n'est plus utilisé — hors scope.

## Données

**Source :** `speciesData.varieties` (déjà fetchée dans `processPokemonDetail`), tableau d'objets `{ is_default, pokemon: { name, url } }`.

**Noms FR :** `pokemon-forms-fr.json` — mappe `pokeId → name` pour les formes alternatives.

**Artwork :** URL officielle par pokeId, même pattern que partout dans l'app (`official-artwork`).

**Changement dans `processPokemonDetail` :** Ajouter `varieties` au résultat retourné — tableau `[{ pokeId: number, name: string }]` incluant toutes les formes (y compris la forme courante), noms résolus depuis `pokemon-forms-fr.json` pour les formes alternatives (pokeId ≥ 10000), nom d'espèce pour la forme de base.

## State dans PokemonDetailPage

Remplacer l'usage direct des props `pokeId` / `pokeName` par un state local :

```js
const [activePokeId, setActivePokeId] = useState(pokeId)
const [activePokeName, setActivePokeName] = useState(pokeName)
```

`usePokemonDetail(activePokeId, activePokeName)` utilise ces valeurs. Cliquer une forme appelle `setActivePokeId` + `setActivePokeName` + scroll to top. Le bouton retour (`onBack`) reste inchangé — il revient à la liste précédente, pas à la forme d'origine.

## UI — Section "Formes"

**Emplacement :** Sous la description (`flavorText`), avant les stats.

**Condition d'affichage :** `data.varieties.length > 1` seulement.

**Structure :**

```
<section>
  <h2>Formes</h2>
  <div class="box gris rounded-xl overflow-x-auto">
    <div class="flex gap-3 p-3">
      {varieties.map(form => (
        <button onClick={() => switchForm(form)} disabled={form.pokeId === activePokeId}>
          <img artwork officiel 64px />
        </button>
      ))}
    </div>
  </div>
</section>
```

**Styles :**
- Box conteneur : `bg-black/[0.04]` (light) / `bg-white/[0.06]` (dark), `rounded-xl`, `overflow-x-auto`, scrollbar cachée (`scrollbarWidth: none`)
- Items : artworks uniquement, ~64px, pas de label
- Forme courante : non cliquable (`disabled`), pas de distinction visuelle particulière
- Padding intérieur : `p-3`, gap entre items : `gap-3`

## Fichiers à modifier

1. `src/utils/fetchPokemonDetail.js` — exposer `varieties` dans le résultat
2. `src/components/PokemonDetailPage.jsx` — state local pour la forme active + section Formes UI
