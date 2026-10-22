// Black Week — definição completa de todas as tarefas do playbook

export const PHASES = [
  { id: 'pre',        label: 'Pré-campanha',     icon: '📋', dates: 'Até 23/10' },
  { id: 'setup',      label: 'Setup',            icon: '⚙️', dates: '22/10' },
  { id: 'patients',   label: 'Lista de Pacientes',icon: '📩', dates: '27/10' },
  { id: 'week_before',label: 'Semana Antes',     icon: '📣', dates: '02/11' },
  { id: 'countdown',  label: 'Contagem',         icon: '⏱️', dates: '04–08/11' },
  { id: 'training',   label: 'Treino',           icon: '🏋️', dates: '06/11' },
  { id: 'precheck',   label: 'Véspera',          icon: '✅', dates: '07/11' },
  { id: 'day1',       label: 'Dia 1 – Botox',    icon: '🔥', dates: '09/11' },
  { id: 'day2',       label: 'Dia 2 – Preench.', icon: '🔥', dates: '10/11' },
  { id: 'day3',       label: 'Dia 3 – Bioestim.',icon: '🔥', dates: '11/11' },
  { id: 'day4',       label: 'Dia 4 – Pele',     icon: '🔥', dates: '12/11' },
  { id: 'day5',       label: 'Dia 5 – Corporais',icon: '🔥', dates: '13/11' },
  { id: 'closing',    label: 'Encerramento',     icon: '🏆', dates: '14/11' },
  { id: 'post',       label: 'Pós-Black',        icon: '📊', dates: '16/11' },
]

const T = (id, phase, date, time, role, channel, title, note, scripts, checks, dayIndex) => ({
  id, phase, date, time, role, channel, title, note, scripts: scripts || null, checks: checks || null, dayIndex: dayIndex || null,
})

// Emoji correlacional por tipo de procedimento (sem 💉 nem 💋)
export const OUTROS_EMOJIS = ['🥵','🤭','🫣','🥹','🥰','😍','😎','😱','🤩','🤯']

// Retorna null quando não há correspondência (para o caller decidir o fallback)
export function getProcedureEmojiStrict(name = '') {
  const n = name.toLowerCase()
  if (/glut|bumbum|náde|nádega|pêssego/.test(n)) return '🍑'
  if (/corp|lipo|gordura|barriga|redução/.test(n)) return '🔥'
  if (/botox|bótox|toxina/.test(n)) return '✨'
  if (/preench|labio|lábio|hialuron|volume/.test(n)) return '🌹'
  if (/bioestim|colágeno|colagen|sculptra|radiesse/.test(n)) return '💎'
  if (/limpeza/.test(n)) return '🫧'
  if (/pele|skin|micro|pdrn|skinboo|facial|peeling|hidrat/.test(n)) return '🧖'
  if (/fio|thread|lifting|jowl|risorius|tensor/.test(n)) return '⬆️'
  if (/mama|seio|peit/.test(n)) return '🌸'
  if (/olho|pálpebra|blefaroplastia/.test(n)) return '👁️'
  if (/laser|luz|fotorejuven|carbon|peeling/.test(n)) return '💡'
  if (/gord|emagr|cavitação|criolip/.test(n)) return '🔥'
  return null
}

export function getProcedureEmoji(name = '', index = 0) {
  return getProcedureEmojiStrict(name) ?? OUTROS_EMOJIS[index % OUTROS_EMOJIS.length]
}

