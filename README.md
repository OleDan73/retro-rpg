# Turnip Vale

A tiny retro RPG that runs in the browser. It's plain HTML, CSS and JavaScript on an HTML5 canvas, with no frameworks and no build step.

Slimes keep raiding Turnip Vale's turnip fields. Help the villagers, gear up at the forge, and push through Whisper Woods into Crystal Cave to face the Gloop King.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys / WASD | On-screen D-pad |
| Talk / confirm | Space / Enter / Z | A button |
| Status & quest log / back | X / Esc / Q | B button |
| Mute | M | Sound button |

## Quests

| Quest | Given by | Goal | Reward |
| --- | --- | --- | --- |
| Slime Trouble | Elder Moss | Defeat 3 slimes in Whisper Woods | 30 gold, Old Sickle |
| Lost Biscuit | Pip | Find Pip's cat in the woods | Herb pouch (holds 5) |
| Glowcap Brew | Wren | Collect 3 glowcaps from Shroomlets | Vigor Tonic (+10 max HP) |
| The Gloop King | Elder Moss | Cut the vines, enter Crystal Cave, defeat the boss | Victory! |
| Crystal Edge | Bram | Bring 2 crystal shards from the cave | Crystal Sword (+7 ATK) |

## Features

- 16×16 tiles, a 16-colour palette, crisp integer scaling and the Press Start 2P font
- All sprites are drawn in code, so there are no image files
- Three maps (village, forest and cave) with collision, signs and cuttable vines
- Tile-by-tile movement with a 2-frame walk cycle
- Five villagers plus a lost cat, typewriter dialogue, and "!" markers on NPCs who have something for you
- Random encounters with four enemy types, plus a boss with a charge-up attack
- Turn-based battles (Attack / Heal / Run) with HP bars and damage numbers
- HP, XP, levels, gold, a shop (herbs, sword, armor) and equipment
- A status screen and quest log, with a quest tracker on the HUD
- Autosave to localStorage, with Continue / New Game on the title screen
- Sound effects made with the Web Audio API
- On-screen D-pad and A/B buttons on touch devices

## Run locally

Serve the folder with any static server, for example:

```sh
npx serve .
```

## Deploy

It's a static site, so Vercel can deploy it as-is with no configuration. The Vercel project is connected to this repo, so every push to `main` deploys to production.
