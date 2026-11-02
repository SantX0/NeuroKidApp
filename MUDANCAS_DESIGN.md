# NeuroKid — mudanças de design (claro/escuro)

## Paleta (baseada no prompt de referência)
| Token | Claro | Escuro |
|---|---|---|
| Fundo (`surface`) | #FFFFFF | #0E151D (azul-acinzentado profundo) |
| Cartões (`card`) | #FFFFFF | #172330 |
| Primária / tipografia (verde-escuro) | #0F5132 / #0B2E22 | #25915F / #E7F2ED |
| Acento ativo (verde) | #2E9E68 | #4ADE9A |
| Selos de status | verde-escuro #1A7F4F · amarelo #F5C518 · vermelho #E5484D | #2FB57A · #F5C518 · #FF6B6B |

## Novos arquivos
- `src/theme/ThemeContext.tsx` — `ThemeProvider` + `useTheme()`; preferência claro/escuro/sistema salva no aparelho.
- `src/components/ProgressRing.tsx` — anel animado (gradiente verde-escuro→verde; amarelo ≥70%, vermelho ≥90%).
- `src/components/FluidTabBar.tsx` — menu inferior com indicador que desliza em spring e ícone que "salta".
- `src/components/Illustrations.tsx` — `KidsPlayingScene`: crianças brincando (bola, pipa, blocos) em SVG, acompanha o tema; usada no painel e nos estados vazios de Alertas e Acervo.
- `app/(tabs)/settings.tsx` — "Controles dos pais" com switch de modo escuro, tema do aparelho e escudo.

## Arquivos alterados
- `src/theme/tokens.ts` (paletas `lightColors`/`darkColors`, tipo `Palette`, `toneColor(tone, palette)`).
- `src/components/Base.tsx` (novo `StatusBadge` tricolor; `Card` usa `colors.card`).
- Todas as telas e componentes com `StyleSheet.create` passaram a usar `makeStyles(colors)` + `useTheme()`.
- `app/_layout.tsx` (ThemeProvider, StatusBar), `app/(tabs)/_layout.tsx` (nova aba "Ajustes", barra fluida),
  `app/(tabs)/index.tsx` (anel de progresso, selo tricolor, atualização a cada 30 s).

## Ciano removido
O ciano foi substituído por verde (token `accentActive`; no modo escuro usa um verde mais claro porque verde-escuro some no fundo azul-acinzentado).

## Ainda não incluído
- Gráfico multicamadas de estímulo (tela do modo escuro).
- Validado só com checagem de tipos/sintaxe (`tsc`); não foi possível rodar o app (node_modules incompleto no .rar).

## Demonstração no Vercel
- `src/api/mock.ts` + `src/api/mockSeed.ts`: API simulada em memória, ligada por `EXPO_PUBLIC_USE_MOCK=true`.
- `frontend/vercel.json`, scripts `build:web` e `web:demo` no `package.json`. Passo a passo no README.
- Correção: `FluidTabBar` importava tipos de `@react-navigation/bottom-tabs`, que não existe no Expo SDK 57; agora usa `expo-router/js-tabs`.
- Validado: `tsc --noEmit` sem erros, `expo export --platform web` concluído e 24 verificações das rotas simuladas.
