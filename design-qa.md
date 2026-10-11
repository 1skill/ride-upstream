# Mobile V2.3 Design QA

- Source visual truth: `/Users/shuiying/.codex/generated_images/01a12a7f-791b-7a41-9a01-1f835bcfacb3/exec-6f9d13cd-0a2d-442e-8319-da1451e294ec.png` and `/Users/shuiying/.codex/generated_images/01a12a7f-791b-7a41-9a01-1f835bcfacb3/exec-10a5e9a5-a81e-4045-8bdc-6136f93532cb.png`
- Implementation screenshots: `output/mobile-v23/03-explore-final.png` and `output/mobile-v23/04-ride-final.png`
- Combined comparison evidence: `output/mobile-v23/qa-explore.png` and `output/mobile-v23/qa-ride.png`
- Viewport: 390 x 844 CSS pixels, deviceScaleFactor 1
- Source pixels: 853 x 1844, normalized to 390 x 844 for comparison
- Implementation pixels: 390 x 844
- States: Explore with Blackberry selected; Ride with Blackberry selected

## Findings

- No actionable P0, P1, or P2 issues remain.
- Typography: the implementation uses the existing system font stack with clear 11–16 px UI hierarchy. It is slightly denser than the generated concept but remains readable and avoids clipped labels.
- Spacing and layout: Explore keeps the map dominant and exposes the next card as a swipe cue. Ride uses a compact route summary and fixed three-action bar. Persistent controls remain visible at 390 x 844.
- Colors: existing forest green, orange, off-white, and verified green tokens match the selected directions.
- Image quality: the map remains a live vector map. Concept photography was intentionally omitted because no verified Blackberry route photo exists; no unrelated or fabricated route image was substituted.
- Copy: candidate routes are explicitly labeled as unverified and cannot enter Ride mode. Apple and Google actions are explicitly parking directions; GPX remains the riding-track action.
- Intentional route difference: the generated Ride concept contains an illustrative loop. The implementation preserves the audited GPS geometry instead of copying that fictional shape.

## Interaction verification

- Explore/Ride mode switch: passed.
- Horizontal route selection: passed.
- Candidate selection disables Ride mode: passed.
- Re-selecting the verified route opens full details: passed.
- Apple parking, Google parking, and GPX actions remain separate: passed.
- Desktop 1440 x 900 regression: passed.
- Browser console: application code produced no runtime error. Local preview reports the expected unavailable `/api/photos` request and non-blocking OpenFreeMap sprite warnings; production API is verified separately.

## Comparison history

1. Initial implementation exposed the collapsed legacy detail panel beneath the route carousel. Fixed by making the panel inert and invisible until explicitly expanded.
2. Ride mode initially lacked a route identity header. Fixed with the compact route name, distance, climb, and verification summary.
3. Switching from a candidate back to Blackberry left the candidate popup visible. Fixed by closing the active popup when selecting the verified route.

## Follow-up polish

- Add real route photography to carousel cards only after photos are associated with the correct route.
- Physical iPhone Safari testing remains advisable for native scrolling momentum and safe-area behavior.

final result: passed
