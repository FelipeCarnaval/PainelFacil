# PainelFácil — Dashboards automáticos a partir de qualquer planilha

Suba um **Excel** ou **CSV** (relatórios do **Benner Saúde**, **Benner Corporativo**, **MV**, ou qualquer outro) e o PainelFácil **detecta as colunas e monta o painel sozinho**: cards de KPI, gráficos, matriz e tabela — sem você configurar nada.

> 100% local e gratuito. Tudo roda **no seu navegador**: nenhum arquivo é enviado para a internet, sem login, sem chave de API, sem IA paga.

## O que ele faz

1. **Lê o arquivo** (`.xlsx`, `.xls`, `.csv`) direto no navegador.
2. **Acha a tabela de verdade** dentro do relatório — pula título, filtros e cabeçalhos soltos no topo, e **descarta linhas de TOTAL/SUBTOTAL**.
3. **Perfila cada coluna** e descobre o tipo: número, data, categoria ou texto (entende `1.234,56` e `dd/mm/aaaa`).
4. **Monta os widgets automaticamente:**

| O que tem no arquivo | Widget gerado |
|---|---|
| Coluna numérica | **Cards** (total, média, contagem) |
| Data + número | **Gráfico de linha** (evolução por mês) |
| Categoria + número | **Barras** (ranking) |
| Categoria + número | **Rosca** (distribuição %) |
| 2 categorias + número | **Matriz/pivot** com heatmap |
| Tudo | **Tabela** com busca, ordenação, paginação e export Excel |

5. **Filtros** (por categoria e período) que recalculam o painel inteiro na hora.

## Stack
- **React + Vite** (mesma base do projeto Conciliador)
- **Recharts** — gráficos
- **SheetJS (xlsx)** — leitura de Excel/CSV no navegador
- Engine própria de **detecção de tabela + perfilamento + agregação** (`src/lib/`)

## Como rodar

Pré-requisito: Node 18+.

```bash
npm install
npm run dev
```

Abra **http://localhost:5176** e clique em **"Usar exemplo"** para ver funcionando na hora (gera um relatório fictício no estilo Benner, com lixo no topo e linha de total — pra demonstrar a limpeza automática).

Para gerar a versão de produção:
```bash
npm run build
npm run preview
```

## Organização do código

```
src/
  lib/
    parseFile.js     # lê Excel/CSV (SheetJS) e exporta Excel
    detectTable.js   # acha o cabeçalho real, descarta lixo e totais
    profile.js       # infere tipo de cada coluna + estatísticas
    aggregate.js     # group-by, série temporal e pivot
    suggestCharts.js # regras que escolhem os widgets
    brFormat.js      # números/datas no padrão brasileiro
    sampleData.js    # relatório fictício de exemplo
  components/         # Dropzone, Filtros, KPIs, gráficos, matriz, tabela
  App.jsx            # orquestra o fluxo
```

## Recursos
- **Cabeçalho de múltiplas linhas:** quando o relatório tem um nível de **grupo** sobre as colunas
  (ex.: `2024`/`2025` mesclados sobre `Apresentado`/`Glosa`), os níveis são combinados em
  `2024 · Apresentado` automaticamente.
- **Tabela cruzada (cross-tab):** relatórios com **meses nas colunas** (ex.: Soul MV) são detectados e
  reorganizados automaticamente em série temporal — dá para desfazer em “Ajustar dados”.
- **Ajuste manual:** linha de cabeçalho, tipo de cada coluna, medida principal e quais colunas analisar.
- **Exportar:** Excel (dados filtrados) e **PDF/impressão** do painel (botão “PDF”).
- **Processamento fora da UI thread** (Web Worker + engine colunar): centenas de milhares de linhas sem travar.
- **Lembra os ajustes** de cada arquivo entre sessões — guarda **só a configuração**, nunca as linhas (LGPD).

## Limitações conhecidas
- A detecção de cabeçalho/tipos é heurística; relatórios muito atípicos podem precisar de ajuste manual.
- O painel não persiste os **dados** entre recarregamentos (por design/LGPD) — só a configuração; é preciso subir o arquivo de novo.

## Próximos passos (ideias)
- Drill-down e tela cheia nos gráficos; KPIs com tendência.
- Acessibilidade WCAG AA.
- Backend opcional para compartilhar painéis salvos.