// ─── PRÉ-CAMPANHA ─────────────────────────────────────────────────────────────
const PRE = [
  T('pre_01','pre','2026-10-23',null,'owner','internal','Pesquisar preço da concorrência','Pesquise o preço de cada procedimento nas clínicas da sua cidade antes de definir os valores da Black.',null,null),
  T('pre_02','pre','2026-10-23',null,'owner','internal','Definir preço Black de cada dia',
    'Seg 09: Botox 3 regiões · Ter 10: Preenchimento · Qua 11: Bioestimuladores · Qui 12: Pele · Sex 13: Corporais. Preenche os preços na aba Configuração.',null,null),
  T('pre_03','pre','2026-10-23',null,'owner','internal','Conferir se cada preço ainda dá lucro',null,null,null),
  T('pre_04','pre','2026-10-23',null,'owner','internal','Definir quantas vagas por dia',null,null,null),
  T('pre_05','pre','2026-10-23',null,'owner','internal','Definir formas de pagamento','Pix, cartão, quantas parcelas.',null,null),
  T('pre_06','pre','2026-10-23',null,'owner','internal','Escrever meta de faturamento e número de pessoas no grupo',null,null,null),
  T('pre_07','pre','2026-10-23',null,'owner','internal','Bloquear agenda da injetora e conferir estoque',null,null,null),
  T('pre_08','pre','2026-10-23',null,'owner','spark','Enviar tudo para a Spark','Decisões, preços, vagas, formas de pagamento.',null,null),
  T('pre_v1','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 1 de anúncio',null,[{label:'Roteiro Vídeo 1',text:'Atenção você de {{CIDADE}}. Nesse mês de novembro você vai fazer seu botox, bioestimulador, preenchimento ou qualquer outro procedimento estético. Isso porque na Black Week da {{CLINICA}} teremos condições nunca vistas antes na história! Quer garantir sua vaga no nosso grupo exclusivo? Clica no botão que tá aparecendo aqui e vem pra {{CLINICA}}.'}],null),
  T('pre_v2','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 2 de anúncio',null,[{label:'Roteiro Vídeo 2',text:'Bioestimuladores, botox, preenchimentos e muito mais por condições nunca vistas antes no grupo exclusivo de Black da {{CLINICA}} de {{CIDADE}}. Quer garantir sua vaga? Clica no botão que está aparecendo aqui na sua tela.'}],null),
  T('pre_v3','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 3 de anúncio',null,[{label:'Roteiro Vídeo 3',text:'Eu sei que você esperou o ano todo por esse momento. A Black Week da {{CLINICA}} finalmente chegou. Todos os procedimentos estéticos com condições nunca vistas antes na história. Quer garantir sua vaga no grupo secreto? Clica no botão que tá aparecendo aqui.'}],null),
  T('pre_v4','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 4 de anúncio',null,[{label:'Roteiro Vídeo 4',text:'A Black Week da {{CLINICA}} chegou e já tem data definida. Não quer ficar de fora? Clica no botão que tá aparecendo aqui na sua tela e vem pro grupo secreto.'}],null),
  T('pre_v5','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 5 de anúncio',null,[{label:'Roteiro Vídeo 5',text:'A Black Week mais esperada de {{CIDADE}} chegou. E pra que todas vocês consigam garantir os melhores procedimentos estéticos por condições nunca vistas antes, preparamos um grupo secreto. Quer garantir sua vaga? Clica no botão que está aparecendo aqui na sua tela.'}],null),
  T('pre_v6','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 6 de anúncio',null,[{label:'Roteiro Vídeo 6',text:'A Black Week {{CLINICA}} chegou e chegou sua hora de fazer aquele procedimento estético que você sempre sonhou. Quer garantir sua vaga no grupo secreto? Clica no botão que tá aparecendo aqui na sua tela.'}],null),
  T('pre_v7','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 7 de anúncio',null,[{label:'Roteiro Vídeo 7',text:'Não faz seu botox ou procedimento estético ainda! Isso porque a Black Week {{CLINICA}} chegou e você vai ter o melhor da estética pelo melhor valor. O seu convite para o grupo secreto está aqui. É só clicar aqui.'}],null),
  T('pre_v8','pre','2026-10-23',null,'owner','internal','Gravar Vídeo 8 de anúncio',null,[{label:'Roteiro Vídeo 8',text:'Conseguimos negociar com nossos fornecedores e teremos a melhor Black Week da história! Botox, preenchedores, bioestimuladores e muito mais por condições nunca vistas antes. Quer participar do grupo secreto? É só clicar aqui.'}],null),
  T('pre_r1','pre','2026-10-23',null,'owner','internal','Gravar Vídeo de remarketing 1',null,[{label:'Roteiro Remarketing 1',text:'Vai correr o risco de ficar de fora da Black Week {{CLINICA}}? Tô deixando seu convite aqui na tela de novo pra você garantir seu procedimento estético por valores que nem você vai acreditar.\n\n[pausa]\n\nE aí, tá esperando o quê? Clica aqui.'}],null),
  T('pre_r2','pre','2026-10-23',null,'owner','internal','Gravar Vídeo de remarketing 2',null,[{label:'Roteiro Remarketing 2',text:'Você costuma deixar tudo pra última hora? Porque a última hora chegou. Última oportunidade pra você garantir sua vaga na Black Week {{CLINICA}}. Pra entrar no grupo secreto, é só clicar aqui.'}],null),
  T('pre_r3','pre','2026-10-23',null,'owner','internal','Gravar Vídeo de remarketing 3',null,[{label:'Roteiro Remarketing 3',text:'Me conta uma coisa: tá querendo pagar mais caro no seu procedimento? Essa é a última vez que vou disponibilizar o seu convite pra Black Week {{CLINICA}}. É só clicar aqui.'}],null),
  T('pre_09','pre','2026-10-23',null,'owner','spark','Enviar todos os vídeos para a Spark','Spark edita e manda para aprovação.',null,null),
  T('pre_10','pre','2026-10-23',null,'owner','internal','Separar fotos de antes e depois de cada procedimento','Só use fotos com autorização do paciente.',null,null),
]

