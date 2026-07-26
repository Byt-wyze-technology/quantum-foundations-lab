# Classroom deployment notes

## Running it

The web app is a static build with no server requirement:

```bash
cd apps/web/frontend
npm install && npm run build
```

`dist/` can be served by anything — a school web server, a USB stick, a laptop
running `npm run preview`. No account, no database, no network calls.

If you would rather run one Python process than a Node toolchain, the Streamlit
front end offers the laboratory:

```bash
python -m pip install -e ".[streamlit]"
streamlit run apps/streamlit/foundations_lab.py
```

To serve the built web app and the API together from one process:

```bash
python -m pip install -e ".[web]"
uvicorn apps.web.backend.main:app --host 0.0.0.0 --port 8000
```

The backend serves `frontend/dist` when it exists.

## Reproducible demonstrations

Every sampling control accepts a **seed**. Set one and the histogram is
identical on every machine in the room — which matters when you want thirty
students looking at the same numbers, and matters more when you want to say
"yours should read 487" and be right.

The API takes a seed too, so a worksheet can quote exact figures.

## Sharing a state

**Share state** copies a link encoding the prepared state, the gate sequence
and the measurement axis. Nothing else: no identifiers, no history, nothing
about the person who made it. Paste it into a worksheet to drop students
straight into a configured laboratory.

## Suggested sequence for a single lesson

A 50-minute class, without rushing:

1. **Sections 1–2** (10 min). The switch beside the sphere, then the polarising
   filters. The filters are the moment most students stop thinking this is
   arbitrary.
2. **Section 3** (10 min). Phase. Let them turn the dial and watch one panel
   move while the other does not. Do not explain it first.
3. **Sections 4–5** (10 min). Pauli operators and reversibility. The undo
   button does more work here than any sentence.
4. **Section 6** (10 min). Measurement, with the shot batches. Ask what they
   expect at 10 shots before running it.
5. **Sections 9–10** (10 min). Entanglement and the Bell builder. Use step
   playback to stop between H and CNOT and ask whether the pair is entangled
   yet — most will say yes, and the panel says no.

Sections 7, 8 and 11 reward a second lesson. Section 11 in particular rewards
being given proper time.

## Questions students actually ask

**"So the qubit is both 0 and 1?"** No — and the app is careful never to say
so. It occupies a state whose measurement probabilities are described by
amplitudes. Section 1's misconception guard is written for exactly this
moment.

**"If measuring Alice's qubit fixes Bob's, isn't that a signal?"** Turn either
dial in Section 11 and watch both marginals stay at 50%. Neither observer's own
results change. The correlation appears only when the two lists are compared,
and comparing them needs an ordinary channel.

**"Is the electron really spinning?"** No. Section 2 says so explicitly, and
the arrow is labelled as a state and a measurement orientation, not an object.

**"Why does the arrow disappear for a Bell pair?"** Because that qubit has no
state of its own. The reduced density matrix is I/2, purity one half, and there
is genuinely no direction to draw. This is usually the most valuable minute in
the lesson.

## Accessibility

Everything works from the keyboard, including the Bloch sphere — arrow keys
move the state, Home returns it to |0>, Shift-drag orbits the view. Every
visual has a text equivalent, and phase is carried by printed figures as well
as colour.

Two switches in the navigation: **Contrast** raises contrast throughout, and
**Motion** stops animation. Motion follows the operating-system setting by
default, so a student who has already asked for less movement does not have to
ask again.

## What to tell students it is not

It is a mathematical teaching model of ideal one- and two-qubit systems. It
does not model decoherence, gate error or readout noise; a real device has all
three. The CHSH panel is an ideal calculation, not a Bell test: it assumes
perfect detectors and freely chosen settings, and simulates no loopholes.

Saying this out loud costs a minute and prevents a durable misunderstanding.
