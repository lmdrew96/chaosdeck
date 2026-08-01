// Curated, real Commander preconstructed decklists (1 commander + 99 cards
// each, verified against Scryfall) — lets a new player start from a known-
// good 100-card deck instead of building or pasting a list from scratch.

export type PreconDeck = {
  key: string;
  name: string;
  commander: string;
  description: string;
  decklist: string;
};

export const PRECON_DECKS: PreconDeck[] = [
  {
    key: "squirreled-away",
    name: "Squirreled Away",
    commander: "Hazel of the Rootbloom",
    description: "Golgari (B/G) — Squirrel tribal sacrifice/aristocrats value engine",
    decklist: `Commander
1 Hazel of the Rootbloom
Deck
1 Academy Manufactor
1 Arasta of the Endless Web
1 Beledros Witherbloom
1 Chatterfang, Squirrel General
1 Chittering Witch
1 Deep Forest Hermit
1 End-Raze Forerunners
1 Gilded Goose
1 Haywire Mite
1 Hazel's Brewmaster
1 Honored Dreyleader
1 Insatiable Frugivore
1 Moonstone Eulogist
1 Morbid Opportunist
1 Nadier's Nightblade
1 Nested Shambler
1 Ogre Slumlord
1 Plaguecrafter
1 Poison-Tip Archer
1 Prosperous Innkeeper
1 Ravenous Squirrel
1 Scurry of Squirrels
1 Skyfisher Spider
1 Squirrel Sovereign
1 The Odd Acorn Gang
1 Tireless Provisioner
1 Toski, Bearer of Secrets
1 Woe Strider
1 Zulaport Cutthroat
1 Cache Grab
1 Deadly Dispute
1 Plumb the Forbidden
1 Putrefy
1 Saw in Half
1 Second Harvest
1 Tear Asunder
1 Windgrace's Judgment
1 Casualties of War
1 Chatterstorm
1 Decree of Pain
1 Maelstrom Pulse
1 Rootcast Apprenticeship
1 Shamanic Revelation
1 Swarmyard Massacre
1 Arcane Signet
1 Chitterspitter
1 Golgari Signet
1 Idol of Oblivion
1 Maskwood Nexus
1 Skullclamp
1 Sol Ring
1 Sword of the Squeak
1 Talisman of Resilience
1 Bastion of Remembrance
1 Beastmaster Ascension
1 Binding the Old Gods
1 Gourmand's Talent
1 Moldervine Reclamation
1 Squirrel Nest
1 Wolfwillow Haven
1 Garruk, Cursed Huntsman
1 Barren Moor
1 Bojuka Bog
1 Command Tower
1 Evolving Wilds
1 Exotic Orchard
1 Golgari Rot Farm
1 Grim Backwoods
1 Haunted Mire
1 Jungle Hollow
1 Llanowar Wastes
1 Necroblossom Snarl
1 Oran-Rief, the Vastwood
1 Path of Ancestry
1 Swarmyard
1 Tainted Wood
1 Temple of Malady
1 Terramorphic Expanse
1 Tranquil Thicket
1 Twilight Mire
1 Viridescent Bog
1 Woodland Cemetery
9 Forest
8 Swamp`,
  },
  {
    key: "endless-punishment",
    name: "Endless Punishment",
    commander: "Valgavoth, Harrower of Souls",
    description: "Rakdos (B/R) — group-slug damage and life-loss punisher",
    decklist: `Commander
1 Valgavoth, Harrower of Souls
Deck
1 Barbflare Gremlin
1 Blood Artist
1 Blood Seeker
1 Braids, Arisen Nightmare
1 Brash Taunter
1 Combustible Gearhulk
1 Falkenrath Noble
1 Fate Unraveler
1 Fear of Burning Alive
1 Florian, Voldaren Scion
1 Gleeful Arsonist
1 Gray Merchant of Asphodel
1 Harsh Mentor
1 Kaervek the Merciless
1 Kardur, Doomscourge
1 Kederekt Parasite
1 Massacre Girl
1 Massacre Wurm
1 Mayhem Devil
1 Mogis, God of Slaughter
1 Morbid Opportunist
1 Nightshade Harvester
1 Persistent Constrictor
1 Rakdos, Lord of Riots
1 Rampaging Ferocidon
1 Solemn Simulacrum
1 Star Athlete
1 Stormfist Crusader
1 Syr Konrad, the Grim
1 Tectonic Giant
1 The Lord of Pain
1 Vial Smasher the Fierce
1 Bedevil
1 Blood Pact
1 Chaos Warp
1 Infernal Grasp
1 Rakdos Charm
1 Suspended Sentence
1 Blasphemous Act
1 Decree of Pain
1 Feed the Swarm
1 Grab the Prize
1 Light Up the Stage
1 Sadistic Shell Game
1 Sign in Blood
1 Arcane Signet
1 Basilisk Collar
1 Fellwar Stone
1 Lightning Greaves
1 Mask of Griselbrand
1 Mind Stone
1 Rakdos Signet
1 Sol Ring
1 Séance Board
1 Talisman of Indulgence
1 Thought Vessel
1 Bastion of Remembrance
1 Enchanter's Bane
1 Spiked Corridor // Torture Pit
1 Spiteful Visions
1 Theater of Horrors
1 Ash Barrens
1 Blackcleave Cliffs
1 Bloodfell Caves
1 Canyon Slough
1 Command Tower
1 Dragonskull Summit
1 Evolving Wilds
1 Exotic Orchard
1 Foreboding Ruins
1 Geothermal Bog
1 Graven Cairns
1 Leechridden Swamp
1 Shadowblood Ridge
1 Shivan Gorge
1 Smoldering Marsh
1 Spinerock Knoll
1 Sulfurous Springs
1 Tainted Peak
1 Temple of Malice
1 Temple of the False God
1 Terramorphic Expanse
1 Witch's Clinic
8 Mountain
8 Swamp`,
  },
  {
    key: "eldrazi-incursion",
    name: "Eldrazi Incursion",
    commander: "Ulalek, Fused Atrocity",
    description: "Five-color (W/U/B/R/G) — colorless Eldrazi ramp with cast-trigger copying",
    decklist: `Commander
1 Ulalek, Fused Atrocity
Deck
1 Angelic Aberration
1 Artisan of Kozilek
1 Azlask, the Swelling Scourge
1 Benthic Anomaly
1 Bismuth Mindrender
1 Chittering Dispatcher
1 Deepfathom Skulker
1 Drowner of Hope
1 Elder Deep-Fiend
1 Eldrazi Displacer
1 Endbringer
1 Glaring Fleshraker
1 Hideous Taskmaster
1 Inversion Behemoth
1 Morophon, the Boundless
1 Mutated Cultist
1 Oblivion Sower
1 Sifter of Skulls
1 Sire of Stagnation
1 Snapping Voidcraw
1 Spawnbed Protector
1 Titans' Vanguard
1 Twins of Discord
1 Ulamog's Crusher
1 Ulamog's Dreadsire
1 Ulamog's Nullifier
1 Vile Redeemer
1 Wastescape Battlemage
1 World Breaker
1 Crib Swap
1 Eldrazi Confluence
1 Eldritch Immunity
1 Kozilek's Return
1 Return of the Wildspeaker
1 Suffer the Past
1 Warping Wail
1 All Is Dust
1 Ancient Stirrings
1 Rishkar's Expertise
1 Selective Obliteration
1 Skittering Invasion
1 Ugin's Insight
1 Arcane Signet
1 Dreamstone Hedron
1 Eldrazi Monument
1 Everflowing Chalice
1 Forsaken Monument
1 Hedron Archive
1 Herald's Horn
1 Idol of Oblivion
1 Mystic Forge
1 Sol Ring
1 Talisman of Curiosity
1 Talisman of Dominance
1 Talisman of Impulse
1 Talisman of Resilience
1 Awakening Zone
1 Eldrazi Conscription
1 Garruk's Uprising
1 Imprisoned in the Moon
1 Ugin, the Ineffable
1 Adarkar Wastes
1 Ash Barrens
1 Battlefield Forge
1 Bonders' Enclave
1 Brushland
1 Cascading Cataracts
1 Caves of Koilos
1 Command Tower
1 Corrupted Crossroads
1 Eldrazi Temple
1 Exotic Orchard
1 Forest
1 Island
1 Karplusan Forest
1 Llanowar Wastes
1 Mountain
1 Opal Palace
1 Path of Ancestry
1 Plains
1 Reliquary Tower
1 Ruins of Oran-Rief
1 Secluded Courtyard
1 Shivan Reef
1 Shrine of the Forsaken Gods
1 Spawning Bed
1 Sulfurous Springs
1 Swamp
1 Tectonic Edge
1 Temple of Malady
1 Temple of Silence
1 Tendo Ice Bridge
1 Tomb of the Spirit Dragon
1 Tranquil Landscape
1 Twisted Landscape
1 Unclaimed Territory
1 Underground River
1 Wastes
1 Yavimaya Coast`,
  },
  {
    key: "deadly-disguise",
    name: "Deadly Disguise",
    commander: "Kaust, Eyes of the Glade",
    description: "Naya (R/G/W) — morph and disguise face-down creatures",
    decklist: `Commander
1 Kaust, Eyes of the Glade
Deck
1 Ainok Survivalist
1 Akroma, Angel of Fury
1 Ashcloud Phoenix
1 Beast Whisperer
1 Boltbender
1 Broodhatch Nantuko
1 Deathmist Raptor
1 Den Protector
1 Duskana, the Rage Mother
1 Exalted Angel
1 Experiment Twelve
1 Hidden Dragonslayer
1 Hooded Hydra
1 Imperial Hellkite
1 Krosan Cloudscraper
1 Krosan Colossus
1 Master of Pearls
1 Mirror Entity
1 Nantuko Vigilante
1 Neheb, the Eternal
1 Nervous Gardener
1 Ohran Frostfang
1 Printlifter Ooze
1 Root Elemental
1 Sakura-Tribe Elder
1 Salt Road Ambushers
1 Saryth, the Viper's Fang
1 Scourge of the Throne
1 Seedborn Muse
1 Sidar Kondo of Jamuraa
1 Temur War Shaman
1 Tesak, Judith's Hellhound
1 Thelonite Hermit
1 Toski, Bearer of Secrets
1 Welcoming Vampire
1 Whisperwood Elemental
1 Yedora, Grave Gardener
1 Chaos Warp
1 Path to Exile
1 Return of the Wildspeaker
1 Showstopping Surprise
1 Unexplained Absence
1 Austere Command
1 Decimate
1 Dusk // Dawn
1 Fell the Mighty
1 Jeska's Will
1 Nature's Lore
1 Three Visits
1 Arcane Signet
1 Lifecrafter's Bestiary
1 Panoptic Projektor
1 Ransom Note
1 Scroll of Fate
1 Sol Ring
1 Mastery of the Unseen
1 Obscuring Aether
1 Trail of Mystery
1 True Identity
1 Ugin's Mastery
1 Veiled Ascension
1 Wild Growth
1 Boros Garrison
1 Branch of Vitu-Ghazi
1 Canopy Vista
1 Cinder Glade
1 Command Tower
1 Exotic Orchard
1 Fortified Village
1 Furycalm Snarl
1 Game Trail
1 Gruul Turf
1 Jungle Shrine
1 Kessig Wolf Run
1 Krosan Verge
1 Mossfire Valley
1 Mosswort Bridge
1 Sacred Peaks
1 Scattered Groves
1 Selesnya Sanctuary
1 Sheltered Thicket
1 Shrine of the Forsaken Gods
1 Sungrass Prairie
1 Temple of Abandon
1 Temple of Plenty
1 Temple of Triumph
1 Temple of the False God
1 Zoetic Cavern
4 Forest
3 Mountain
4 Plains`,
  },
  {
    key: "deep-clue-sea",
    name: "Deep Clue Sea",
    commander: "Morska, Undersea Sleuth",
    description: "Bant (G/W/U) — Clue and investigate card-advantage engine",
    decklist: `Commander
1 Morska, Undersea Sleuth
Deck
1 Academy Manufactor
1 Adrix and Nev, Twincasters
1 Aerial Extortionist
1 Alandra, Sky Dreamer
1 Bennie Bracks, Zoologist
1 Chulane, Teller of Tales
1 Detective of the Month
1 Erdwal Illuminator
1 Esix, Fractal Bloom
1 Ethereal Investigator
1 Graf Mole
1 Hornet Queen
1 Hydroid Krasis
1 Innocuous Researcher
1 Jolrael, Mwonvuli Recluse
1 Junk Winder
1 Kappa Cannoneer
1 Koma, Cosmos Serpent
1 Lonis, Cryptozoologist
1 Merchant of Truth
1 Nadir Kraken
1 Psychosis Crawler
1 Selvala, Explorer Returned
1 Serene Sleuth
1 Shimmer Dragon
1 Sophia, Dogged Detective
1 Tangletrove Kelp
1 Thought Monitor
1 Tireless Tracker
1 Wavesifter
1 Whirler Rogue
1 Confirm Suspicions
1 Disorder in the Court
1 Swords to Plowshares
1 Farewell
1 Finale of Revelation
1 Follow the Bodies
1 Fumigate
1 Organic Extinction
1 Arcane Signet
1 Azorius Signet
1 Idol of Oblivion
1 Inspiring Statuary
1 Magnifying Glass
1 Nettlecyst
1 Ransom Note
1 Simic Signet
1 Sol Ring
1 Talisman of Curiosity
1 Talisman of Progress
1 Talisman of Unity
1 Armed with Proof
1 Killer Service
1 Knowledge Is Power
1 Mechanized Production
1 On the Trail
1 Ongoing Investigation
1 Search the Premises
1 Teferi's Ageless Insight
1 Ulvenwald Mysteries
1 Wilderness Reclamation
1 Tezzeret, Betrayer of Flesh
1 Azorius Chancery
1 Canopy Vista
1 Command Tower
1 Exotic Orchard
1 Irrigated Farmland
1 Krosan Verge
1 Lonely Sandbar
1 Path of Ancestry
1 Prairie Stream
1 Reliquary Tower
1 Scattered Groves
1 Seaside Citadel
1 Secluded Steppe
1 Selesnya Sanctuary
1 Simic Growth Chamber
1 Skycloud Expanse
1 Spire of Industry
1 Sungrass Prairie
1 Temple of Enlightenment
1 Temple of Mystery
1 Temple of Plenty
1 Temple of the False God
1 Tranquil Thicket
5 Forest
6 Island
3 Plains`,
  },
];