// ─── SETUP – 22/10 (grupo) + 26/10 (Instagram) ───────────────────────────────
const SETUP = [
  T('setup_g1','setup','2026-10-22',null,'c1','group','Criar grupo no WhatsApp da clínica',null,null,null),
  T('setup_g2','setup','2026-10-22',null,'c1','group','Adicionar 2 pessoas da equipe como admin',null,null,null),
  T('setup_g3','setup','2026-10-22',null,'c1','group','Configurar: só admins enviam mensagens e editam o grupo',null,null,null),
  T('setup_g4','setup','2026-10-22',null,'c1','group','Renomear grupo',null,[{label:'Nome do grupo',text:'🔥 09/11 BLACK WEEK {{CIDADE}} | {{CLINICA}}'}],null),
  T('setup_g5','setup','2026-10-22',null,'c1','group','Definir foto do grupo com fundo preto',null,null,null),
  T('setup_g6','setup','2026-10-22',null,'c1','group','Adicionar descrição ao grupo',null,[{label:'Descrição do grupo',text:'A BLACK WEEK está chegando com tudo, e pra que você não perca sua vaga, fique atento às seguintes regras:\n\nSua vaga só é preenchida após pagamento e agendamento\nNão nos responsabilizaremos caso você perca as condições após as vagas determinadas\nPara que todos consigam participar, cada participante só pode ter acesso a mais de um procedimento após confirmação do primeiro\nAs condições valem apenas pro dia comunicado\n\nBoa sorte a todossss 🤩'}],null),
  T('setup_g7','setup','2026-10-22',null,'c1','group','Copiar link de convite e testar em outro celular',null,null,null),
  T('setup_g8','setup','2026-10-22',null,'c1','spark','Enviar link do grupo para a Spark',null,null,null),
  T('setup_i1','setup','2026-10-26',null,'c2','instagram','Trocar foto de perfil para fundo preto',null,null,null),
  T('setup_i2','setup','2026-10-26',null,'c2','instagram','Atualizar bio do Instagram',null,[{label:'Bio',text:'🔥 Black Week {{CLINICA}} 09/11\n👇 Entre no grupo secreto'}],null),
  T('setup_i3','setup','2026-10-26',null,'c2','instagram','Configurar link da bio para WhatsApp com mensagem pronta',null,[{label:'Mensagem automática do WhatsApp',text:'Olá! Vim do Instagram e quero participar da Black Week {{CLINICA}} e entrar no grupo secreto'}],null),
  T('setup_i4','setup','2026-10-26',null,'c2','instagram','Colocar nota no Instagram',null,[{label:'Nota do Instagram',text:'🔥 09/11 BLACK WEEK'}],null),
  T('setup_i5','setup','2026-10-26',null,'c2','instagram','Gravar e postar Storie 1 com link do WhatsApp',null,[{label:'Roteiro Storie 1',text:'Eu sei que você esperou o ano todo por esse momento. A Black Week {{CLINICA}} já tem uma data: 09/11. Todos os nossos procedimentos estarão com condições nunca vistas na história. O seu convite está aqui na sua tela, clica e entra no grupo secreto.'}],null),
  T('setup_i6','setup','2026-10-26',null,'c2','instagram','Gravar e postar vídeo do feed',null,[{label:'Roteiro vídeo feed',text:'Eu sei que você esperou o ano todo por esse momento. A Black Week {{CLINICA}} já tem uma data: 09/11. Todos os nossos procedimentos estarão com condições nunca vistas na história. O seu convite está te esperando na nossa bio, clica e entra no grupo secreto.'}],null),
  T('setup_i7','setup','2026-10-26',null,'c2','instagram','Postar arte estática da Black no feed',null,null,null),
]

// ─── LISTA DE PACIENTES – 27/10 ───────────────────────────────────────────────
const PATIENTS = [
  T('pat_01','patients','2026-10-27',null,'c1','private','Enviar mensagem para toda a lista de pacientes',null,[{label:'Mensagem para pacientes',text:'[Nome], eu sei que você esperou o ano todo por esse momento 🫣\n\nTodos os procedimentos com condições nunca vistas antes em {{CIDADE}} na Black Week {{CLINICA}}\n\nSe quer garantir sua vaga, manda "Eu quero" que te mando o convite do nosso grupo secreto 🤭'}],null),
  T('pat_02','patients','2026-10-28',null,'c1','private','Follow-up: quem recebeu link e não entrou','Enviar no dia seguinte para quem recebeu o link mas não entrou.',[{label:'Follow-up',text:'[Nome], o link do grupo secreto da Black deu certinho? Se deu algum erro é porque já encheu'}],null),
]

export const ATTENDANCE_SCRIPT = [
  { step: 1, label: 'Se não sabe o nome', text: 'Bom dia! Sou a [seu nome] e serei responsável pelo seu atendimento aqui na {{CLINICA}}. Qual seu nome por gentileza?\n\n[aguarde resposta]' },
  { step: 2, label: 'Se já sabe o nome', text: 'Bom dia, [Nome]! Sou a [seu nome] e serei responsável pelo seu atendimento aqui na {{CLINICA}}. Tudo bem?' },
  { step: 3, label: 'Passo 3', text: 'Seja bem-vinda, [Nome]! Já te mando o link do grupo, o que eu tinha aqui encheu já rs' },
  { step: 4, label: 'Passo 4', text: 'Me conta: quais procedimentos está aguardando na nossa Black Week?\n\n[anote o procedimento]' },
  { step: 5, label: 'Passo 5 + enviar link', text: 'Ótimo, tenho certeza que vai conseguir garantir seu [procedimento], boa sorteee 🥳\n\n[envie o link do grupo]' },
]

