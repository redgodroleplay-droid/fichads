# Bedivere — Grimório

Ficha de RPG do Bedivere em HTML, CSS e JavaScript puro, com visual de magia e runas: janelas azuis com molduras entalhadas, um círculo mágico girando ao fundo e runas do futhark subindo pela tela.

- **Entrada:** uma pena de fênix desce sobre uma floresta de cristais negros, com o castelo ao longe. Os cristais trincam e as runas despertam.
- **Corrente com adaga:** pendurada no topo, sempre visível. Balança com a rolagem, com o mouse e quando é tocada, e um brilho corre pela lâmina de tempos em tempos.
- **Ornamentos em SVG com traço à mão:** moldura rúnica torta em volta da tela (runas acendem uma de cada vez), divisores rúnicos sob os títulos, moldura no retrato e um selo girando atrás do juramento.
- **Telas:** Status, Habilidades, Inventário, Missões, Registro e Diário.
- **A Promessa:** sempre visível no topo. Cresce por feitos: cada selo é aceso pelo jogador ou pelo mestre.
- **Em branco:** só o nome vem preenchido. O jogador envia o retrato (toque no espaço do retrato) e escreve todo o resto.
- **Regras:** as mesmas da mesa (atributos, proficiência por nível, tabela de XP, perícias, descansos, condições e Durabilidade de Armas e Armaduras), em `js/rules.js`.

## Arquivos

- `js/rules.js` — regras do RPG, sem interface.
- `js/state.js` — ficha em branco, salvamento local e backup JSON.
- `js/intro.js` — cena da entrada.
- `js/app.js` — interface.
- `js/charm.js` — corrente com adaga.
- `js/ornaments.js` — moldura, divisores, moldura do retrato e selo (SVG).
- `css/system.css` — visual.

## Dados

Cada navegador salva a própria ficha em localStorage. Use Configurações → Exportar/Importar JSON para levar a ficha a outro aparelho.

## Executar localmente

Sirva a pasta com qualquer servidor HTTP estático, por exemplo `python -m http.server`. Abrir o `index.html` direto deve funcionar, mas não foi testado.
