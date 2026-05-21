# 🚢 Painel Estratégico - Mapas de Bordo (MPA)

Componente prático de avaliação da disciplina sobre conceitos de **OLAP, ETL e Visualização de Dados**.

## 👥 Integrantes do Grupo
* 
Eduardo Soares, Rafael Rangel, Eduardo Trevizani, Guilherme Holz, Luis Vilarim.

---

## 🎯 Objetivo do Projeto
O objetivo deste projeto é extrair, tratar e transformar os dados abertos do Governo Federal referentes aos **Mapas de Bordo** do Ministério da Pesca e Aquicultura (MPA). A análise visa transformar dados brutos de registros de embarcações, portos e UFs em informações estratégicas através de um painel visual (Dashboard).

---

## 🛠️ Arquitetura da Solução (ETL e OLAP)

### 1. Extração e Engenharia de Dados (ETL)
Modelamos o pipeline de ETL utilizando a ferramenta **n8n** (conforme desenho técnico documentado). O fluxo foi estruturado para resolver os seguintes passos:
* **Ingestão:** Carga do arquivo bruto de Mapas de Bordo.
* **Transformação:** Conversão dos dados binários do CSV para estruturas JSON.
* **Filtragem (Redução de Dimensionalidade):** Limpeza de campos redundantes e seleção exclusiva das chaves analíticas essenciais (`idMapaDeBordo`, `portoSaida`, `portoChegada`, `ufEmbarcacao`).

*Nota de Engenharia:* Para otimizar o tempo de resposta da aplicação frontend e contornar limites de infraestrutura cloud (estouro de payload/memória), a massa de dados pré-processada foi acoplada localmente via stream assíncrono diretamente na camada de visualização.

### 2. Modelagem OLAP Dimensional (Conceitual)
Os dados foram estruturados mentalmente seguindo o modelo **Star Schema (Esquema Estrela)**:
* **Tabela Fato:** `fato_pesca` (Registros de viagens e ocorrências).
* **Tabelas Dimensão:** `dim_localizacao` (Portos de Saída/Chegada) e `dim_embarcacao` (UF da embarcação).

---

## 🖥️ O Painel Dashboard (React.js)
O frontend foi construído em **React.js (Vite)** utilizando componentes analíticos para responder às seguintes perguntas de negócio:
* **Volume total de atividade:** Quantidade total de viagens registradas.
* **Liderança logística:** Quais os top 5 portos com maior fluxo de desembarque.
* **Distribuição regional:** Quais os estados (UF) com maior participação na frota pesqueira.

### Tecnologias Utilizadas:
* React.js (Vite)
* Recharts (Biblioteca de gráficos)
* Lucide React (Ícones de KPI)
* PapaParse (Stream de processamento do CSV)

---

## 🚀 Como Executar o Projeto

1. Clone o repositório:
   ```bash
   git clone https://github.com/DuduSS021k/projeto-pesca.git

   <img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/04ddfb56-dcee-40d3-a915-53bbb3ab8aa4" />
