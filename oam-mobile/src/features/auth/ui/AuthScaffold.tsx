/**
 * Shared shell for the auth screens: safe area + keyboard avoidance + a
 * top-aligned scroll (so the submit button stays reachable with the keyboard
 * open), topped with the OAM logo and a title/subtitle.
 *
 * `headerGap` sets the breathing space between the header block and the form —
 * larger on short screens (sign-in, OTP, reset), default on the fuller sign-up.
 */
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Screen, Text } from "@/shared/ui";
import { LanguagePicker } from "@/shared/i18n/LanguagePicker";

// Must be exactly assets/images/logo.png (PNG).
const logo = require("../../../../assets/images/logo.png");

export function AuthScaffold({
  title,
  subtitle,
  children,
  headerGap = 28,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerGap?: number;
}) {
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 48,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "flex-end", marginBottom: 4 }}>
            <LanguagePicker variant="compact" />
          </View>

          <View style={{ alignItems: "center", marginBottom: headerGap }}>
            <Image
              source={logo}
              style={{ width: 150, height: 56 }}
              contentFit="contain"
              transition={150}
            />
            <Text variant="heading" style={{ marginTop: 18 }}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="body" color="muted" style={{ marginTop: 6, textAlign: "center" }}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