// ─── SEMANA ANTES – 02/11 ─────────────────────────────────────────────────────
const WEEK_BEFORE = [
  T('wb_01','week_before','2026-11-02',null,'c1','group','Mudar nome do grupo',null,[{label:'Nome do grupo',text:'🔥 09/11 BLACK WEEK {{CLINICA}}'}],null),
  T('wb_02','week_before','2026-11-02',null,'c2','instagram','Gravar e postar Storie 2',null,[{label:'Roteiro Storie 2',text:'A Black Week {{CLINICA}} está chegando, se ainda não conseguiu sua vaga no grupo secreto, é só clicar no seu convite que está aparecendo aqui na sua tela.'}],null),
  T('wb_03','week_before','2026-11-02',null,'owner','internal','Coordenar blogueiras (se aplicável)','Cada blogueira com seu próprio link de WhatsApp.',[{label:'Texto para story da blogueira',text:'Se você está em pé, senta pra ouvir o que vou te falar. Black Friday todo mundo ama, agora uma semana inteira com condições nunca vistas aqui, em todos os procedimentos estéticos? E eu nem tô falando de procedimento meia boca, tô falando de botox, preenchedores, bioestimuladores e tudo mais que você imaginar. Pra todo mundo conseguir participar, o pessoal organizou um grupo secreto. Se quer participar, você precisa clicar aqui nesse botão e falar que veio através do meu story que eles vão te mandar o convite do grupo.'}],null),
]

// ─── CONTAGEM REGRESSIVA – 04 a 08/11 ────────────────────────────────────────
const COUNTDOWN = [
  T('cd_04a','countdown','2026-11-04','08:00','c1','group','Mudar nome do grupo',null,[{label:'Nome',text:'🔥 FALTAM 5 DIAS BLACK WEEK {{CLINICA}}'}],null),
  T('cd_04b','countdown','2026-11-04',null,'c1','private','Chamar quem recebeu link e não entrou',null,[{label:'Mensagem de texto',text:'[Nome], estranho'},{label:'Áudio (grave e envie)',text:'Aqui é a [seu nome] da {{CLINICA}}, você não conseguiu sua vaga na nossa Black? Não te vi no grupo'}],null),
  T('cd_05a','countdown','2026-11-05','08:00','c1','group','Mudar nome do grupo',null,[{label:'Nome',text:'🔥 FALTAM 4 DIAS BLACK WEEK {{CLINICA}}'}],null),
  T('cd_05b','countdown','2026-11-05',null,'c1','private','Chamar quem recebeu link e não entrou (dia 2)',null,[{label:'Mensagem',text:'Boa tarde, [Nome]! Tudo bem? [Nome], conseguiu entrar no grupo??'},{label:'Se não responder',text:'[mande uma figurinha]\n[depois mande um áudio pessoal]'}],null),
  T('cd_06a','countdown','2026-11-06','08:00','c1','group','Mudar nome do grupo',null,[{label:'Nome',text:'🔥 FALTAM 3 DIAS BLACK WEEK {{CLINICA}}'}],null),
  T('cd_07a','countdown','2026-11-07','08:00','c1','group','Mudar nome do grupo',null,[{label:'Nome',text:'🔥 FALTAM 2 DIAS BLACK WEEK {{CLINICA}}'}],null),
  T('cd_08a','countdown','2026-11-08','08:00','c1','group','Mudar nome do grupo',null,[{label:'Nome',text:'🔥 FALTA 1 DIA BLACK WEEK {{CLINICA}}'}],null),
  T('cd_08b','countdown','2026-11-08',null,'c1','private','Chamar quem recebeu link e não entrou (último dia)',null,[{label:'Mensagem',text:'Boa tarde, [Nome]! Tudo bem? [Nome], conseguiu entrar no grupo??'},{label:'Se não responder: figurinha + áudio',text:'Aqui é a [seu nome] da {{CLINICA}}, amanhã começa a Black Week e não te vi no grupo ainda!'}],null),
]

// ─── TREINO – 06/11 ──────────────────────────────────────────────────────────
const TRAINING = [
  T('tr_01','training','2026-11-06',null,'c2','internal','Salvar respostas rápidas no WhatsApp','Scripts de atendimento, Mensagem 1 de venda e respostas de objeção.',[
    {label:'Script de atendimento completo (5 passos)',text:ATTENDANCE_SCRIPT.map(s=>`${s.step}. ${s.label}:\n${s.text}`).join('\n\n')},
    {label:'Mensagem 1 – Abordagem de venda',text:'Parabéns, [Nome]! Chegou sua vez na Black Week {{CLINICA}} 🥳\nVocê vai conseguir fazer seu [procedimento] por apenas {{VALOR}}!\nFica melhor pra você no cartão ou no pix?'},
    {label:'Resposta a objeção (não pode ir no dia / vai viajar)',text:'Sem problemas, [Nome]! Pra garantir sua vaga basta comprovante de pagamento e o agendamento!\nConseguimos resolver tudo por aqui, pra garantir sua vaga você prefere cartão ou pix?'},
    {label:'Se ela sumir – texto + áudio',text:'[Nome], conseguiu garantir sua vaga? Não te vi no grupo'},
  ],null),
  T('tr_02','training','2026-11-06',null,'both','internal','Treinar com a equipe','Uma pessoa faz a paciente, a outra atende. Use os scripts salvos.',null,null),
  T('tr_03','training','2026-11-06',null,'c1','internal','Imprimir tabela de preços e deixar na mesa',null,null,null),
  T('tr_04','training','2026-11-06',null,'c1','internal','Testar maquininha e chave pix',null,null,null),
  T('tr_05','training','2026-11-06',null,'owner','spark','Combinar com Spark a oferta e mensagens da sexta 13/11',null,null,null),
]

