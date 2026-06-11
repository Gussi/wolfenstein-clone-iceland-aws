# Business Rules (Game Balance Constants) — "Pots & Parliament"

## Rendering Constants

| Constant | Value | Notes |
|----------|-------|-------|
| SCREEN_WIDTH | 640 | Internal render resolution width |
| SCREEN_HEIGHT | 400 | Internal render resolution height |
| FOV | 66° (1.152 radians) | Field of view |
| CAMERA_PLANE_LENGTH | 0.66 | tan(FOV/2) — plane vector magnitude |
| TEXTURE_SIZE | 128 | Wall texture dimensions (128x128 pixels) |
| WALL_SHADE_FACTOR | 0.7 | Darken factor for side-hit walls (NS walls darker) |

---

## Player Constants

| Constant | Value | Notes |
|----------|-------|-------|
| MOVE_SPEED | 3.0 | Grid cells per second |
| ROTATION_SPEED | 0.003 | Radians per pixel of mouse movement |
| COLLISION_RADIUS | 0.2 | Grid units — player's collision circle radius |
| MAX_HEALTH | 100 | Starting and maximum health (patience) |
| INTERACTION_RANGE | 1.2 | Grid units — max distance to interact with doors/pushwalls |
| PICKUP_RADIUS | 0.5 | Grid units — auto-collect pickups within this radius |

---

## Weapon Constants (Wooden Spoon)

| Constant | Value | Notes |
|----------|-------|-------|
| WEAPON_RANGE | 1.5 | Grid units — max distance for melee hit |
| WEAPON_ARC | 60° (1.047 rad) | Attack cone width (±30° from center) |
| WEAPON_DAMAGE | 1 | Stun points per hit |
| SWING_DURATION | 0.25s | Time from attack start to hit check |
| RECOVER_DURATION | 0.2s | Cooldown after swing before next attack |
| TOTAL_ATTACK_TIME | 0.45s | Swing + recovery (max ~2.2 attacks/sec) |

---

## Enemy Constants (Red Tape)

| Constant | Value | Notes |
|----------|-------|-------|
| ENEMY_HEALTH | 3 | Hits to disperse (stun threshold) |
| ENEMY_SPEED | 2.0 | Grid cells per second (slightly slower than player) |
| ENEMY_DAMAGE | 5 | Health points removed per attack |
| ENEMY_ATTACK_COOLDOWN | 1.0s | Time between enemy attacks |
| ENEMY_ATTACK_RANGE | 0.8 | Grid units — must be this close to attack player |
| DETECTION_RANGE | 8.0 | Grid units — max LOS detection distance |
| ALERT_DURATION | 0.5s | Pause in ALERT state before pursuing |
| STUN_DURATION | 0.3s | Time enemy is staggered after hit |
| DISPERSE_DURATION | 0.5s | Death animation time before removal |
| SCORE_PER_ENEMY | 10 | Connections points for dispersing an enemy |

---

## Pickup Constants

| Pickup | Heal Amount | Notes |
|--------|-------------|-------|
| Coffee | 15 | Small heal — common placement |
| Kleinur | 30 | Large heal — rarer placement |

---

## Level Constants

| Constant | Value | Notes |
|----------|-------|-------|
| GRID_SIZE | 32x32 | Level dimensions in grid cells |
| ENEMY_COUNT | 30-35 | Total enemies in prototype level |
| SECRET_COUNT | 1 | Push-wall secrets in prototype |
| DOOR_OPEN_DURATION | 0.5s | Time for door to slide open |
| PUSHWALL_SLIDE_DURATION | 1.5s | Time for push-wall to slide back 2 cells |

---

## Scoring Rules

| Event | Points | Notes |
|-------|--------|-------|
| Enemy dispersed | +10 connections | Per enemy defeated |
| Secret found | +50 connections | Per push-wall secret discovered |
| Level complete bonus | +100 connections | Awarded on victory |

---

## Difficulty Balance Notes

With ~3 cells/sec player speed and ~2 cells/sec enemy speed:
- Player CAN outrun individual enemies but not easily dodge groups
- 30+ enemies at 2.0 speed creates swarm pressure — player must fight, not just run
- 3 hits per enemy at ~2.2 attacks/sec means ~1.35s per kill
- Full clear of 30 enemies takes minimum ~40s of pure combat
- 5 damage per enemy hit at 100 max health means player can take 20 hits before death
- With 1.0s enemy attack cooldown, a group of 5 enemies hitting simultaneously = 25 damage (survivable)
- Coffee (15hp) scattered throughout provides sustain during extended fights
- Tone should feel challenging but not punishing — "barely making it" is the sweet spot

---

## HUD Rules

### Face Portrait Expressions
| Health Range | Expression | Notes |
|-------------|-----------|-------|
| 75-100% | Normal | Determined, neutral face |
| 40-74% | Hurt | Slightly pained, worried |
| 1-39% | Critical | Exhausted, desperate |
| Victory | Victory | Relieved, smiling |

### Enemy Taunts
- Triggered: When Red Tape enters ALERT state (detects player)
- Display: Floating text above enemy sprite for 1.5 seconds
- Frequency: Each enemy taunts once on first detection, then silent
- Pool (rotate randomly):
  1. "Ég ætla að segja mömmu þinni!" ("I'm telling your mother!")
  2. "Vantar þig eyðublað?" ("Need a form?")
  3. "Þetta er ekki rétt deild!" ("This is the wrong department!")
  4. "Komdu aftur á mánudag!" ("Come back Monday!")
  5. "Ertu með tilvísun?" ("Do you have a reference?")
