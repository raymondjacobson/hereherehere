import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
  /** Reserve no top inset (e.g. when a header already handles it). */
  edges?: { top?: boolean; bottom?: boolean };
};

/**
 * Standard screen container. Warm background, safe-area aware, generous padding.
 */
export function Screen({ children, scroll, padded = true, contentStyle, edges }: Props) {
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

  if (scroll) {
    return (
      <ScrollView
        style={[styles.fill, { backgroundColor: c.bg }]}
        contentContainerStyle={[inner, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.fill, { backgroundColor: c.bg }, inner, contentStyle]}>{children}</View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
