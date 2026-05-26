// Catálogo central de tutoriais em vídeo por tela.
// Cada export é um array de { title, description?, url } consumido por
// <BotaoTutoriais> no header da respectiva tela.
//
// Pra adicionar um novo vídeo: cole o link e descreva curto. Pra adicionar
// uma tela nova: crie outro export aqui e importe no header da página.

// Tela "Meus Alunos" (Dashboard /) — entrada principal pós-login.
// Concentra os 3 vídeos de boas-vindas (visão geral, primeiros passos, cadastro de aluno).
export const TUTORIAIS_MEUS_ALUNOS = [
  {
    title: 'Visão geral da plataforma',
    description: 'Tour completo das funcionalidades do sistema para profissionais.',
    url: 'https://www.youtube.com/watch?v=xGXqvc0lsXs',
  },
  {
    title: 'Primeiros passos e personalização',
    description: 'Como configurar sua conta, personalizar e navegar pelas telas principais.',
    url: 'https://www.youtube.com/watch?v=3sAvtFljpz0',
  },
  {
    title: 'Como cadastrar e integrar um aluno',
    description: 'Passo a passo pra cadastrar um aluno novo e integrá-lo à plataforma.',
    url: 'https://www.youtube.com/watch?v=YhxUE2ODkXg&t=5s',
  },
]

export const TUTORIAIS_FORMULARIOS = [
  {
    title: 'Criando formulários personalizados',
    description: 'Como montar seus próprios formulários de anamnese e feedback.',
    url: 'https://www.youtube.com/watch?v=DIJAHKcmBCs&t=25s',
  },
]

export const TUTORIAIS_CRONOGRAMA_FEEDBACKS = [
  {
    title: 'Planejando o cronograma de feedbacks',
    description: 'Como definir frequência e datas dos feedbacks dos seus alunos.',
    url: 'https://www.youtube.com/watch?v=PwWJV8fgklo',
  },
]

export const TUTORIAIS_TREINOS_PROGRESSAO = [
  {
    title: 'Acompanhe treinos e progressão de cargas',
    description: 'Como ver os treinos realizados e a evolução das cargas de cada aluno.',
    url: 'https://www.youtube.com/watch?v=XckhEiwEv0w&t=1s',
  },
]

export const TUTORIAIS_EXERCICIOS = [
  {
    title: 'Cadastrar links de vídeos dos exercícios',
    description: 'Como vincular vídeos demonstrativos a exercícios, alongamentos e aeróbicos.',
    url: 'https://www.youtube.com/watch?v=tyYrgLYlc_k',
  },
  {
    title: 'Importando exercícios em massa',
    description: 'Importação de exercícios, alimentos, alongamentos e aeróbicos via planilha.',
    url: 'https://www.youtube.com/watch?v=EhCm072Ky4g',
  },
]

export const TUTORIAIS_ALIMENTOS = [
  {
    title: 'Importando alimentos e cadastrando refeições prontas',
    description: 'Como importar sua tabela de alimentos e montar refeições reutilizáveis.',
    url: 'https://www.youtube.com/watch?v=EhCm072Ky4g',
  },
]

export const TUTORIAIS_REFEICOES_PRONTAS = [
  {
    title: 'Cadastrando refeições prontas',
    description: 'Crie refeições reutilizáveis pra agilizar a montagem das dietas.',
    url: 'https://www.youtube.com/watch?v=EhCm072Ky4g',
  },
]
