# Forecast UX usability test plan (phase 3, T1)

**Purpose:** find out whether a material planner who has never seen the portal can run one weekly cycle on it unassisted, and where they get stuck.
**Who runs it:** one facilitator (the owner or a colleague) and, if possible, one note-taker.
**Participants:** 3 to 5 material planners who have not used the portal's forecast pages. 3 sessions show most of the large problems; stop at 5.
**Length:** 45 minutes per session.
**Build:** the current portal on a laptop at 1440 × 900, signed in with the "Material Planner" menu, English or Indonesian as the planner prefers.

## Before each session

- Reset the demo: open the portal in a fresh private window so no saved decision or selection carries over.
- Open My tasks (`/buyer/home`). Close every other tab.
- Have this script and the findings template open on a second screen, not the planner's.

## What to say at the start (read it out)

"We are testing the portal, not you. There are no wrong answers. Please think out loud: say what you are looking for, what you expect, and what surprises you. I will not help during the tasks, because we want to see where the screens fail to help you. The data is sample data. Nothing you do reaches a supplier or SAP."

## Tasks

Give one task at a time, in this order. Read it out; do not point at the screen. Stop a task at its time limit or when the planner says they are done or stuck.

| # | Task (read out as written) | Time limit | Success means |
|---|---|---|---|
| 1 | "It is Monday morning. Find out what you need to do for this week's ordering." | 4 min | Reaches This week or What to order and can name at least one thing to do |
| 2 | "Choose one recommended order. Tell me how much is ordered, from which supplier, and why that quantity." | 6 min | Opens Why this quantity (or the full Material requirement page) and explains the quantity in their own words |
| 3 | "One warehouse week does not fit. Decide what to do about it, and record your decision." | 6 min | Records a decision on Make warehouse room |
| 4 | "Can the plan be published to suppliers this week? If not, why not?" | 4 min | Reaches Publish to suppliers and says publishing is held because the data is sample data |
| 5 | "A supplier has not responded to the forecast. Find which one and what you would do." | 5 min | Reaches Supplier responses and names an exception and an action |
| 6 | "Which supplier delivered worst against its confirmed dates recently?" | 4 min | Reaches Supplier performance and names a supplier |
| 7 | "Did last month's forecast run high or low for one product?" | 4 min | Reaches Forecast quality and reads the bias for a product |

## What to record for each task

- Success: yes, with help, or no.
- Time taken.
- The pages visited, in order. Count a wrong turn each time the planner opens a page that is not on the task's path, and note which page.
- The words the planner used when they hesitated, verbatim where possible.
- One sentence on what went wrong, if anything.

## After the tasks (5 minutes)

Ask these, in order, and write down the answers verbatim:
1. "Where would you start next Monday?"
2. "What was the most confusing moment?"
3. "Was anything missing that you need for weekly ordering?"
4. "When you see 'Delivered on the confirmed date' on Supplier performance and 'Confirmed-date lines delivered' on Supplier reliability, what is the difference?" (checks FUX-D5)

## Findings template

Fill one row per problem seen, after all sessions. Merge the same problem across planners into one row.

| ID | Task | Page | What happened | Planners affected (of N) | Severity | Proposed fix |
|---|---|---|---|---|---|---|
| U-01 | | | | | | |

Severity:
- **Blocker:** the planner could not finish the task, or finished it wrongly without noticing.
- **Major:** finished, but only after a wrong turn, a long hesitation or a guess.
- **Minor:** finished, with a moment of doubt.

Also record:
- Task success rate: tasks completed without help, divided by tasks given.
- The answers to after-question 1, which decide whether This week becomes the planners' landing page.
- Whether any planner read the two supplier measures as the same number, which decides whether FUX-D5 is revisited.

## After the sessions

Send the filled template to the owner. Phase 3 task C3 is briefed from its Blocker and Major rows.
