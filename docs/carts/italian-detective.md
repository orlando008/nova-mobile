# Italian Detective

A portrait-first Italian listening game. Open the Casebook, interview illustrated witnesses, pin
their replies to the Case Board, and solve the mystery by interpreting what they said.

| Case | Mystery | Listening focus |
| --- | --- | --- |
| La busta scomparsa | Find when the envelope vanished and where it ended up | Times and locations |
| La valigia sbagliata | Work out which bag was taken and who handed it to whom | Descriptions and pronouns |
| Il quadro sparito | Reconstruct what happened before the witnesses arrived | Event order and the past perfect |

## Investigation

- Tap a question to play the witness's reply. Each reply supports normal replay, slower replay,
  an optional Italian transcript, and English hints for key phrases. All player interaction is tap or keyboard input.
- Pin replies after hearing them. The Case Board preserves the witness, clue title, and recorded time when available.
  Reviewing a clue returns to the corresponding interview.
- Pin the relevant clues to attempt a deduction. Pick one conclusion from three options or tap events in order.
  A wrong answer offers a hint and highlights the relevant evidence on the board. You can retry without penalty.
- Solving the first deduction and pinning newly revealed clues open follow-up questions. Solving the final deduction
  reveals how the recorded statements fit together and unlocks the next case.
- The browser saves solved cases locally. Reopening an unlocked case starts a fresh investigation.

## Audio and artwork

The cart ships mono MP3s synthesized with Piper 1.8.0 from the authored lines in `code.js`.
Lucia, Elena, and Sofia use [Paola (medium)](https://huggingface.co/rhasspy/piper-voices/tree/main/it/it_IT/paola/medium).
Marco, Paolo, and Davide use [Riccardo (x_low)](https://huggingface.co/rhasspy/piper-voices/tree/main/it/it_IT/riccardo/x_low).
The play page uses local asset URLs and slows the same clip to 78% speed with pitch preservation.
The Piper models are used offline to generate the files and aren't part of the cart.
The café artwork and envelope are cropped from the approved concept, and the witness portraits were generated to match.
