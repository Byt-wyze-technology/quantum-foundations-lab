# Security policy

## Scope

Quantum Foundations Lab has no accounts, stores no personal data and makes no
outbound network calls. The web app runs entirely in the browser; the optional
FastAPI backend accepts only small mathematical payloads, caps shot counts and
circuit depth, limits request size, configures CORS strictly and executes no
dynamic code.

That keeps the attack surface small, but not empty. Reports are welcome.

## Reporting a vulnerability

Please report privately rather than opening a public issue — use GitHub's
private vulnerability reporting, or contact a maintainer directly.

Please include what you found, how to reproduce it, and what an attacker could
achieve. You can expect an acknowledgement within a few days and an assessment
shortly after.

## Out of scope

- Denial of service through very large or very frequent requests to a backend
  you host yourself. Rate limiting is a deployment concern; the shot and depth
  caps are there to keep a single request bounded, not to survive a flood.
- Physical or cryptographic claims. This is a mathematical teaching model, not
  a security product, and nothing here should be used to generate randomness
  or key material.
