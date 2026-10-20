# PADRÃO VISUAL U&M — instruções obrigatórias

Siga SEMPRE este padrão em qualquer tela, relatório, gráfico, tabela ou apresentação gerada.
Não use cores, fontes ou tamanhos fora do que está definido aqui.

## 1. Formato e fundo
- Formato de slide/tela: 16:9 (13,33" × 7,5").
- Fundo padrão: `#F5F4F4` (é o fundo usado no modelo).
- Caixas de destaque: texto verde `#19502F` ou branco `#FFFFFF` (ver tipografia).
- Logotipo "U&M" (arquivo `logo-UeM.png`): no modelo ele aparece no canto superior direito. Não distorcer nem recolorir.

## 2. Paleta principal (uso geral: fontes e formas)

Como aplicar: em fontes, cor da fonte > mais cores > personalizar > HEX. Em formas, preenchimento > mais cores de preenchimento > personalizar > HEX.

| Cor | HEX | Observação |
|---|---|---|
| Verde Principal | `#19502F` | Cor de título/destaque indicada na tipografia |
| Verde Secundário | `#466C53` | Cor da caixa de aviso do modelo |
| Verde Claro | `#B2BFB4` | Tom claro do verde principal |
| Cinza Escuro | `#2C2D2D` | Paleta principal |
| Cinza Texto | `#575756` | Cor de texto indicada na tipografia (não está nos quadrados da paleta) |
| Cinza Claro | `#DADADA` | Paleta principal |
| Fundo Claro | `#F5F4F4` | Fundo do modelo |
| Branco | `#FFFFFF` | Texto sobre verde |
| Amarelo Ouro | `#E2A937` | Paleta principal |

## 3. Paleta para GRÁFICOS e TABELAS
Use a cor pelo SIGNIFICADO (qualidade/sentimento). Cada categoria tem tom base, claro e escuro.

| Categoria | Nome | Qualidade/Sentimento | Tom base | Tom claro | Tom escuro |
|---|---|---|---|---|---|
| POSITIVO | Verde Principal | Excelente | `#19502F` | `#B2BFB4` | `#0D2B19` |
| QUALIDADE | Verde Secundário | Bom | `#466C53` | `#82A68F` | `#324D3B` |
| ALERTA | Amarelo Ouro | Atenção | `#E2A937` | `#F1D394` | `#B5872C` |
| CRÍTICO | Laranja | Alerta Alto | `#FF7725` | `#FFB080` | `#C44A00` |
| NEGATIVO | Vermelho | Falha | `#DC3545` | `#F1959B` | `#A71D2A` |
| NEUTRO | Cinza | Neutro | `#DADADA` | `#F5F5F5` | `#A9A9A9` |

Regra do modelo: cada cor tem um significado fixo (verde = excelente/bom, amarelo = atenção, laranja = alerta alto, vermelho = falha, cinza = neutro). Não inverta esses significados.

Sugestão de aplicação (não consta no modelo original, ajuste se quiser): tom base para o preenchimento principal, tom claro para fundos e áreas, tom escuro para bordas; texto branco sobre os tons base e escuros, e texto cinza escuro sobre os tons claros.

