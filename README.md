# Bedivere — Grimório

Ficha de RPG do Bedivere em HTML, CSS e JavaScript puro, com visual de magia e runas: janelas azuis com molduras entalhadas, um círculo mágico girando ao fundo e runas do futhark subindo pela tela.

- **Entrada:** uma pena de fênix desce sobre uma floresta de cristais negros, com o castelo ao longe. Os cristais trincam e as runas despertam.
- **Corrente com adaga:** pendurada no topo, sempre visível. Balança com a rolagem, com o mouse e quando é tocada, e um brilho corre pela lâmina de tempos em tempos.
- **Ornamentos em SVG com traço à mão:** moldura rúnica torta em volta da tela (runas acendem uma de cada vez), divisores rúnicos sob os títulos, moldura no retrato e um selo girando atrás do juramento.
- **Telas:** Status, Habilidades (com perícias, habilidades, técnicas, árvore e títulos), Grimórios, Familiares, Inventário, Missões, Registro e Diário.
- **Grimórios:** quantos livros de magia o jogador quiser, com nome, escola, descrição, anotações e campos próprios. Cada grimório define os campos das suas magias (nível, custo, conjuração, alcance, duração, componentes, ou o que o jogador criar) e cada magia pode ter campos só dela. Grimórios, campos e magias podem ser reordenados e excluídos; com mais de três magias aparece uma busca.
- **Familiares:** cada um com retrato, PV, CA, atributos próprios e habilidades com usos por descanso. As rolagens usam os atributos do familiar.
- **Árvore de habilidades:** ramos em colunas, níveis em linhas, custo em pontos e pré-requisitos ligados por linhas.
- **Link criptografado:** a ficha inteira vai cifrada (AES-GCM) no `#` do endereço, para enviar por WhatsApp, Discord ou e-mail. Senha opcional.
- **A Promessa:** sempre visível no topo. Cresce por feitos: cada selo é aceso pelo jogador ou pelo mestre.
- **Em branco:** só o nome vem preenchido. O jogador envia o retrato (toque no espaço do retrato) e escreve todo o resto.
- **Regras:** as mesmas da mesa (atributos, proficiência por nível, tabela de XP, perícias, descansos, condições e Durabilidade de Armas e Armaduras), em `js/rules.js`.

## Arquivos

- `js/rules.js` — regras do RPG, sem interface.
- `js/state.js` — ficha em branco, salvamento local e backup JSON.
- `js/intro.js` — cena da entrada.
- `js/app.js` — interface.
- `js/grimorios.js` — grimórios e magias (validação dos dados e tela; carregado antes de `state.js`).
- `css/grimorios.css` — visual dos grimórios.
- `js/charm.js` — corrente com adaga.
- `js/share.js` — link criptografado (gerar, enviar e abrir).
- `js/ornaments.js` — moldura, divisores, moldura do retrato e selo (SVG).
- `css/system.css` — visual.

## Dados

Cada navegador salva a própria ficha em localStorage. Use Configurações → Exportar/Importar JSON para levar a ficha a outro aparelho.

## Executar localmente

Sirva a pasta com qualquer servidor HTTP estático, por exemplo `python -m http.server`. Abrir o `index.html` direto deve funcionar, mas não foi testado.
