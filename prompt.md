study specs/README.md
study specs/DOCUMENTATION_SPEC.md
study specs/GUARDRAILS.md

## Current Task: Documentation & Onboarding Implementation

Implement the documentation and onboarding system as specified in DOCUMENTATION_SPEC.md.

### Implementation Phases (in order)

**Phase 1: Onboarding (MVP)**
- [ ] Create OnboardingToast component with auto-dismiss behavior
- [ ] Create OnboardingManager with localStorage persistence
- [ ] Implement 6-step desktop onboarding flow
- [ ] Implement mobile-adapted onboarding steps
- [ ] Add TutorialLightbulb component in status bar
- [ ] Implement toast-to-lightbulb animation on dismiss
- [ ] Add "Replay Tutorial" to Help menu

**Phase 2: In-Context Help**
- [ ] Add documentation to autocomplete suggestions
- [ ] Implement hover tooltips for ST functions/keywords
- [ ] Create Quick Reference panel (toggleable)
- [ ] Enhance error messages with suggestions and "Learn more" links

**Phase 3: Documentation Site**
- [ ] Set up /docs route with layout
- [ ] Implement markdown rendering
- [ ] Create sidebar navigation
- [ ] Write Getting Started guide
- [ ] Write Language reference pages

**Phase 4: Interactive Features**
- [ ] "Try in Editor" buttons for code examples
- [ ] Search functionality
- [ ] Timing diagrams (SVG)
- [ ] Example gallery

**Phase 5: Bug Reporting**
- [ ] Bug report modal with pre-filled info
- [ ] GitHub issue template
- [ ] Console error capture
- [ ] "Report Bug" in Help menu

### Key Design Decisions
- X close button only (no skip text)
- 8 second auto-dismiss with progress bar
- Lightbulb icon in status bar (persistent)
- Toast animates "into" lightbulb on dismiss
- Docs at /docs route (same app bundle)
- Mobile gets adapted onboarding steps

### Important
- Follow the spec closely - it has detailed component implementations
- Ensure onboarding is non-intrusive (doesn't block UI interactions)
- localStorage key: `lle-onboarding-state`
- Commit after each phase or logical chunk of work
- Log any approaches that don't work in GUARDRAILS.md
- Given you're in a loop, make a logical amount of progress per iteration
- Only report RALPH_DONE when all phases are complete
