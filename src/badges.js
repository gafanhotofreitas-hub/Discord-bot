// Central badge/achievement definitions.
// Each badge's `check` function receives the full user object and returns
// true if the badge should be unlocked.
module.exports = [
  { id: 'welcome', emoji: '🎉', name: 'Welcome', description: 'Join the economy', check: () => true },
  { id: 'thousandaire', emoji: '💰', name: 'Thousandaire', description: 'Reach 1,000 credits', check: u => u.balance >= 1000 },
  { id: 'high_roller', emoji: '💎', name: 'High Roller', description: 'Reach 10,000 credits', check: u => u.balance >= 10000 },
  { id: 'streak_3', emoji: '🔥', name: '3-Day Streak', description: 'Claim /daily 3 days in a row', check: u => u.streak >= 3 },
  { id: 'streak_7', emoji: '🔥🔥', name: 'Week Warrior', description: 'Claim /daily 7 days in a row', check: u => u.streak >= 7 },
  { id: 'streak_30', emoji: '🔥🔥🔥', name: 'Monthly Master', description: 'Claim /daily 30 days in a row', check: u => u.streak >= 30 },
  { id: 'level_5', emoji: '⭐', name: 'Rising Star', description: 'Reach level 5', check: u => u.level >= 5 },
  { id: 'level_10', emoji: '🌟', name: 'Level 10 Club', description: 'Reach level 10', check: u => u.level >= 10 },
  { id: 'level_25', emoji: '🏆', name: 'Veteran', description: 'Reach level 25', check: u => u.level >= 25 },
  { id: 'lucky', emoji: '🎰', name: 'Lucky', description: 'Win 10 games', check: u => u.stats.wins >= 10 },
  { id: 'champion', emoji: '👑', name: 'Champion', description: 'Win 50 games', check: u => u.stats.wins >= 50 },
  { id: 'card_shark', emoji: '🃏', name: 'Card Shark', description: 'Win 10 blackjack hands', check: u => u.stats.blackjack_wins >= 10 },
  { id: 'centurion', emoji: '💯', name: 'Centurion', description: 'Win 100 games', check: u => u.stats.wins >= 100 },
  { id: 'regular', emoji: '🕹️', name: 'Regular', description: 'Play 100 games', check: u => u.stats.games_played >= 100 },
  { id: 'blackjack_legend', emoji: '🂡', name: 'Blackjack Legend', description: 'Win 50 blackjack hands', check: u => u.stats.blackjack_wins >= 50 },
  { id: 'big_winner', emoji: '💥', name: 'Big Winner', description: 'Win 500+ credits in a single game', check: u => u.stats.biggest_win >= 500 },
  { id: 'level_50', emoji: '🔮', name: 'Mythic', description: 'Reach level 50', check: u => u.level >= 50 },
  { id: 'streak_100', emoji: '🔥🔥🔥🔥', name: 'Unbreakable', description: 'Claim /daily 100 days in a row', check: u => u.streak >= 100 },
  { id: 'tycoon', emoji: '🏰', name: 'Tycoon', description: 'Reach 100,000 credits', check: u => u.balance >= 100000 },
];
