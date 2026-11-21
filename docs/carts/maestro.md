# Maestro

Maestro is a portrait rhythm game with three lanes. Choose a piano piece and difficulty in the recital program, then tap the lane as its block reaches the gold line. The left lane plays bass with the left thumb. The middle and right lanes play treble with the right thumb. A linked hit uses bass and one treble lane at the same beat. Use A, S, and D or the left, down, and right arrow keys on a keyboard. All three pieces are available from the start.

| Piece | Composer | Standard rows | Extreme rows |
| --- | --- | ---: | ---: |
| Clair de lune | Claude Debussy | 204 | 763 |
| Für Elise | Ludwig van Beethoven | 120 | 625 |
| The Entertainer | Scott Joplin | 362 | 972 |

Extreme adds melody runs, accompaniment, and more linked blocks at audible note attacks in each piece. It uses the same recordings and includes every Standard cue. Adjacent hits split the timing window at the midpoint when they are too close for separate 135 ms windows.

A row scores once. For linked blocks, both lanes must land within 85 ms of each other and within the usual timing window. The less accurate tap determines the grade. Perfect hits within 44 ms earn 1,000 points, Great hits within 85 ms earn 800, and Good hits within 135 ms earn 500. A miss or an offbeat tap breaks the combo. Accuracy measures points earned against the maximum, with offbeat taps counted as extra misses. Three stars require 95% accuracy, two require 80%, and one requires 60%. The result screen includes each judgment count. The recital saves the best score and highest star rating per song and difficulty in local storage, along with the selected song, difficulty, volume, and tap offset. Existing three-lane personal bests carry over to Standard, with prior single-pad records retained in storage.

The static player schedules the piano on the Web Audio clock. It maps display frames and input timestamps to the same audio position, using recent output timestamps to estimate delay. An interrupted audio session pauses at the last confirmed position. Resuming gives a short visual count-in before the audio continues with the current score. The scoring module accepts timestamped taps independently of the browser clock, so the same chart and tap times produce the same result.

## Music and art credits

Piano renditions and beat charts are derived from these public-domain Mutopia Project MIDI editions.

- [Clair de lune](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1778), typeset by Keith OHara from E. Fromont (1905).
- [Für Elise](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931), typeset by Stelios Samelis from Breitkopf & Härtel (1888).
- [The Entertainer](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=263), maintained by Chris Sawer from a reproduction of the 1902 edition.

The MIDI tracks were sequenced at 64, 82, and 102 quarter notes per minute respectively, with adjusted dynamics. The tracks use the original stereo Yamaha C5 recordings from [Salamander Grand Piano V3](https://github.com/sfzinstruments/SalamanderGrandPiano) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The samples were trimmed to align the hammer attacks with the score, pitched to the nearest notes, shaped with note releases, and mixed as stereo MP3s. Cue times are milliseconds from the start of each mix. Each cue pairs a time with a lane mask using 1 for bass, 2 for middle treble, and 4 for right treble. Treble pitches and the spacing of nearby notes guide which treble lane plays. Selected simultaneous attacks in the bass and treble staves become linked hits.

The recital hall and song illustrations are original generated game artwork. The display typeface is a subset of Bodoni Moda, distributed under the [SIL Open Font License](../../carts/maestro/assets/BodoniModa-OFL.txt).
