# Black Sea Modern Interior Galleries Implementation Plan

## Goal
Add a second, plan-accurate five-view renovation gallery named «Черноморский модерн» for every one of the eight residence types, then let visitors switch between it and the existing Art Deco gallery.

## Current System Notes
- `js/residence-media.js` serves all 33 apartments from eight plan-type folders.
- Each folder has five existing Art Deco images and an embedded 3D model.
- New images will be created by editing the existing matching Art Deco image for each view. This preserves room shell, window placement, circulation, and camera framing.

## Tasks
- [ ] Create five Black Sea Modern images for each plan type from matching Art Deco source images.
  - Files: `assets/residences/<slug>/black-sea-modern/01-overview.png` through `05-bathroom.png`
  - Change: retain the architectural shell and camera for every source image; change only furnishings and finishes.
  - Tests: visual review of every output against its source room and plan.
  - Depends on: none
- [ ] Add an accessible renovation-style selector and second gallery to the residence media component.
  - Files: `js/residence-media.js`, `css/chess.css`, localization files
  - Change: visitors can select «Ар-деко» or «Черноморский модерн» within the interior tab.
  - Tests: `node js/residence-media.test.cjs`; browser interaction on a representative residence.
  - Depends on: image assets
- [ ] Validate, commit, and publish.
  - Files: generated assets and media UI files
  - Tests: static gallery test, 3D cutaway test, local browser render, GitHub Pages deploy.
  - Depends on: all preceding tasks

## Verification
- Every style/type combination exposes five images.
- All generated images preserve their matching source room geometry and camera framing.
- Style switching updates hero, thumbnails, captions, lightbox and accessible state.

## Risks
- Image generation may alter room layout. Reject any result with shifted walls, openings, window positions, or camera, and regenerate only that image with stricter preservation instructions.