// ─── VÉSPERA – 07/11 ─────────────────────────────────────────────────────────
const PRECHECK = [
  T('pc_01','precheck','2026-11-07',null,'c1','internal','Mensagens dos 6 dias escritas e sem erro de preço',null,null,
    ['Mensagem dia 1 (Botox) conferida','Mensagem dia 2 (Preenchimento) conferida','Mensagem dia 3 (Bioestimuladores) conferida','Mensagem dia 4 (Pele) conferida','Mensagem dia 5 (Corporais) conferida','Mensagem dia 6 (Sábado) conferida']),
  T('pc_02','precheck','2026-11-07',null,'c1','internal','Fotos de antes e depois separadas por dia','Uma pasta por procedimento.',null,null),
  T('pc_03','precheck','2026-11-07',null,'c1','internal','Enquetes escritas',null,null,null),
  T('pc_04','precheck','2026-11-07',null,'owner','internal','Estoque e agenda confirmados',null,null,null),
  T('pc_05','precheck','2026-11-07',null,'owner','internal','Definir quem atende cada dia e substituto em caso de falta',null,null,null),
  T('pc_06','precheck','2026-11-07',null,'c1','internal','Celular carregado e chip de internet reserva',null,null,null),
  T('pc_07','precheck','2026-11-07',null,'c1','internal','Planilha de vendas pronta','Nome, procedimento, pagou, forma, data agendada.',null,null),
]

// ─── DIAS DE CAMPANHA (gerador) ───────────────────────────────────────────────
const DAY_CONFIGS = [
  { dayIndex:1, date:'2026-11-09', label:'Botox 3 Regiões' },
  { dayIndex:2, date:'2026-11-10', label:'Preenchimento Facial' },
  { dayIndex:3, date:'2026-11-11', label:'Bioestimuladores de Colágeno' },
  { dayIndex:4, date:'2026-11-12', label:'Pele' },
  { dayIndex:5, date:'2026-11-13', label:'Corporais' },
]

// Mensagens por dia — "text" = vai para o grupo; "note" = instrução interna
const DAY_WARMUPS = {
  1: {
    msg0800: 'Bom dia, pessoal 🥳🥳\nAnsiosos??? 🫣\nEm menos de duas horas começamos com nossa primeira oferta da BLACK {{CLINICA}} 🥳',
    msg0900: 'Falta uma hora 🥳\nFiquem atentos, pois vai ser por ordem de chegada 🫢\nPra garantir sua vaga basta chamar esse número aqui ou votar na enquete, será respeitada a ordem de chegada 🫢',
    msg1000_reveal: 'O MISTÉRIO ACABOU 🤯🤯🤯\n{{PROCEDIMENTO}} POR APENAS {{VALOR}} 🤯🤯🤯',
    msg_post_poll: 'Pessoal, lembrando que não necessariamente quem votou garantiu sua vaga\né por ordem de chegada e a vaga só é garantida após confirmação\nBoa sorte a todosss 🥳🥳🥳',
    msg_list: '[Nome], a Black Week {{CLINICA}} começou com tudo! Viu lá a condição de hoje? 🤯',
    msg_mid: 'Pessoal, 80% das vagas já preenchidas 🤯',
    msg_16h: '90% das vagas preenchidas em algumas horas, que isso pessoal 🥳🥳🥳',
    msg_close: 'Pessoal, agora que conseguimos parar aqui 😅\nLembrando que somente quem confirmamos no privado conseguiu a vaga\namanhã teremos mais uma CONDIÇÃO IMPERDÍVEL 🫢\nse eu fosse você, ficava atento às 10:00 pra não ficar de fora 🥳',
    story: 'Nossa Black Week está oficialmente aberta! E hoje já começamos com o pé direito: botox com valores nunca vistos antes. Não quer continuar de fora? Seu convite está aparecendo na sua tela.',
  },
  2: {
    msg0945: 'Faltam somente 15 minutosss 👀',
    msg1000_reveal: 'SEM MAIS DELONGAS.... 🥳🥳🥳\n{{PROCEDIMENTO}} POR APENAS {{VALOR}} 🤯🤯🤯',
    msg_post_poll: 'Boa sorte a todoss 🥳🥳🥳',
    msg_mid: 'Pessoal, 70% das vagas já preenchidas 🤯',
    msg_close: 'Vagas encerradas! Nos vemos amanhã às 10:00 rsrs',
  },
  3: {
    msg_morning_absent: '[Nome], estranho\n[depois um áudio: "Aqui é a [seu nome] da {{CLINICA}}, você não conseguiu sua vaga na nossa Black? Não te vi no grupo"]',
    msg0900: 'Falta uma hora 🥳\nFiquem atentos, pois vai ser por ordem de chegada 🫢\nPra garantir sua vaga basta chamar esse número aqui ou votar na enquete, será respeitada a ordem de chegada 🫢',
    msg1000_reveal: 'Acabou a espera 🫣🫣🫣\nHoje é dia dos nossos queridinhos {{PROCEDIMENTO}} 🤯\nBoa sorte a todas! 🥳',
    msg1000_reveal_note: 'Envie fotos de antes/depois ANTES desta mensagem',
    msg_post_poll: 'Boa sorte a todas! 🥳🥳🥳',
    msg_close: 'Vagas encerradasssss 🫢🫢',
  },
  4: {
    msg0900: 'O que será que vem por aí hojeee 👀',
    msg1000_reveal: 'A gente te avisou 🫢🫢🫢\nCHEGA DE MISTÉRIO — olha o que preparamos pra vocês hoje 🤯',
    msg1000_reveal_note: 'Envie fotos de antes/depois ANTES desta mensagem',
    msg1000_multi: '🚨 SOMENTE HOJE PODERÃO ESCOLHER MAIS DE UM PROCEDIMENTO\nUsem com moderação rs 🫢',
    msg1000_multi_note: 'Ative "permitir várias respostas" na enquete antes de criar',
    msg_post_poll: 'Boa sorte a todas! Quem confirmar o primeiro já pode chamar no privado para garantir mais um 🫢🫢',
    msg_close_note: 'Encerre as vagas e mude o nome do grupo para: 🔥 AMANHÃ 10:00 BLACK WEEK {{CLINICA}}',
  },
  5: {
    msg0900: 'Quase lá pessoal 👀\nFaltam somente 60 minutos para mais uma condição imperdível! 🥳',
    msg0945: 'Faltam somente 15 minutos 👀',
    msg1000_reveal: '🔥 DIA DE {{PROCEDIMENTO}} | BLACK WEEK {{CLINICA}} 🔥\nPOR APENAS {{VALOR}} 🤯🤯🤯',
    msg1000_reveal_note: 'Envie fotos de antes/depois e abra a enquete após esta mensagem',
    msg_post_poll: 'Boa sorte a todas! Última grande condição da nossa Black Week 🔥🥳',
    msg_close: 'Vagas encerradas! Que semana incrível, pessoal 🥳',
  },
}

