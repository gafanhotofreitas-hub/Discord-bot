# Discord Economy Bot

Professional virtual economy bot with games, levels, streaks, and achievements.
Uses fake currency (credits), with no connection to real money.

## Commands

### 💰 Economy
| Command | Description |
|---|---|
| `/balance [user]` | Check your balance, streak, and level progress |
| `/daily` | Daily reward (250 credits base + streak bonus, 24h cooldown) |
| `/work` | Earn 50–200 credits (1h cooldown) |
| `/pay` | Transfer credits to another user |

### 🎮 Games
| Command | Description |
|---|---|
| `/coinflip` | Bet on heads or tails |
| `/slots` | Slot machine — match symbols for up to 10x |
| `/dice` | Guess the roll (1-6) for a 5x payout |
| `/roulette` | Bet on a color (2x/14x) or an exact number (35x) |
| `/blackjack` | Play against the house with hit/stand buttons |

### ⭐ Progress
| Command | Description |
|---|---|
| `/level [user]` | XP progress bar, streak, and win-rate stats |
| `/achievements [user]` | Your unlocked and locked badges |
| `/leaderboard` | Top 10 richest users |
| `/help` | Browse all commands with an interactive menu |

### 🛠️ Admin
| Command | Description |
|---|---|
| `/admin-give` | *(Admin only)* Give or remove credits from a user |

## Leveling system

Every action grants XP: `/daily` (+20), `/work` (+15), winning a game
(+10 to +15 depending on the game), losing a game (+3). The XP needed for
each level is `level × 100`. Level-ups are announced right in the game/
command embed.

## Streaks

Claiming `/daily` on consecutive days builds a streak, which increases your
daily reward (+15 credits per streak day, capped at 20 days). Missing more
than a day resets the streak back to 1.

## Achievements

12 badges to unlock, covering balance milestones, streaks, levels, and game
wins — check them anytime with `/achievements`. New unlocks are announced
automatically in the relevant command's response.

## Installation

### 1. Create the Discord application
1. Go to https://discord.com/developers/applications and create a new application
2. Under **Bot**, create the bot and copy the **Token**
3. Under **OAuth2 → URL Generator**, check the `bot` and `applications.commands` scopes,
   and the permissions `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Use the generated link to invite the bot to your server

### 2. Set up the project
```bash
npm install
cp config/.env.example config/.env
```
Edit `config/.env` and fill in:
- `DISCORD_TOKEN` — the bot's token
- `CLIENT_ID` — the Application ID (under General Information)
- `GUILD_ID` — (optional) your server's ID, so commands show up instantly while testing

### 3. Register the slash commands
```bash
npm run deploy
```

### 4. Start the bot
```bash
npm start
```

## Database

Uses a local JSON file (`economy.json`, created automatically in the project
root). No native compilation and no external database server needed.
Existing accounts from earlier versions of the bot are automatically
migrated to include the new XP/streak/badge fields — no data is lost.

## Hosting 24/7

To keep the bot online continuously, host it on a service like:
- Railway
- Render
- A VPS (e.g. with PM2: `pm2 start src/index.js --name economy-bot`)

## License

This project is licensed under the [MIT License](LICENSE) — free to use,
modify, and self-host on your own server.

## Notes

- This bot uses only **virtual currency with no real value**. It does not
  process payments or real monetary transactions.
- Reward amounts, bets, cooldowns, XP values, and badge thresholds can be
  adjusted directly in the files inside `src/commands/`, `src/badges.js`,
  and `src/database.js`.
