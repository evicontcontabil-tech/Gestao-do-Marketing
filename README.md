[README.md](https://github.com/user-attachments/files/28395393/README.md)
# EVICONT · Plataforma de Marketing

Central de gestão do marketing da **EVICONT Contabilidade** — tarefas, calendário editorial, banco de ideias e relatórios de produtividade em um lugar só.

[![Status](https://img.shields.io/badge/status-prot%C3%B3tipo-orange)]()
[![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-1A1A1A)]()
[![License](https://img.shields.io/badge/license-Proprietary-7A726A)]()

---

## ✦ Funcionalidades

- **Login** com identificação do usuário (cosmético neste protótipo).
- **Dashboard** com KPIs operacionais, próximos prazos e postagens da semana.
- **Tarefas** — gestão completa de demandas com modelo de impacto (meta, motivo, contribuição, stakeholders, prazos).
- **Calendário editorial** — visão mensal das postagens por plataforma e tipo.
- **Banco de Ideias** — cards categorizados com função "virar tarefa" em um clique.
- **Relatórios** — 4 gráficos interativos (status, produção mensal, áreas, tipos de postagem) com filtro por período.
- **Exportação `.xlsx`** — tarefas, calendário e relatórios consolidados.

## ✦ Stack

- HTML5 semântico
- CSS3 puro (variáveis CSS, grid, flexbox)
- JavaScript vanilla (ES2020+, async/await)
- [Chart.js 4.4](https://www.chartjs.org/) — gráficos
- [SheetJS](https://sheetjs.com/) — exportação Excel
- Fontes: Instrument Serif + DM Sans (Google Fonts)
- Persistência: `localStorage` (navegador local)

## ✦ Estrutura

```
.
├── index.html          # Estrutura da aplicação
├── css/
│   └── style.css       # Identidade visual EVICONT
├── js/
│   └── app.js          # Lógica completa (state, views, persistência)
└── README.md
```

## ✦ Como rodar localmente

Não precisa de servidor — é um site estático:

```bash
# Clone o repositório
git clone https://github.com/evicontcontabil-tech/Gestao-do-Marketing.git
cd Gestao-do-Marketing

# Abra o index.html no navegador (Chrome, Edge ou Firefox)
```

Ou, com Python instalado, sobe um servidor local:

```bash
python3 -m http.server 8000
# Acesse http://localhost:8000
```

## ✦ Publicação (GitHub Pages)

1. No GitHub, abra **Settings → Pages**.
2. Em **Source**, selecione `Deploy from a branch`.
3. Branch: `main` · Pasta: `/ (root)` · Salvar.
4. Em ~1 minuto o site fica disponível em
   `https://evicontcontabil-tech.github.io/Gestao-do-Marketing/`

## ✦ Identidade visual

| Cor              | Hex       | Uso                          |
|------------------|-----------|------------------------------|
| Laranja EVICONT  | `#E8811A` | Cor primária, acentos        |
| Bege quente      | `#F5F1EC` | Fundo principal              |
| Preto profundo   | `#1A1A1A` | Sidebar, contraste, texto    |
| Verde            | `#4A7C59` | Status concluído             |
| Vermelho         | `#B8453A` | Atrasos, alertas             |

## ✦ Roadmap

- [x] Protótipo funcional com persistência local
- [x] Identidade visual EVICONT aplicada
- [x] Exportação `.xlsx` (Tarefas, Calendário, Relatório)
- [ ] Backend real com autenticação (Supabase)
- [ ] Multi-usuário (equipe EVICONT)
- [ ] Integração com APIs do Instagram e YouTube
- [ ] Notificações de prazo

## ✦ Sobre

Projeto interno da **EVICONT Contabilidade**.
Desenvolvido por Fabricyo Dias.

---

> *EVICONT — o jeito certo de prosperar.*