function generateCampaignDay({ dayIndex, date }) {
  const p = `day${dayIndex}`
  const w = DAY_WARMUPS[dayIndex]
  const tasks = []
  const isMultiDay = dayIndex === 4

  // 08:00 — Renomear grupo
  tasks.push(T(`${p}_0800a`, p, date,'08:00','c1','group','Mudar nome do grupo',null,[
    {label:'Nome do grupo',text:`🔥 FALTAM 2 HORAS | BLACK WEEK | {{CLINICA}}`},
  ],null,dayIndex))

  if (w.msg0800) tasks.push(T(`${p}_0800b`,p,date,'08:00','c1','group','Mensagem de aquecimento no grupo (08:00)',null,[{label:'Copiar e enviar no grupo',text:w.msg0800}],null,dayIndex))
  if (w.msg_morning_absent) tasks.push(T(`${p}_0800c`,p,date,'08:00','c1','private','Chamar quem pediu link e não está no grupo',null,[{label:'Texto + áudio',text:w.msg_morning_absent}],null,dayIndex))
  if (w.msg0900) tasks.push(T(`${p}_0900`,p,date,'09:00','c1','group','Mensagem "Falta uma hora" no grupo',null,[{label:'Copiar e enviar',text:w.msg0900}],null,dayIndex))

  if (w.msg0945) {
    tasks.push(T(`${p}_0945a`,p,date,'09:45','c1','group','Mudar nome do grupo',null,[
      {label:'Nome do grupo',text:`🔥 FALTAM 15 MINUTOS | BLACK WEEK | {{CLINICA}}`},
    ],null,dayIndex))
    tasks.push(T(`${p}_0945b`,p,date,'09:45','c1','group','Mensagem "Faltam 15 min"',null,[{label:'Copiar e enviar',text:w.msg0945}],null,dayIndex))
  }

  // 10:00 — Renomear grupo para formato do dia
  tasks.push(T(`${p}_1000a`,p,date,'10:00','c1','group','Mudar nome do grupo',null,[
    {label:'Nome do grupo',text:`🔥 Dia de {{PROCEDIMENTO}} | Black Week | {{CLINICA}}`},
  ],null,dayIndex))

  // 10:00 — Revelar oferta + enquete (C2)
  const revelationScripts = [
    {
      label: 'Mensagem de revelação',
      text: '{{CONDITION}}',
      ...(w.msg1000_reveal_note ? { note: w.msg1000_reveal_note } : {}),
      atAll: true,
    },
    ...(w.msg1000_multi ? [{
      label: 'Mensagem especial do dia',
      text: w.msg1000_multi,
      ...(w.msg1000_multi_note ? { note: w.msg1000_multi_note } : {}),
    }] : []),
    {
      label: 'Enquete (criar no WhatsApp)',
      text: '',
      poll: isMultiDay
        ? { question: 'Qual vai garantir hoje?', options: null, allowMultiple: true, type: 'multi' }
        : { question: '{{PROCEDIMENTO}} por apenas {{VALOR}} 🤯', options: ['QUERO 🤯🤯🤯', 'QUERO MUITO'], allowMultiple: false },
    },
  ]
  tasks.push(T(`${p}_1000b`,p,date,'10:00','c2','group','Revelar oferta + fotos + enquete',null,revelationScripts,null,dayIndex))

  // 10:00 — Mensagem pós-enquete (C1) — vem APÓS a enquete
  if (w.msg_post_poll) {
    tasks.push(T(`${p}_1000b2`,p,date,'10:00','c1','group','Mensagem pós-enquete no grupo',
      'Envie esta mensagem APÓS a enquete estar visível no grupo.',
      [{ label: 'Copiar e enviar no grupo', text: w.msg_post_poll, atAll: true }],
      null, dayIndex
    ))
  }

  if (w.msg_list) tasks.push(T(`${p}_1000c`,p,date,'10:00','c1','private','Mensagem para lista de pacientes',null,[{label:'Mensagem',text:w.msg_list}],null,dayIndex))
  if (w.story) tasks.push(T(`${p}_story`,p,date,'10:00','c2','instagram',`Postar Story ${dayIndex + 2}`,null,[{label:`Roteiro Story ${dayIndex + 2}`,text:w.story}],null,dayIndex))

  // C1 confere enquete + chama no privado → C2 assume e vende → C1 fatura e agenda
  tasks.push(T(`${p}_1000d`,p,date,'10:00','c1','group','Acompanhar enquete e registrar votantes por ordem','Anote a ordem das votantes. Passe para C2 para chamar no privado.',null,null,dayIndex))
  tasks.push(T(`${p}_1000e`,p,date,'10:00','c2','private','Chamar votantes no privado e fechar venda (C2)',null,[
    {label:'Mensagem 1 – Abordagem',text:'Parabéns, [Nome]! Chegou sua vez na Black Week {{CLINICA}} 🥳\nVocê vai conseguir fazer seu [procedimento] por apenas {{VALOR}}!\nFica melhor pra você no cartão ou no pix?'},
    {label:'Resposta a objeção',text:'Sem problemas, [Nome]! Pra garantir sua vaga basta comprovante de pagamento e o agendamento!\nConseguimos resolver tudo por aqui, pra garantir sua vaga você prefere cartão ou pix?'},
    {label:'Se ela sumir',text:'[Nome], conseguiu garantir sua vaga? Não te vi no grupo'},
  ],null,dayIndex))

  tasks.push(T(`${p}_1000f`,p,date,'10:00','c1','internal','Registrar pagamento, dar baixa e agendar no sistema (C1)','Após confirmação da venda por C2: nome, procedimento, pagou, forma de pagamento, data agendada.',null,null,dayIndex))

  if (w.msg_mid) tasks.push(T(`${p}_1300`,p,date,'13:00','c1','group','Atualizar vagas preenchidas no grupo',null,[{label:'Mensagem',text:w.msg_mid}],null,dayIndex))
  if (w.msg_16h) tasks.push(T(`${p}_1600`,p,date,'16:00','c1','group','Segunda atualização de vagas',null,[{label:'Mensagem',text:w.msg_16h}],null,dayIndex))

  // 18:30 — Encerrar vagas
  const closeScripts = []
  if (w.msg_close) closeScripts.push({label:'Mensagem de encerramento',text:w.msg_close})
  if (w.msg_close_note) closeScripts.push({label:'Instrução',text:'',note:w.msg_close_note})
  if (closeScripts.length > 0) {
    tasks.push(T(`${p}_1830a`,p,date,'18:30','c1','group','Encerrar vagas no grupo',null,closeScripts,null,dayIndex))
  }

  if (dayIndex < 5) {
    tasks.push(T(`${p}_1830b`,p,date,'18:30','c1','group','Mudar nome do grupo',null,[
      {label:'Nome do grupo',text:`🔥 AMANHÃ 10:00 | BLACK WEEK | {{CLINICA}}`},
    ],null,dayIndex))
  }

  tasks.push(T(`${p}_1900`,p,date,'19:00','c1','spark','Enviar dados do dia para a Spark','Votos, chamados e vendas do dia.',null,null,dayIndex))

  return tasks
}

