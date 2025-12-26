import React, { forwardRef } from "react";
import { Animated, Pressable, StyleSheet, StyleProp, ViewStyle, PressableProps, TextStyle } from "react-native";
import { ThemedText } from "./ThemedText";
import { Colors } from "@/constants/Colors";

interface StyledButtonProps extends PressableProps {
  children?: React.ReactNode;
  text?: string;
  variant?: "default" | "primary" | "ghost";
  isSelected?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  hasTVPreferredFocus?: boolean;
  disabled?: boolean;
}

export const StyledButton = forwardRef<Pressable, StyledButtonProps>(
  ({ children, text, variant = "default", isSelected = false, style, textStyle, ...rest }, ref) => {
    const colorScheme = "dark";
    const colors = Colors[colorScheme];
    const [isFocused, setIsFocused] = React.useState(false);

    const variantStyles = {
      default: StyleSheet.create({
        button: {
          backgroundColor: colors.border,
        },
        text: {
          color: colors.text,
        },
        selectedButton: {
          backgroundColor: colors.primary,
        },
        focusedButton: {
          borderColor: colors.primary,
        },
        selectedText: {
          color: Colors.dark.text,
        },
      }),
      primary: StyleSheet.create({
        button: {
          backgroundColor: "transparent",
        },
        text: {
          color: colors.text,
        },
        focusedButton: {
          backgroundColor: colors.primary,
          borderColor: colors.background,
        },
        selectedButton: {
          backgroundColor: colors.primary,
        },
        selectedText: {
          color: colors.link,
        },
      }),
      ghost: StyleSheet.create({
        button: {
          backgroundColor: "transparent",
        },
        text: {
          color: colors.text,
        },
        focusedButton: {
          backgroundColor: "rgba(119, 119, 119, 0.2)",
          borderColor: colors.primary,
        },
        selectedButton: {},
        selectedText: {},
      }),
    };

    const styles = StyleSheet.create({
      button: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "transparent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      focusedButton: {
        backgroundColor: colors.link,
        borderColor: colors.background,
        elevation: 5,
        shadowColor: colors.link,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
      selectedButton: {
        backgroundColor: colors.tint,
      },
      text: {
        fontSize: 16,
        fontWeight: "500",
        color: colors.text,
      },
      selectedText: {
        color: Colors.dark.text,
      },
    });

    // 按钮动画，使用本地状态
    const animationStyle = {
      transform: [{
        scale: isFocused ? 1.1 : 1
      }],
    };

    return (
      <Animated.View style={[animationStyle, style]}>
        <Pressable
          android_ripple={{ color: Colors.dark.link, borderless: false }}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={({ pressed, focused }) => [
            styles.button,
            variantStyles[variant].button,
            isSelected && (variantStyles[variant].selectedButton ?? styles.selectedButton),
            focused && [
              variantStyles[variant].focusedButton ?? styles.focusedButton,
              {
                borderWidth: 3,
                borderColor: colors.primary,
                elevation: 8,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
              }
            ],
          ]}
          {...rest}
        >
          {text ? (
            <ThemedText
              style={[
                styles.text,
                variantStyles[variant].text,
                isSelected && (variantStyles[variant].selectedText ?? styles.selectedText),
                textStyle,
              ]}
            >
              {text}
            </ThemedText>
          ) : (
            children
          )}
        </Pressable>
      </Animated.View>
    );
  }
);

StyledButton.displayName = "StyledButton";
