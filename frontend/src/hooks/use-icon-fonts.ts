// Prewarm do font de ícones. Com @react-native-vector-icons o .ttf vem do
// próprio pacote (require local), então registramos a família "Feather" via
// expo-font antes de qualquer <Feather> montar. Isso evita o tofu de ícones
// no Expo Go (Android), onde o carregamento tardio da família falha.
// Uso: const [loaded, error] = useIconFonts();

import { useFonts } from "expo-font";

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    Feather: require("@react-native-vector-icons/feather/fonts/Feather.ttf"),
  });