// ─── ENCERRAMENTO – 14/11 ────────────────────────────────────────────────────
const CLOSING = [
  T('cl_01','closing','2026-11-14','10:00','c1','group','Postar mensagem de abertura do sábado',null,[{label:'Mensagem',text:'Vocês acharam que acabou??? 🫣\nJamaissss, estamos apenas começando rs\nE pra fecharmos essa primeira onda de condições nunca antes vistas com CHAVE DE OURO 🔑\nVamos deixar vocês votarem na condição que querem ver rsrsrs 🫢🫢🫢\nAbriremos em uma hora a votação, não percammm'}],null),
  T('cl_02','closing','2026-11-14','11:00','c1','group','Abrir enquete de votação','Ative "Permitir várias respostas" na enquete.',[{label:'Mensagem junto com a enquete',text:'Está aberta a votaçãoooo 🥳 lembrando que 👇\nVocês podem votar em mais de um e as condições serão divulgadas segunda às 10:00'}],null),
  T('cl_03','closing','2026-11-14','11:00','c2','private','Chamar no privado todos que votaram',null,[{label:'Mensagem 1',text:'Parabéns, [Nome]! Chegou sua vez na Black Week {{CLINICA}} 🥳\nVocê vai conseguir fazer seu [procedimento] por apenas {{VALOR}}!\nFica melhor pra você no cartão ou no pix?'}],null),
]

