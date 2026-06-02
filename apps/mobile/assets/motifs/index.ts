import { type ImageSourcePropType } from 'react-native';

/**
 * Claymation motifs — small subjects cut out of their original white plates so
 * they can sit on any colored surface. Unlike the full-bleed illustrations in
 * `assets/states` and `assets/onboarding` (which use `ImageHero` to fade their
 * white background into the screen), these are transparent PNGs: render them
 * with a plain `<Image>` and they composite cleanly onto any background.
 *
 * Each entry resolves to a base @1x asset; Metro picks the @2x / @3x file by
 * device density automatically. Source plates live in `~/Downloads/hhh icons`
 * and are reprocessed by `scripts/process-motifs.py`.
 *
 * The three bottle motifs (`message`, `encrypted`, `oldMessage`) keep their
 * glass as a semi-transparent frosted shape, so they read best on lighter
 * surfaces; the solid motifs work on any background, light or dark.
 */
export const motifs = {
  bluetooth: require('./bluetooth.png'),
  connect: require('./connect.png'),
  encrypted: require('./encrypted.png'),
  heart: require('./heart.png'),
  message: require('./message.png'),
  new: require('./new.png'),
  notification: require('./notification.png'),
  oldMessage: require('./old_message.png'),
  pathfind: require('./pathfind.png'),
  post: require('./post.png'),
  qr: require('./qr.png'),
  refresh: require('./refresh.png'),
  settings: require('./settings.png'),
} satisfies Record<string, ImageSourcePropType>;

export type MotifName = keyof typeof motifs;
