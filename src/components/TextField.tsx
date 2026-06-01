import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { fontFamily, radius, spacing, type } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

type Props = TextInputProps & { big?: boolean };

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { big, style, ...rest },
  ref,
) {
  const { c } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.textTertiary}
      selectionColor={c.accent}
      style={[
        {
          fontFamily: fontFamily.medium,
          color: c.text,
          backgroundColor: c.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: c.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: big ? spacing.lg : spacing.md,
          fontSize: big ? type.heading.fontSize : type.body.fontSize,
        },
        style,
      ]}
      {...rest}
    />
  );
});
