// sorteio_init.js

document.addEventListener('DOMContentLoaded', function() {
    const sortearBtn = document.getElementById('sortear-btn');
    const sorteioInfo = document.getElementById('sorteio-info');
    const sorteioResultado = document.getElementById('sorteio-resultado');
    const networkContainer = document.getElementById('mynetwork-sorteio');

    let pessoasData = [];
    let network = null;

    const corAreaSorteada = '#d52c01';
    const corPessoa1 = '#a30161';
    const corPessoa2 = '#0097b2';
    const corArestasSorteio = '#5D3B2E';

    // --- FUNÇÃO PARA CARREGAR DADOS DO JSON ---
    // Esta função vai carregar o arquivo 'graph_data.json' que seu main.py gera.
    function loadGraphDataFromJson() {
        fetch('graph_data.json')
            .then(response => {
                if (!response.ok) {
                    // Lança um erro se o arquivo JSON não for encontrado ou houver outro problema HTTP
                    throw new Error(`Erro ao carregar graph_data.json: ${response.statusText} (Status: ${response.status})`);
                }
                return response.json(); // Analisa a resposta como JSON
            })
            .then(data => {
                const nodes = data.nodes;
                const edges = data.edges;

                // Verifica se os dados necessários (nodes e edges) existem e não estão vazios
                if (!nodes || !edges || nodes.length === 0 || edges.length === 0) {
                    throw new Error("Dados do grafo JSON não contêm 'nodes' ou 'edges' válidos ou estão vazios.");
                }

                const tempPessoasData = {};

                // Processa os nós para identificar as pessoas e seus interesses
                nodes.forEach(node => {
                    // Usamos a propriedade 'tipo' que adicionamos no JSON para identificar pessoas
                    if (node.tipo === 'pessoa') {
                        tempPessoasData[node.label] = {
                            nome: node.label,
                            interesses: []
                        };
                    }
                });

                // Conecta pessoas a interesses com base nas arestas
                edges.forEach(edge => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);

                    if (fromNode && toNode) {
                        // Verifica qual nó é a pessoa e qual é o interesse usando a propriedade 'tipo'
                        if (fromNode.tipo === 'pessoa' && toNode.tipo === 'interesse') {
                            if (tempPessoasData[fromNode.label]) {
                                tempPessoasData[fromNode.label].interesses.push(toNode.label);
                            }
                        } else if (toNode.tipo === 'pessoa' && fromNode.tipo === 'interesse') {
                            if (tempPessoasData[toNode.label]) {
                                tempPessoasData[toNode.label].interesses.push(fromNode.label);
                            }
                        }
                    }
                });

                pessoasData = Object.values(tempPessoasData);

                console.log("Dados de pessoas e interesses extraídos do JSON:", pessoasData);
                sorteioInfo.textContent = "Dados prontos para o sorteio!";
            })
            .catch(error => {
                console.error('Erro ao carregar ou processar dados do grafo JSON:', error);
                sorteioInfo.textContent = `Erro ao carregar e processar dados do grafo: ${error.message}`;
            });
    }

    // --- CHAMA A NOVA FUNÇÃO DE CARREGAMENTO NO INÍCIO ---
    loadGraphDataFromJson();

    // --- LÓGICA DO SORTEIO (Permanece a mesma, só ajustei algumas mensagens) ---
    sortearBtn.addEventListener('click', function() {
        if (pessoasData.length === 0) {
            sorteioInfo.textContent = "Aguarde, os dados ainda não foram carregados ou não há participantes válidos.";
            return;
        }

        sorteioInfo.textContent = ""; // Limpa info anterior
        sorteioResultado.textContent = ""; // Limpa resultado anterior
        if (network) {
            network.destroy(); // Destroi o grafo anterior se existir
            network = null;
        }

        const todasAreas = new Set();
        pessoasData.forEach(pessoa => {
            pessoa.interesses.forEach(interesse => todasAreas.add(interesse));
        });
        const areasArray = Array.from(todasAreas);

        if (areasArray.length === 0) {
            sorteioInfo.textContent = "Nenhuma área de interesse encontrada para sorteio.";
            return;
        }

        const areaSorteada = areasArray[Math.floor(Math.random() * areasArray.length)];
        sorteioInfo.textContent = `Área sorteada: ${areaSorteada}`;

        const pessoasComArea = pessoasData.filter(pessoa => pessoa.interesses.includes(areaSorteada));

        if (pessoasComArea.length < 2) {
            sorteioResultado.textContent = `Menos de duas pessoas com interesse em "${areaSorteada}". Tentando outra área...`;
            // Pequeno delay para evitar loop infinito rápido se não houver áreas válidas
            setTimeout(() => sortearBtn.click(), 1000);
            return;
        }

        let indicesSorteados = [];
        while (indicesSorteados.length < 2) {
            const randomIndex = Math.floor(Math.random() * pessoasComArea.length);
            if (!indicesSorteados.includes(randomIndex)) {
                indicesSorteados.push(randomIndex);
            }
        }
        const pessoa1 = pessoasComArea[indicesSorteados[0]].nome;
        const pessoa2 = pessoasComArea[indicesSorteados[1]].nome;

        sorteioResultado.innerHTML = `Pessoas sorteadas: <span style="color:${corPessoa1}">${pessoa1}</span> e <span style="color:${corPessoa2}">${pessoa2}</span>!`;

        // Criação do grafo local para o sorteio
        const nodes = new vis.DataSet([
            { id: pessoa1, label: pessoa1, shape: 'dot', size: 40, color: corPessoa1, font: { size: 25, color: '#333' } },
            { id: pessoa2, label: pessoa2, shape: 'dot', size: 40, color: corPessoa2, font: { size: 25, color: '#333' } },
            { id: areaSorteada, label: areaSorteada, shape: 'circle', size: 20, color: corAreaSorteada, font: { size: 22, color: 'black' } }
        ]);

        const edges = new vis.DataSet([
            { from: pessoa1, to: areaSorteada, width: 2, color: corArestasSorteio },
            { from: pessoa2, to: areaSorteada, width: 2, color: corArestasSorteio }
        ]);

        const data = { nodes: nodes, edges: edges };

        const options = {
            physics: {
                barnesHut: {
                    gravity: -30000,
                    centralGravity: 0.3,
                    springLength: 250,
                    springStrength: 0.005
                },
                stabilization: {
                    iterations: 100
                }
            },
            interaction: {
                zoomView: true,
                dragNodes: true,
                dragView: true
            }
        };

        network = new vis.Network(networkContainer, data, options);
    });
});