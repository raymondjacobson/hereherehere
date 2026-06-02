import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { Glow } from './Glow';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
  /** Reserve no top inset (e.g. when a header already handles it). */
  edges?: { top?: boolean; bottom?: boolean };
  /** Paint the ambient glow background. Off for flows with edge-faded hero
   *  images (e.g. onboarding), whose vignettes need a flat bg to blend into. */
  glow?: boolean;
};

/**
 * Standard screen container. Warm background, safe-area aware, generous padding.
 */
export function Screen({ children, scroll, padded = true, contentStyle, edges, glow = true }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const top = edges?.top === false ? 0 : insets.top;
  const bottom = edges?.bottom === false ? 0 : insets.bottom;

  const inner: ViewStyle = {
    paddingTop: top + (padded ? spacing.lg : 0),
    paddingBottom: bottom + (padded ? spacing.xl : 0),
    paddingHorizontal: padded ? spacing.xl : 0,
    flexGrow: 1,
  };

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      {glow ? <Glow /> : null}
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[inner, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, inner, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
