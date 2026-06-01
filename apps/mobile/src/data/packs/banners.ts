import type { ImageSourcePropType } from 'react-native';

/**
 * Optional banner art per event pack, keyed by pack id. Kept out of the
 * serialized EventPack data (which is persisted) since image assets are bundled
 * by reference. Add an entry here to show a banner on the event-pack card.
 */
export const PACK_BANNERS: Record<string, ImageSourcePropType> = {
  'portola-2026': require('../../../assets/packs/portola-banner.jpg'),
};

/** Background color behind each banner (matches the art so `contain` letterboxing blends). */
export const PACK_BANNER_BG: Record<string, string> = {
  'portola-2026': '#263B94',
};
