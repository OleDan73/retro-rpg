# Turnip Vale

A tiny retro RPG that runs in the browser. It's plain HTML, CSS and JavaScript on an HTML5 canvas, with no frameworks and no build step.

Slimes from Whisper Woods keep eating Turnip Vale's turnips. Talk to Elder Moss, then head east and defeat 3 slimes.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys / WASD | On-screen D-pad |
| Talk / confirm | Space / Enter / Z | A button |
| Mute | M | Sound button |

## Features

- 16×16 tiles, a 16-colour palette, crisp integer scaling and the Press Start 2P font
- All sprites are drawn in code, so there are no image files
- Two maps (village and forest) joined by a path, with solid tiles for collision
- Tile-by-tile movement with a 2-frame walk cycle
- Three villagers with typewriter dialogue, plus a quest giver
- Random forest encounters and turn-based battles (Attack / Heal / Run) with HP bars and damage numbers
- HP, XP and levels; levelling up raises your stats
- Sound effects made with the Web Audio API
- A victory screen when the quest is done

## Run locally

Serve the folder with any static server, for example:

```sh
npx serve .
```

## Deploy

It's a static site, so Vercel can deploy it as-is with no configuration.