## 4. Tipografia (família única: Montserrat)
Fonte oficial: Montserrat (Google Fonts: https://fonts.google.com/specimen/Montserrat).

| Elemento | Fonte | Tamanho | Caixa | Cor |
|---|---|---|---|---|
| TÍTULOS | Montserrat Light | 32 | ALTA | Cinza `#575756` ou Verde `#19502F` |
| SUBTÍTULOS | Montserrat Light | 18 | ALTA | Cinza `#575756` ou Verde `#19502F` |
| TEXTOS | Montserrat Regular | 12 | baixa | `#575756` |
| DESTAQUE NO TEXTO | Montserrat Medium | 12 | baixa | Cinza `#575756` ou Verde `#19502F` |
| CAIXAS DE DESTAQUE COM TEXTO CURTO | Montserrat Light | 16 | ALTA | Verde `#19502F` ou Branco `#FFFFFF` |
| CAIXAS DE DESTAQUE COM TEXTO LONGO | Montserrat Regular | 16 | baixa | Verde `#19502F` ou Branco `#FFFFFF` |

## 5. Tokens em CSS (para usar direto no código)

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500&display=swap');

:root {
  /* paleta principal */
  --um-verde-principal: #19502F;
  --um-verde-secundario: #466C53;
  --um-verde-claro: #B2BFB4;
  --um-cinza-escuro: #2C2D2D;
  --um-cinza-texto: #575756;
  --um-cinza-claro: #DADADA;
  --um-fundo: #F5F4F4;
  --um-branco: #FFFFFF;
  --um-amarelo-ouro: #E2A937;

  /* gráficos e tabelas: base / claro / escuro */
  --um-positivo: #19502F;  --um-positivo-claro: #B2BFB4;  --um-positivo-escuro: #0D2B19;
  --um-qualidade: #466C53; --um-qualidade-claro: #82A68F; --um-qualidade-escuro: #324D3B;
  --um-alerta: #E2A937;    --um-alerta-claro: #F1D394;    --um-alerta-escuro: #B5872C;
  --um-critico: #FF7725;   --um-critico-claro: #FFB080;   --um-critico-escuro: #C44A00;
  --um-negativo: #DC3545;  --um-negativo-claro: #F1959B;  --um-negativo-escuro: #A71D2A;
  --um-neutro: #DADADA;    --um-neutro-claro: #F5F5F5;    --um-neutro-escuro: #A9A9A9;
}

body { background: var(--um-fundo); font-family: 'Montserrat', sans-serif; font-weight: 400; font-size: 12px; color: var(--um-cinza-texto); }
h1 { font-weight: 300; font-size: 32px; text-transform: uppercase; color: var(--um-verde-principal); }
h2 { font-weight: 300; font-size: 18px; text-transform: uppercase; color: var(--um-cinza-texto); }
.destaque-texto { font-weight: 500; }
.caixa-destaque-curto { font-weight: 300; font-size: 16px; text-transform: uppercase; background: var(--um-verde-principal); color: var(--um-branco); }
.caixa-destaque-longo { font-weight: 400; font-size: 16px; background: var(--um-verde-principal); color: var(--um-branco); }
```

## 6. Tokens em JSON

```json
{
  "formato": "16:9",
  "fundo": "#F5F4F4",
  "fonte": "Montserrat",
  "paletaPrincipal": {
    "verdePrincipal": "#19502F",
    "verdeSecundario": "#466C53",
    "verdeClaro": "#B2BFB4",
    "cinzaEscuro": "#2C2D2D",
    "cinzaTexto": "#575756",
    "cinzaClaro": "#DADADA",
    "fundoClaro": "#F5F4F4",
    "branco": "#FFFFFF",
    "amareloOuro": "#E2A937"
  },
  "paletaGraficos": {
    "positivo":  { "base": "#19502F", "claro": "#B2BFB4", "escuro": "#0D2B19", "sentimento": "Excelente" },
    "qualidade": { "base": "#466C53", "claro": "#82A68F", "escuro": "#324D3B", "sentimento": "Bom" },
    "alerta":    { "base": "#E2A937", "claro": "#F1D394", "escuro": "#B5872C", "sentimento": "Atenção" },
    "critico":   { "base": "#FF7725", "claro": "#FFB080", "escuro": "#C44A00", "sentimento": "Alerta Alto" },
    "negativo":  { "base": "#DC3545", "claro": "#F1959B", "escuro": "#A71D2A", "sentimento": "Falha" },
    "neutro":    { "base": "#DADADA", "claro": "#F5F5F5", "escuro": "#A9A9A9", "sentimento": "Neutro" }
  },
  "tipografia": {
    "titulo":            { "fonte": "Montserrat Light",   "tamanho": 32, "caixa": "alta",  "cores": ["#575756", "#19502F"] },
    "subtitulo":         { "fonte": "Montserrat Light",   "tamanho": 18, "caixa": "alta",  "cores": ["#575756", "#19502F"] },
    "texto":             { "fonte": "Montserrat Regular", "tamanho": 12, "caixa": "baixa", "cores": ["#575756"] },
    "destaqueNoTexto":   { "fonte": "Montserrat Medium",  "tamanho": 12, "caixa": "baixa", "cores": ["#575756", "#19502F"] },
    "caixaDestaqueCurto":{ "fonte": "Montserrat Light",   "tamanho": 16, "caixa": "alta",  "cores": ["#19502F", "#FFFFFF"] },
    "caixaDestaqueLongo":{ "fonte": "Montserrat Regular", "tamanho": 16, "caixa": "baixa", "cores": ["#19502F", "#FFFFFF"] }
  }
}
```
