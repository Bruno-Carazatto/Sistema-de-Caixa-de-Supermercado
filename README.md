# 🛒 Sistema de Caixa de Supermercado (POS)

> Um **sistema de caixa (Point of Sale)** desenvolvido 100% em **Front-end**, simulando o funcionamento real de um caixa de supermercado.

Este projeto foi criado com foco em **lógica de negócio**, **experiência do usuário** e **organização de código**, indo além de exemplos genéricos.

---

## 🎯 Objetivo do Projeto

Simular um **caixa de supermercado real**, permitindo:

- Adicionar produtos ao carrinho
- Controlar quantidades
- Calcular total, valor pago e troco
- Finalizar vendas
- Registrar histórico
- Exportar dados
- Utilizar teclado numérico (como em caixas físicos)
- Trabalhar com tema claro e escuro

Tudo isso **sem back-end**, utilizando apenas o navegador.

---

## ⚙️ Funcionalidades

### 🧺 Carrinho
- Adição de produtos
- Controle de quantidade (+ / − / teclado)
- Itens mais recentes aparecem no topo
- Scroll interno automático (layout nunca quebra)

### 💳 Pagamento
- Dinheiro, Pix e Cartão
- Cálculo automático de troco
- Validações de valor insuficiente

### ⌨️ Teclado Numérico
- Modo Quantidade
- Modo Valor Pago
- Comportamento semelhante a caixas reais

### 🧾 Histórico de Vendas
- Registro completo de cada venda
- Visualização detalhada dos itens
- Persistência com `localStorage`

### 📤 Exportação CSV
- Exportar carrinho atual
- Exportar histórico completo de vendas

### 🔔 Notificações Flutuantes
- Alertas no estilo **toast**
- Não quebram layout
- Empilhamento automático
- Fechamento manual ou automático

### 🌗 Tema Claro / Escuro
- Toggle de tema
- Persistência da preferência
- Interface adaptada para desktop e mobile

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**
- **CSS3**
- **JavaScript (Vanilla)**
- **Bootstrap 5**
- **LocalStorage**
- **CSV Export (client-side)**

> ❌ Sem frameworks  
> ❌ Sem bibliotecas externas de estado  
> ❌ Sem back-end  

---

## 📂 Estrutura do Projeto

```txt
sistema-caixa-supermercado/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── img/
    └── icon.png
