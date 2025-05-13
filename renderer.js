const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'metas.json');

let metas = [];

function carregarMetas() {
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        metas = JSON.parse(data);
    }
    renderizarMetas();
}

function salvarMetas() {
    fs.writeFileSync(filePath, JSON.stringify(metas, null, 2));
}

function formatarValor(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseValorMonetario(str) {
    return parseFloat(str.replace(/\D/g, '')) / 100;
}

function renderizarMetas() {
    const container = document.getElementById('metas-container');
    container.innerHTML = '';

    metas.forEach((meta, index) => {
        const div = document.createElement('div');
        div.className = 'meta';

        const progresso = ((meta.valorAtual / meta.valorAlvo) * 100).toFixed(1);
        let economiaForcada = '';

        if (meta.dataLimite) {
            const hoje = new Date();
            const fim = new Date(meta.dataLimite);
            const diasRestantes = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));

            if (diasRestantes > 0) {
                const falta = meta.valorAlvo - meta.valorAtual;
                const porDia = (falta / diasRestantes).toFixed(2);
                const porSemana = (falta / (diasRestantes / 7)).toFixed(2);
                const porMes = (falta / (diasRestantes / 30)).toFixed(2);

                economiaForcada = `
                    <div class="economia-forcada">
                        <strong>💰 Economia Forçada:</strong><br/>
                        ${formatarValor(parseFloat(porDia))}/dia | 
                        ${formatarValor(parseFloat(porSemana))}/semana | 
                        ${formatarValor(parseFloat(porMes))}/mês
                    </div>
                `;
            } else {
                economiaForcada = `<div style="color:red;"><strong>⚠️ Meta vencida!</strong></div>`;
            }
        }

        div.innerHTML = `
            <strong>📌 ${meta.nome}</strong><br/>
            <span>🎯 ${formatarValor(meta.valorAlvo)} | ✅ Batido: ${formatarValor(meta.valorAtual)} (${progresso}%)</span>
            <div class="progress">
                <div class="progress-inner" style="width: ${Math.min(progresso, 100)}%"></div>
            </div>
            ${economiaForcada}
            <input type="text" placeholder="💵 Valor (R$)" id="valor-${index}" class="input-real" />
            <button onclick="adicionarValor(${index})">➕ Adicionar valor</button>
            <button onclick="removerValor(${index})" style="background-color:#ff3b30; margin-top: 10px;">➖ Remover valor</button>
            <button onclick="concluirMeta(${index})" style="background-color:#999; margin-top: 10px;">✔️ Concluir</button>
        `;

        if (meta.historico && meta.historico.length > 0) {
            const historicoHtml = meta.historico.slice(-5).reverse().map(item => {
                const dataFormatada = new Date(item.data).toLocaleString();
                const cor = item.tipo === 'adicao' ? 'green' : 'red';
                const sinal = item.tipo === 'adicao' ? '+' : '-';
                return `<li style="color:${cor}">${dataFormatada}: ${sinal} ${formatarValor(item.valor)}</li>`;
            }).join('');

            div.innerHTML += `<details><summary>📅 Histórico (últimos 5)</summary><ul>${historicoHtml}</ul></details>`;
        }

        container.appendChild(div);

        // Máscara em tempo real para cada input
        const input = document.getElementById(`valor-${index}`);
        input.addEventListener('input', () => {
            let valor = input.value.replace(/\D/g, '');
            valor = (parseInt(valor, 10) / 100 || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            input.value = valor;
        });
    });
}

function adicionarValor(index) {
    const input = document.getElementById(`valor-${index}`);
    const valor = parseValorMonetario(input.value);
    if (!isNaN(valor) && valor > 0) {
        metas[index].valorAtual += valor;
        metas[index].historico.push({ data: new Date().toISOString(), valor, tipo: 'adicao' });
        salvarMetas();
        renderizarMetas();
        input.value = '';
    }
}

function removerValor(index) {
    const input = document.getElementById(`valor-${index}`);
    const valor = parseValorMonetario(input.value);
    if (!isNaN(valor) && valor > 0) {
        metas[index].valorAtual -= valor;
        if (metas[index].valorAtual < 0) metas[index].valorAtual = 0;
        metas[index].historico.push({ data: new Date().toISOString(), valor, tipo: 'remocao' });
        salvarMetas();
        renderizarMetas();
        input.value = '';
    }
}

function concluirMeta(index) {
    if (confirm("Tem certeza que deseja concluir/excluir esta meta?")) {
        metas.splice(index, 1);
        salvarMetas();
        renderizarMetas();
    }
}

function exportarCSV() {
    const header = ['Nome', 'Valor Alvo', 'Valor Atual', 'Progresso', 'Data Limite'];
    const rows = metas.map(meta => [
        meta.nome,
        formatarValor(meta.valorAlvo),
        formatarValor(meta.valorAtual),
        `${((meta.valorAtual / meta.valorAlvo) * 100).toFixed(1)}%`,
        meta.dataLimite ? new Date(meta.dataLimite).toLocaleDateString() : 'Sem limite'
    ]);

    const csvContent = [
        header.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'metas.csv';
    link.click();
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Relatório de Metas', 20, 20);

    let yPosition = 30; // Posição inicial

    metas.forEach(meta => {
        doc.setFontSize(12);
        doc.text(`Meta: ${meta.nome}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Valor Alvo: ${formatarValor(meta.valorAlvo)}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Valor Atual: ${formatarValor(meta.valorAtual)}`, 20, yPosition);
        yPosition += 10;
        doc.text(`Progresso: ${(meta.valorAtual / meta.valorAlvo * 100).toFixed(1)}%`, 20, yPosition);
        yPosition += 10;
        if (meta.dataLimite) {
            doc.text(`Data Limite: ${new Date(meta.dataLimite).toLocaleDateString()}`, 20, yPosition);
            yPosition += 10;
        }
        doc.text('-----------------------------------------', 20, yPosition);
        yPosition += 10;

        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
    });

    doc.save('metas.pdf');
}

document.getElementById('meta-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const valorInput = document.getElementById('valor').value;
    const valor = parseValorMonetario(valorInput);
    const dataLimite = document.getElementById('dataLimite').value;

    if (nome && !isNaN(valor)) {
        metas.push({
            nome,
            valorAlvo: valor,
            valorAtual: 0,
            dataLimite: dataLimite || null,
            historico: []
        });
        salvarMetas();
        renderizarMetas();
        e.target.reset();
    }
});

const inputValor = document.getElementById('valor');
inputValor.addEventListener('input', () => {
    let valor = inputValor.value.replace(/\D/g, '');
    valor = (parseInt(valor, 10) / 100 || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    inputValor.value = valor;
});

document.getElementById('toggle-theme').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('toggle-theme');
    btn.textContent = document.body.classList.contains('dark-mode') ? '☀️ Modo Claro' : '🌙 Modo Escuro';
});

window.onload = carregarMetas;