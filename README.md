# GPA Calculator

A static, browser-only GPA calculator styled like an academic report card. Add courses, pick a grade, and watch the GPA "stamp" update live. No backend, no accounts, no build step — just HTML, CSS, and JS.
## Features

- Add / remove course rows (name, credit hours, letter grade)
- Live GPA calculation, weighted by credit hours
- Optional weighted scale toggle (+1.0 for Honors/AP courses)
- Semester GPA + running cumulative GPA across saved semesters
- Save a semester to history and start a fresh one
- Data persists locally via `localStorage` — nothing is sent over the network
- Responsive layout: table becomes stacked cards on small screens
- Input validation (credit range, required grade selection) with inline error states

## How to run locally

No install, no dependencies.

```bash
git clone https://github.com/Shehryar-92/gpa-calculator.git
cd gpa-calculator
open index.html   # or just double-click the file / drag it into a browser
```

Or serve it with any static server, e.g.:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech stack

- **HTML5** — semantic structure, `<template>` for course rows
- **CSS3** — custom properties, `conic-gradient` for the GPA stamp, responsive breakpoints, no framework
- **Vanilla JavaScript (ES6+)** — no libraries, no build tooling
- **localStorage** — client-side persistence

## Grading scale

| Grade | Points |
|-------|--------|
| A+ / A | 4.0 |
| B+ | 3.5 |
| B | 3.0 |
| C+ | 2.5 |
| C | 2.0 |
| D+ | 1.5 |
| D | 1.0 |
| F | 0.0 |

Enable **Weighted scale** to add +1.0 to any course marked Honors/AP.

## Roadmap / Might Add Later

- Custom/alternate grading scales
- PDF or transcript export
  
## out of scope for v1

- Accounts, cloud sync, multi-device support

