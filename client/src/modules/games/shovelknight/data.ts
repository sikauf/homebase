import { GameItem } from '../_shared/types'

export interface Feat {
  id: string
  name: string
  description: string
  // the feat's in-game medallion icon, scraped per-campaign into
  // /public/games/shovelknight/feats/<character>/<id>.png
  icon: string
  // grand feats trigger the full-screen shatter celebration instead of the medallion.
  grand?: boolean
}

export interface Character extends GameItem {
  subtitle: string
  feats: Feat[]
  // full-body splash art for the landing-page poster cards (`image` is the small
  // circular emblem still used by the modal + celebration).
  art: string
  // figure height as a % of the card art area; bottom-anchored, sides bleed. Default 90.
  artHeight?: number
  // horizontal nudge for the figure (CSS length), default '0px'.
  artOffsetX?: string
}

export const CHARACTERS: Character[] = [
  {
    id: 'shovel',
    name: 'Shovel Knight',
    subtitle: 'Shovel of Hope',
    rgb: '96,165,235',
    image: '/games/shovelknight/shovel.webp',
    art: '/games/shovelknight/shovel-art.webp',
    artHeight: 102,
    feats: [
      { id: 'first_purchase', name: 'First Purchase', description: 'Buy your first item.', icon: '/games/shovelknight/feats/shovel/first_purchase.png' },
      { id: 'only_you', name: 'Only You', description: 'Use caution and common sense around campfires.', icon: '/games/shovelknight/feats/shovel/only_you.png' },
      { id: 'troupple_acolyte', name: 'Troupple Acolyte', description: 'Discover the secrets of the Troupple King.', icon: '/games/shovelknight/feats/shovel/troupple_acolyte.png' },
      { id: 'hey_big_spender', name: 'Hey Big Spender', description: 'Spend a combined 25000 gold at the shop.', icon: '/games/shovelknight/feats/shovel/hey_big_spender.png' },
      { id: 'halfway', name: 'Halfway', description: 'Defeat 4 of the Order of No Quarter.', icon: '/games/shovelknight/feats/shovel/halfway.png' },
      { id: 'nice_hat', name: 'Nice Hat...', description: 'Help out all the moochers in the fancy shop.', icon: '/games/shovelknight/feats/shovel/nice_hat.png' },
      { id: 'master_angler', name: 'Master Angler', description: 'Successfully fish 5 sparkling fishing spots.', icon: '/games/shovelknight/feats/shovel/master_angler.png' },
      { id: 'well_met', name: 'Well Met', description: 'Defeat all of the wandering travelers.', icon: '/games/shovelknight/feats/shovel/well_met.png' },
      { id: 'juggler', name: 'Juggler', description: 'Impress Mona with your skills.', icon: '/games/shovelknight/feats/shovel/juggler.png' },
      { id: 'master_shoveler', name: 'Master Shoveler', description: 'Purchase all available Shovel Blade upgrades.', icon: '/games/shovelknight/feats/shovel/master_shoveler.png' },
      { id: 'hall_champion', name: 'Hall Champion', description: 'Solve the woes of the Hall of Champions.', icon: '/games/shovelknight/feats/shovel/hall_champion.png' },
      { id: 'im_alive', name: "I'm Alive!", description: 'Finish any stage without dying.', icon: '/games/shovelknight/feats/shovel/im_alive.png' },
      { id: 'victory', name: 'Victory!', description: 'Finish the game.', grand: true, icon: '/games/shovelknight/feats/shovel/victory.png' },
      { id: 'another_dimension', name: 'Another Dimension', description: 'Collect 2000 worth of gold lying on spikes, using the Phase Locket.', icon: '/games/shovelknight/feats/shovel/another_dimension.png' },
      { id: 'i_scream_for_ichor', name: 'I Scream For Ichor', description: "Sample each of the Troupple King's ichors.", icon: '/games/shovelknight/feats/shovel/i_scream_for_ichor.png' },
      { id: 'knuckle_down', name: 'Knuckle Down', description: 'Hang in the air for more than 4 seconds using the Dust Knuckles.', icon: '/games/shovelknight/feats/shovel/knuckle_down.png' },
      { id: 'hooper', name: 'Hooper', description: "Bounce on the Hoop Kid's hoop for 5 seconds.", icon: '/games/shovelknight/feats/shovel/hooper.png' },
      { id: 'arc_of_iron', name: 'Arc of Iron', description: 'Defeat 3 enemies with one Throwing Anchor.', icon: '/games/shovelknight/feats/shovel/arc_of_iron.png' },
      { id: 'decked_out', name: 'Decked Out', description: 'Purchase or unlock all relics, equipment, and upgrades.', icon: '/games/shovelknight/feats/shovel/decked_out.png' },
      { id: 'youre_fired', name: "You're Fired", description: 'Finish off the Black Knight with a reflected shot.', icon: '/games/shovelknight/feats/shovel/youre_fired.png' },
      { id: 'reflect_lord', name: 'Reflect Lord', description: 'Hit enemies with a reflected projectile 30 times.', icon: '/games/shovelknight/feats/shovel/reflect_lord.png' },
      { id: 'boom', name: 'Boom!', description: 'Defeat 5 foes at once using the Booming Horn.', icon: '/games/shovelknight/feats/shovel/boom.png' },
      { id: 'pungent', name: 'Pungent', description: "Listen to all of Croaker's puns.", icon: '/games/shovelknight/feats/shovel/pungent.png' },
      { id: 'on_a_diet', name: 'On a Diet', description: 'Finish a level without eating any food.', icon: '/games/shovelknight/feats/shovel/on_a_diet.png' },
      { id: 'get_the_point', name: 'Get the Point', description: 'Destroy all checkpoints in a single stage.', icon: '/games/shovelknight/feats/shovel/get_the_point.png' },
      { id: 'sparker', name: 'Sparker', description: 'Finish off any boss using the Ground Spark technique.', icon: '/games/shovelknight/feats/shovel/sparker.png' },
      { id: 'relic_roundtable', name: 'Relic Roundtable', description: 'Defeat an enemy by using each relic.', icon: '/games/shovelknight/feats/shovel/relic_roundtable.png' },
      { id: 'untouched', name: 'Untouched', description: 'Emerge unscathed from a battle with any Knight of the Order of No Quarter.', icon: '/games/shovelknight/feats/shovel/untouched.png' },
      { id: 'super_sphere', name: 'Super Sphere', description: 'Destroy 5 enemies within 5 seconds using the Chaos Spheres.', icon: '/games/shovelknight/feats/shovel/super_sphere.png' },
      { id: 'no_damage', name: 'No Damage!', description: 'Finish any stage without taking damage.', icon: '/games/shovelknight/feats/shovel/no_damage.png' },
      { id: 'shovel_economy', name: 'Shovel Economy', description: 'Finish a level swinging the Shovel Blade fewer than 20 times.', icon: '/games/shovelknight/feats/shovel/shovel_economy.png' },
      { id: 'flying_feat', name: 'Flying Feat', description: 'Defeat 3 enemies using the Propeller Dagger without touching the ground.', icon: '/games/shovelknight/feats/shovel/flying_feat.png' },
      { id: 'music_lover', name: 'Music Lover', description: 'Obtain all song scrolls.', icon: '/games/shovelknight/feats/shovel/music_lover.png' },
      { id: 'flare_wander', name: 'Flare Wander', description: 'Defeat an enemy with the Flare Wand from more than 25 blocks away.', icon: '/games/shovelknight/feats/shovel/flare_wander.png' },
      { id: 'reflected_riches', name: 'Reflected Riches', description: 'Bounce the same Alchemical Coin 5 times in a row.', icon: '/games/shovelknight/feats/shovel/reflected_riches.png' },
      { id: 'order_of_hoarders', name: 'Order of Hoarders', description: 'Have 50000 gold on hand.', icon: '/games/shovelknight/feats/shovel/order_of_hoarders.png' },
      { id: 'clearing_a_path', name: 'Clearing a Path', description: 'Run over 5 enemies using the same Mobile Gear.', icon: '/games/shovelknight/feats/shovel/clearing_a_path.png' },
      { id: 'dirt_poor', name: 'Dirt Poor', description: "Don't collect any gold for an entire Order of No Quarter stage.", icon: '/games/shovelknight/feats/shovel/dirt_poor.png' },
      { id: 'again', name: 'Again!', description: 'Finish New Game Plus.', grand: true, icon: '/games/shovelknight/feats/shovel/again.png' },
      { id: 'checkpointless', name: 'Checkpointless', description: 'Destroy every possible checkpoint in the game.', grand: true, icon: '/games/shovelknight/feats/shovel/checkpointless.png' },
      { id: 'penny_pincher', name: 'Penny Pincher', description: 'Finish the game without spending any money.', icon: '/games/shovelknight/feats/shovel/penny_pincher.png' },
      { id: 'true_shovelry', name: 'True Shovelry', description: 'Beat the game without collecting any relics.', grand: true, icon: '/games/shovelknight/feats/shovel/true_shovelry.png' },
      { id: 'impossible', name: 'Impossible!', description: 'Finish the game without dying.', icon: '/games/shovelknight/feats/shovel/impossible.png' },
      { id: 'perfect_platformer', name: 'Perfect Platformer', description: 'Finish the game without falling into a bottomless pit.', icon: '/games/shovelknight/feats/shovel/perfect_platformer.png' },
      { id: 'hurry_up', name: 'Hurry Up!', description: 'Beat the game within 1 hour and 30 minutes.', grand: true, icon: '/games/shovelknight/feats/shovel/hurry_up.png' },
    ],
  },
  {
    id: 'plague',
    name: 'Plague Knight',
    subtitle: 'Plague of Shadows',
    rgb: '130,200,110',
    image: '/games/shovelknight/plague.webp',
    art: '/games/shovelknight/plague-art.webp',
    artHeight: 92,
    feats: [
      { id: 'victory', name: 'Victory!', description: 'Finish the game.', grand: true, icon: '/games/shovelknight/feats/plague/victory.png' },
      { id: 'get_out_of_my_room', name: 'Get Out Of My Room!', description: "Find Plague Knight's secret room.", icon: '/games/shovelknight/feats/plague/get_out_of_my_room.png' },
      { id: 'trading_up', name: 'Trading Up', description: 'Trade each of the useless relics to Chester.', icon: '/games/shovelknight/feats/plague/trading_up.png' },
      { id: 'maxed_out', name: 'Maxed Out', description: 'Purchase or unlock all relics, equipment, and upgrades.', icon: '/games/shovelknight/feats/plague/maxed_out.png' },
      { id: 'hall_villain', name: 'Hall Villain', description: 'Clear the Hall of Champions in 3 minutes 30 seconds or less.', icon: '/games/shovelknight/feats/plague/hall_villain.png' },
      { id: 'hang_time', name: 'Hang Time', description: 'Stay in the air for 10 seconds without landing on anything.', icon: '/games/shovelknight/feats/plague/hang_time.png' },
      { id: 'creep', name: 'Creep', description: "Watch all of Mona's dance.", icon: '/games/shovelknight/feats/plague/creep.png' },
      { id: 'poor_oolong', name: 'Poor Oolong', description: 'Give Oolong a sample of every explosion.', icon: '/games/shovelknight/feats/plague/poor_oolong.png' },
      { id: 'mint_condition', name: 'Mint Condition', description: 'Collect all Cipher Coins.', icon: '/games/shovelknight/feats/plague/mint_condition.png' },
      { id: 'untouched', name: 'Untouched', description: 'Emerge unscathed from a battle with any Knight except King Knight!', icon: '/games/shovelknight/feats/plague/untouched.png' },
      { id: 'defend_the_lab', name: 'Defend the Lab!', description: 'Retake the Explodatorium without breaking grey blocks during the boss fight.', icon: '/games/shovelknight/feats/plague/defend_the_lab.png' },
      { id: 'again', name: 'Again!', description: 'Finish New Game Plus.', grand: true, icon: '/games/shovelknight/feats/plague/again.png' },
      { id: 'no_damage', name: 'No Damage!', description: 'Finish any stage without taking damage.', icon: '/games/shovelknight/feats/plague/no_damage.png' },
      { id: 'bomb_jump_blitz', name: 'Bomb Jump Blitz', description: 'Defeat an Order Knight using only bomb jump explosions.', icon: '/games/shovelknight/feats/plague/bomb_jump_blitz.png' },
      { id: 'bomb_economy', name: 'Bomb Economy', description: 'Finish any Order of No Quarter stage using 15 bombs or fewer.', icon: '/games/shovelknight/feats/plague/bomb_economy.png' },
      { id: 'teetotaler', name: 'Teetotaler', description: 'Finish the game without drinking any tonics.', icon: '/games/shovelknight/feats/plague/teetotaler.png' },
      { id: 'penny_pincher', name: 'Penny Pincher', description: 'Finish the game without spending money, including Cipher Coins!', icon: '/games/shovelknight/feats/plague/penny_pincher.png' },
      { id: 'naked_plague', name: 'Naked Plague', description: 'Finish the game without collecting arcana, bomb parts, or armors.', grand: true, icon: '/games/shovelknight/feats/plague/naked_plague.png' },
      { id: 'checkpointless', name: 'Checkpointless', description: 'Destroy every possible checkpoint in the game.', grand: true, icon: '/games/shovelknight/feats/plague/checkpointless.png' },
      { id: 'hurry_up', name: 'Hurry Up!', description: 'Beat the game within 1 hour and 30 minutes.', grand: true, icon: '/games/shovelknight/feats/plague/hurry_up.png' },
    ],
  },
  {
    id: 'specter',
    name: 'Specter Knight',
    subtitle: 'Specter of Torment',
    rgb: '205,70,80',
    image: '/games/shovelknight/specter.webp',
    art: '/games/shovelknight/specter-art.webp',
    artHeight: 92,
    artOffsetX: '7%',
    feats: [
      { id: 'spirit_of_giving', name: 'Spirit of Giving', description: "Fill both of the tower's mysterious jars.", icon: '/games/shovelknight/feats/specter/spirit_of_giving.png' },
      { id: 'harvest_of_heights', name: 'Harvest of Heights', description: 'Chain together multiple targets with dash slashes 500 times.', icon: '/games/shovelknight/feats/specter/harvest_of_heights.png' },
      { id: 'victory', name: 'Victory!', description: 'Finish the game.', grand: true, icon: '/games/shovelknight/feats/specter/victory.png' },
      { id: 'darkslide', name: 'Darkslide', description: 'Land all 3 rail tricks in a single grind.', icon: '/games/shovelknight/feats/specter/darkslide.png' },
      { id: 'melancholy', name: 'Melancholy', description: "Reminisce and remain still on the Tower's rooftop for 30 seconds.", icon: '/games/shovelknight/feats/specter/melancholy.png' },
      { id: 'get_out_of_my_room', name: 'Get Out Of My Room!', description: "Find Specter Knight's secret room!", icon: '/games/shovelknight/feats/specter/get_out_of_my_room.png' },
      { id: 'vector_victor', name: 'Vector Victor', description: 'Reach the top of the climbing mini game.', icon: '/games/shovelknight/feats/specter/vector_victor.png' },
      { id: 'specd_out', name: "Spec'd Out", description: 'Acquire all armor, curios, and upgrades.', icon: '/games/shovelknight/feats/specter/specd_out.png' },
      { id: 'skull_seeker', name: 'Skull Seeker', description: 'Find and return all Red Skulls.', icon: '/games/shovelknight/feats/specter/skull_seeker.png' },
      { id: 'inhuman_resources', name: 'Inhuman Resources', description: 'Speak with every recruit within the Tower.', icon: '/games/shovelknight/feats/specter/inhuman_resources.png' },
      { id: 'wisp_whisperer', name: 'Wisp Whisperer', description: 'Obtain all Darkness and Will Upgrades from within the stages.', icon: '/games/shovelknight/feats/specter/wisp_whisperer.png' },
      { id: 'untouched', name: 'Untouched', description: 'Emerge unscathed from a battle with any boss besides Black Knight!', icon: '/games/shovelknight/feats/specter/untouched.png' },
      { id: 'curio_conquest', name: 'Curio Conquest', description: 'Use only curios to defeat any Boss Specter Knight is trying to recruit!', icon: '/games/shovelknight/feats/specter/curio_conquest.png' },
      { id: 'again', name: 'Again!', description: 'Finish New Game Plus.', grand: true, icon: '/games/shovelknight/feats/specter/again.png' },
      { id: 'scythe_economy', name: 'Scythe Economy', description: 'Complete any Order of No Quarter recruit stage using your standing slash 10 times or fewer.', icon: '/games/shovelknight/feats/specter/scythe_economy.png' },
      { id: 'naked_specter', name: 'Naked Specter', description: 'Finish the game without acquiring any Will or Darkness upgrades.', grand: true, icon: '/games/shovelknight/feats/specter/naked_specter.png' },
      { id: 'no_damage', name: 'No Damage!', description: 'Finish any main stage without taking damage.', icon: '/games/shovelknight/feats/specter/no_damage.png' },
      { id: 'hurry_up', name: 'Hurry Up!', description: 'Beat the game within 1 hour and 30 minutes.', grand: true, icon: '/games/shovelknight/feats/specter/hurry_up.png' },
      { id: 'checkpointless', name: 'Checkpointless', description: 'Destroy every possible checkpoint in the game.', grand: true, icon: '/games/shovelknight/feats/specter/checkpointless.png' },
      { id: 'make_a_killing', name: 'Make A Killing', description: 'Without replaying any stage or minigame, finish the game while holding 60000 gold or more.', icon: '/games/shovelknight/feats/specter/make_a_killing.png' },
    ],
  },
  {
    id: 'king',
    name: 'King Knight',
    subtitle: 'King of Cards',
    rgb: '232,190,92',
    image: '/games/shovelknight/king.webp',
    art: '/games/shovelknight/king-art.webp',
    artHeight: 90,
    feats: [
      { id: 'gem_sweep', name: 'Gem Sweep', description: 'In a Joustus match with more than one gem, win by claiming every gem.', icon: '/games/shovelknight/feats/king/gem_sweep.png' },
      { id: 'patron_of_the_arts', name: 'Patron of the Arts', description: 'Commission a finished portrait!', icon: '/games/shovelknight/feats/king/patron_of_the_arts.png' },
      { id: 'victory', name: 'Victory!', description: 'Finish the game.', grand: true, icon: '/games/shovelknight/feats/king/victory.png' },
      { id: 'thats_mine', name: "That's Mine!", description: 'Lose a unique card, then win it back!', icon: '/games/shovelknight/feats/king/thats_mine.png' },
      { id: 'get_out_of_my_room', name: 'Get Out Of My Room!', description: "Find King Knight's secret room!", icon: '/games/shovelknight/feats/king/get_out_of_my_room.png' },
      { id: 'cartography_king', name: 'Cartography King', description: 'Find and complete all stages and stage paths, defeating the wandering travelers.', icon: '/games/shovelknight/feats/king/cartography_king.png' },
      { id: 'house_champ', name: 'House Champ', description: 'Clear all 4 houses of Joustus, and win the final battle.', icon: '/games/shovelknight/feats/king/house_champ.png' },
      { id: 'king_of_cards', name: 'King of Cards', description: 'Defeat every possible Joustus opponent.', icon: '/games/shovelknight/feats/king/king_of_cards.png' },
      { id: 'merit_badge', name: 'Merit Badge', description: 'Collect all Merit Medals.', icon: '/games/shovelknight/feats/king/merit_badge.png' },
      { id: 'decked_out', name: 'Decked Out', description: 'Acquire all armor, heirlooms, fancy things, and upgrades.', icon: '/games/shovelknight/feats/king/decked_out.png' },
      { id: 'im_a_cheater', name: "I'm a Cheater!", description: "Use each one of Chester's Cheat Cards.", icon: '/games/shovelknight/feats/king/im_a_cheater.png' },
      { id: 'jump_economy', name: 'Jump Economy', description: 'Finish a stage and jump fewer than 10 times.', icon: '/games/shovelknight/feats/king/jump_economy.png' },
      { id: 'card_completionist', name: 'Card Completionist', description: 'Obtain all Joustus cards.', icon: '/games/shovelknight/feats/king/card_completionist.png' },
      { id: 'heirlooms_only', name: 'Heirlooms Only!', description: 'Use only heirlooms to defeat any boss!', icon: '/games/shovelknight/feats/king/heirlooms_only.png' },
      { id: 'heartless', name: 'Heartless', description: 'Finish a Joustus Judge stage without dying or collecting food/health.', icon: '/games/shovelknight/feats/king/heartless.png' },
      { id: 'again', name: 'Again!', description: 'Finish New Game Plus.', grand: true, icon: '/games/shovelknight/feats/king/again.png' },
      { id: 'beeline', name: 'Beeline', description: 'Complete the game in fewer than 25 stages.', icon: '/games/shovelknight/feats/king/beeline.png' },
      { id: 'naked_king', name: 'Naked King', description: 'Finish the game without acquiring heirlooms or health/vigor upgrades.', grand: true, icon: '/games/shovelknight/feats/king/naked_king.png' },
      { id: 'fearless_champ', name: 'Fearless Champ', description: 'Clear all 4 houses of Joustus without buying cards from Chester.', icon: '/games/shovelknight/feats/king/fearless_champ.png' },
      { id: 'hurry_up', name: 'Hurry Up!', description: 'Beat the game within 1 hour and 30 minutes.', grand: true, icon: '/games/shovelknight/feats/king/hurry_up.png' },
    ],
  },
]
