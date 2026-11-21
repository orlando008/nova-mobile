# Maestro

Maestro is a portrait rhythm game for one thumb. Choose a piano piece in the recital program and tap the ivory pad as each gold ring reaches it. Space and Enter also work when the pad is focused. The three pieces are available from the start.

| Piece | Composer | Chart |
| --- | --- | --- |
| Clair de lune | Claude Debussy | A gentle pulse on the dotted-quarter beats and nearby note attacks |
| Für Elise | Ludwig van Beethoven | The opening pickup and the main pulse of each 3/8 measure, with extra cues in the busier section |
| The Entertainer | Scott Joplin | Quarter-note beats with occasional eighth-note cues |

Perfect hits within 44 ms earn 1,000 points, Great hits within 85 ms earn 800, and Good hits within 135 ms earn 500. A miss or an offbeat tap breaks the combo. Accuracy measures points earned against the maximum, with offbeat taps counted as extra misses. Three stars require 95% accuracy, two require 80%, and one requires 60%. The result screen includes each judgment count. The recital saves the best score and highest star rating per song in local storage, along with the selected song, volume, and tap offset.

The static player schedules the piano on the Web Audio clock. It maps display frames and input timestamps to the same audio position using the output timestamp when available. Pause and interruptions stop playback. Resuming gives a short visual count-in before the audio continues. The scoring module accepts timestamped taps independently of the browser clock, so the same chart and tap times produce the same result.

## Music and art credits

Piano renditions and beat charts are derived from these public-domain Mutopia Project MIDI editions.

- [Clair de lune](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1778), typeset by Keith OHara from E. Fromont (1905).
- [Für Elise](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931), typeset by Stelios Samelis from Breitkopf & Härtel (1888).
- [The Entertainer](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263), maintained by Chris Sawer from a reproduction of the 1902 edition.

The MIDI tracks were sequenced at 64, 82, and 102 quarter notes per minute respectively, with adjusted dynamics. They were rendered with FluidSynth using [OpenPiano's SF3 adaptation](https://github.com/ThomasKiljanczykDev/OpenPiano/blob/main/NOTICE.md) of [Salamander Grand Piano V3](https://github.com/sfzinstruments/SalamanderGrandPiano) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The mixes were folded to mono and encoded as MP3. The beat times are milliseconds from the beginning of each corresponding mix.

The recital hall and song illustrations are original generated game artwork. The display typeface is a subset of Bodoni Moda, distributed under the [SIL Open Font License](../../carts/maestro/assets/BodoniModa-OFL.txt).