// ─── PÓS-BLACK – 16/11 ───────────────────────────────────────────────────────
const POST = [
  T('post_01','post','2026-11-16',null,'c2','private','Mensagem para lista de quem chamou e não comprou',null,[
    {label:'Texto inicial',text:'[Nome], bom dia!'},
    {label:'Áudio (grave e envie)',text:'Vou até te mandar um áudio porque ainda tá uma correria por aqui. Aqui é a [seu nome], da {{CLINICA}}. Você já conseguiu garantir todos os seus procedimentos na Black?'},
  ],null),
  T('post_02','post','2026-11-16',null,'c1','spark','Enviar planilha completa de vendas para a Spark',null,null,null),
  T('post_03','post','2026-11-16',null,'c2','instagram','Voltar foto, bio e nota do Instagram ao normal',null,null,null),
  T('post_04','post','2026-11-16',null,'owner','internal','Avaliar segunda onda com a Spark (Grupo Última Oportunidade)',null,[{label:'Descrição do grupo Última Oportunidade',text:'Nós ouvimos vocês!\n\nPra você que dormiu no ponto e não conseguiu sua vaga na BLACK WEEK, vamos te dar a última oportunidade com replay de algumas vagas, fique atento às seguintes regras:\n\nSua vaga só é preenchida após pagamento e agendamento\nNão nos responsabilizaremos caso você perca as condições após as vagas determinadas\nPara que todos consigam participar, cada participante só pode ter acesso a mais de um procedimento após confirmação do primeiro\nAs condições valem apenas pro dia comunicado\nNão vale caso tenha garantido mais de 4 procedimentos na Black Week\n\nBoa sorte a todossss 🤩'}],null),
]

// ─── EXPORT FINAL ─────────────────────────────────────────────────────────────
const CAMPAIGN_TASKS = DAY_CONFIGS.flatMap(cfg => generateCampaignDay(cfg))

export const ALL_TASKS = [
  ...PRE, ...SETUP, ...PATIENTS, ...WEEK_BEFORE, ...COUNTDOWN,
  ...TRAINING, ...PRECHECK, ...CAMPAIGN_TASKS, ...CLOSING, ...POST,
]

export function getTasksByDate(date) {
  return ALL_TASKS.filter(t => t.date === date)
    .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'))
}

export function getTasksByPhase(phase) {
  return ALL_TASKS.filter(t => t.phase === phase)
}

export function getDayProcedures(day) {
  if (!day) return []
  if (day.procedures?.length) return day.procedures
  if (day.procedure) return [{ name: day.procedure, price: day.price || '', vagas: day.vagas || '', installments: '', installmentPrice: '' }]
  return []
}

export function applyVars(text, config, dayIndex = null) {
  if (!text) return text
  const day = dayIndex ? (config.days || [])[dayIndex - 1] : null
  const proc = getDayProcedures(day)[0] || null
  const vars = {
    CLINICA:      config.clinicName || '',
    CIDADE:       config.city        || '',
    VALOR:        proc?.price        ? `R$${proc.price}` : '[VALOR]',
    PROCEDIMENTO: proc?.name         || (dayIndex ? `Dia ${dayIndex}` : '[PROCEDIMENTO]'),
    EMOJI:        getProcedureEmoji(proc?.name || ''),
    CONDITION:    day?.condition     || '[Preencha a condição do dia nas configurações]',
  }
  let result = text
  Object.entries(vars).forEach(([k, v]) => {
    result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  })
  return result
}

export const DEFAULT_CONFIG = {
  clinicName: '',
  city: '',
  c1Name: '',
  c2Name: '',
  ownerName: '',
  hasCRM: false,
  days: [
    { procedures: [{ name: 'Botox 3 Regiões',                price: '', vagas: '', installments: '', installmentPrice: '' }], showInstallments: false, condition: '' },
    { procedures: [{ name: 'Preenchimento Facial',            price: '', vagas: '', installments: '', installmentPrice: '' }], showInstallments: false, condition: '' },
    { procedures: [{ name: 'Bioestimuladores de Colágeno',    price: '', vagas: '', installments: '', installmentPrice: '' }], showInstallments: false, condition: '' },
    { procedures: [{ name: 'Pele (Micro/PDRN/Skinbooster)',   price: '', vagas: '', installments: '', installmentPrice: '' }], showInstallments: false, condition: '' },
    { procedures: [{ name: 'Corporais',                       price: '', vagas: '', installments: '', installmentPrice: '' }], showInstallments: false, condition: '' },
  ],
}
