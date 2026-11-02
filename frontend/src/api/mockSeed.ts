// Dados de demonstração (copiados do seed do backend). Usados só quando EXPO_PUBLIC_USE_MOCK=true.
export type SeedContent = {
  id: string; title: string; subtitle: string; thumbnail: string; duration_minutes: number; cuts_per_minute: number;
  pacing: string; audio_note: string; age_brackets: string[]; stimulus_badges: string[]; ai_verdict: string; ai_reason: string;
  color_profile: string; flash_stimuli: boolean;
};
export const SEED_CONTENT: SeedContent[] = [
  {
    "title": "Contos da Floresta",
    "subtitle": "Temporada 1 • histórias calmas da mata",
    "thumbnail": "https://images.unsplash.com/photo-1648824156751-b994ece57a10?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxmb3Jlc3QlMjB0YWxlcyUyMGlsbHVzdHJhdGlvbnxlbnwwfHx8fDE3ODcyNzQ3ODF8MA&ixlib=rb-4.1.0&q=85",
    "duration_minutes": 18,
    "cuts_per_minute": 2.0,
    "pacing": "Lento e deliberado",
    "audio_note": "Áudio natural calmante, sem efeitos bruscos",
    "age_brackets": [
      "toddler",
      "explorer"
    ],
    "stimulus_badges": [
      "Linguagem",
      "Calma emocional"
    ],
    "ai_verdict": "approved",
    "ai_reason": "O ritmo fica em 2 cortes de cena por minuto, a narração não tem pressa e a paleta usa verdes naturais, sem nenhum estímulo de flash.",
    "color_profile": "Tons terrosos naturais",
    "flash_stimuli": false,
    "id": "c1"
  },
  {
    "title": "Pequeno Carpinteiro",
    "subtitle": "Trabalho manual real com um adulto",
    "thumbnail": "https://images.pexels.com/photos/32795058/pexels-photo-32795058.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "duration_minutes": 12,
    "cuts_per_minute": 1.6,
    "pacing": "Lento e deliberado",
    "audio_note": "Sons reais da oficina, sem trilha sonora",
    "age_brackets": [
      "explorer",
      "preteen"
    ],
    "stimulus_badges": [
      "Construção de foco",
      "Coordenação fina"
    ],
    "ai_verdict": "approved",
    "ai_reason": "Planos longos e sem corte deixam a atenção assentar; as mãos permanecem em quadro, então a criança acompanha uma ação do início ao fim.",
    "color_profile": "Neutros de madeira",
    "flash_stimuli": false,
    "id": "c2"
  },
  {
    "title": "Exploradores da Geometria",
    "subtitle": "Episódio 4 • construindo pontes com formas",
    "thumbnail": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
    "duration_minutes": 14,
    "cuts_per_minute": 3.4,
    "pacing": "Lento e deliberado",
    "audio_note": "Fundo ambiente suave sob a narração",
    "age_brackets": [
      "explorer",
      "preteen"
    ],
    "stimulus_badges": [
      "Raciocínio espacial",
      "Calma emocional"
    ],
    "ai_verdict": "approved",
    "ai_reason": "Ritmo abaixo de 4 cortes de cena por minuto, cores naturais e zero estímulos de flash.",
    "color_profile": "Cores primárias suaves",
    "flash_stimuli": false,
    "id": "c3"
  },
  {
    "title": "Canções do Jardim do Céu",
    "subtitle": "Seleção para a hora de dormir",
    "thumbnail": "https://images.pexels.com/photos/6951647/pexels-photo-6951647.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "duration_minutes": 22,
    "cuts_per_minute": 0.8,
    "pacing": "Quase estático",
    "audio_note": "Um só instrumento, com fade gradual",
    "age_brackets": [
      "toddler",
      "explorer",
      "preteen"
    ],
    "stimulus_badges": [
      "Calma emocional",
      "Preparo para o sono"
    ],
    "ai_verdict": "approved",
    "ai_reason": "Menos de um corte por minuto e curva de áudio descendente — ideal como substituição durante um Soft Landing.",
    "color_profile": "Azuis do crepúsculo e creme",
    "flash_stimuli": false,
    "id": "c4"
  },
  {
    "title": "Ateliê de Argila",
    "subtitle": "Modelagem sensorial, um pote por vez",
    "thumbnail": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
    "duration_minutes": 16,
    "cuts_per_minute": 2.2,
    "pacing": "Lento e deliberado",
    "audio_note": "Argila úmida e um cantarolar baixo",
    "age_brackets": [
      "toddler",
      "explorer"
    ],
    "stimulus_badges": [
      "Coordenação fina",
      "Construção de foco"
    ],
    "ai_verdict": "approved",
    "ai_reason": "A câmera mantém o mesmo quadro por longos trechos, permitindo que a criança antecipe o que vem em seguida em vez de perseguir cortes.",
    "color_profile": "Terracota e linho",
    "flash_stimuli": false,
    "id": "c5"
  },
  {
    "title": "Observadores da Maré",
    "subtitle": "Caminhadas de descoberta no litoral",
    "thumbnail": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
    "duration_minutes": 20,
    "cuts_per_minute": 2.6,
    "pacing": "Lento e deliberado",
    "audio_note": "Ondas e conversa sem roteiro",
    "age_brackets": [
      "explorer",
      "preteen"
    ],
    "stimulus_badges": [
      "Curiosidade",
      "Raciocínio espacial"
    ],
    "ai_verdict": "approved",
    "ai_reason": "Luz natural, observação em tempo real e ausência de edição em laço de recompensa mantêm a carga cognitiva na faixa equilibrada.",
    "color_profile": "Verdes do mar",
    "flash_stimuli": false,
    "id": "c6"
  }
];

export const OFFLINE_ACTIVITIES: { title: string; why: string; minutes: number; icon: string }[] = [
  {
    "title": "Modelagem sensorial em argila",
    "why": "Recupera o foco tátil depois da tela",
    "minutes": 20,
    "icon": "circle"
  },
  {
    "title": "Caça a padrões ao ar livre",
    "why": "Relaxamento visual com foco a distância",
    "minutes": 30,
    "icon": "sun"
  },
  {
    "title": "Recontar a história devagar",
    "why": "Transforma assistir em produzir linguagem",
    "minutes": 15,
    "icon": "book-open"
  },
  {
    "title": "Caminhada de equilíbrio descalço",
    "why": "Aterra o corpo e reinicia a atenção",
    "minutes": 12,
    "icon": "wind"
  }
];
