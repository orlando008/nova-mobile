# Italian Tutor

Italian Tutor is a portrait grammar trainer for intermediate learners. It focuses on the rules that trip up learners who already have a working vocabulary. Each question is an Italian sentence with one blank, an English translation, and four choices. Tap a choice or press keys 1–4. The completed sentence and the rule behind it appear after every answer, and the full explanation appears after a miss. A missed question returns once at the end of the round. Where the browser offers speech synthesis, Ascolta reads the completed sentence aloud in Italian.

| Topic | Rules |
| --- | --- |
| Object pronouns (lo, la, gli, ne) | Lo, la, li, le · L’ before a vowel · Participle agreement (l’ho vista) · Gli and le · Direct or indirect verbs · Ne · Ci · Combined pronouns (glielo, me lo) · Attached pronouns (vederlo, eccolo) |
| Di and da (di, da, dei, degli) | Di · Da for places and people · Da for time · Da for purpose · Del, dello, della… · Dal, dallo, dalla… · The partitive · Dei or degli |
| Quello and che (quel, quello, che, cui) | Quel, quello, quell’ · Quei, quegli, quelle · Quello and quelli on their own · Questo or quello · Che · Cui after a preposition · Quello che · Chi |

## Lessons

- **Ripasso mirato** (focused review) draws ten questions from every rule. It squares each rule's weight, so the weakest rules dominate, and it allows up to three questions per rule.
- **Topics** draw ten questions from one topic, at most two per rule, weighted toward weaker rules.
- **Drill this rule**, in the rule book, asks six questions from one rule.

A rule's weight grows when its mastery box is low, when its accuracy is low, when it has never been seen, and when the player has marked it as tricky. Questions answered in the last 40 answers are less likely to repeat. The same rule bank, lesson focus, seed, and saved progress reproduce the same lesson.

## Tracking

Each rule has a mastery box from 0 to 5. A correct answer moves it up one box and a miss moves it down two. A rule in box 4 or 5 is mastered, box 2 or 3 is getting there, and box 0 or 1 is shaky. The home screen lists the rules that need the most work under **Hardest for you**. The rule book shows every rule with its explanation, a table of forms, examples, accuracy, and mastery dots. The player can mark any rule as tricky to keep it in focused reviews.

A finished round earns 20 XP plus 5 XP for each question answered correctly on the first try. Every 100 XP is a level. The ranks are Turista (level 1), Viaggiatore (3), Studente (5), Chiacchierone (8), and Quasi madrelingua (12). Finishing a round on consecutive days builds a day streak. Progress is saved in the browser.

## Content

Rules and questions live in `carts/italian-tutor/assets/bank.mjs`. A question's id is its rule id plus its position, so new questions go at the end of a rule's list to keep saved history attached. Distractors are chosen to be wrong in standard Italian for the given translation. Where a choice is acceptable in some registers (such as *lo ho* or *dove* for *in cui*), it is left out of the choices. The poster, icon, and home illustration are vector art drawn for this game.
