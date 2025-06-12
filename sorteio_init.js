// sorteio_init.js (Versão com campo de senha no HTML)

setTimeout(function() { 
    const passwordContainer = document.getElementById('password-container'); // NOVO
    const passwordInput = document.getElementById('password-input');         // NOVO
    const authBtn = document.getElementById('auth-btn');                     // NOVO
    const sortearBtn = document.getElementById('sortear-btn'); 

    if (sortearBtn) { // Verifica o botão de sorteio
        console.log("SortearBtn encontrado! Adicionando listener...", sortearBtn);
    } else {
        console.error("ERRO GRAVE: Botão 'sortear-btn' NÃO ENCONTRADO no DOM do iframe. Verifique o HTML.");
        return; 
    }

    if (!passwordInput || !authBtn || !passwordContainer) { // Verifica os novos elementos
        console.error("ERRO GRAVE: Elementos de autenticação (password-input, auth-btn, password-container) NÃO ENCONTRADOS. Verifique o HTML.");
        return;
    }


    const sorteioInfo = document.getElementById('sorteio-info');
    const sorteioResultado = document.getElementById('sorteio-resultado');
    const networkContainer = document.getElementById('mynetwork-sorteio');

    const ADMIN_PASSWORD = "elasconecta2025"; // !!! ATENÇÃO: SENHA HARDCODED E INSEGURA PARA DEMONSTRAÇÃO !!!

    let pessoasData = [];
    let network = null;
    let lastSorteioUpdateTime = null; 

    const corAreaSorteada = '#d52c01';
    const corPessoa1 = '#a30161';
    const corPessoa2 = '#0097b2';
    const corArestasSorteio = '#5D3B2E';

    // --- FUNÇÃO PARA CARREGAR DADOS DO GRAFO (DO JSON) ---
    function loadGraphDataFromJson() {
        fetch('graph_data.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao carregar graph_data.json: ${response.statusText} (Status: ${response.status})`);
                }
                return response.json();
            })
            .then(data => {
                const nodes = data.nodes;
                const edges = data.edges;

                if (!nodes || !edges || nodes.length === 0 || edges.length === 0) {
                    throw new Error("Dados do grafo JSON não contêm 'nodes' ou 'edges' válidos ou estão vazios.");
                }

                const tempPessoasData = {};

                nodes.forEach(node => {
                    if (node.tipo === 'pessoa') {
                        tempPessoasData[node.label] = {
                            nome: node.label,
                            interesses: []
                        };
                    }
                });

                edges.forEach(edge => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);

                    if (fromNode && toNode) {
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

                console.log("Dados de pessoas e interesses extraídos do JSON para sorteio:", pessoasData);
                sorteioInfo.textContent = "Dados prontos para o sorteio!";
                checkAndUpdateSorteioResult(); 
            })
            .catch(error => {
                console.error('Erro ao carregar ou processar dados do grafo JSON:', error);
                sorteioInfo.textContent = `Erro ao carregar e processar dados do grafo: ${error.message}`;
            });
    }

    // --- FUNÇÃO PARA ATUALIZAR O RESULTADO DO SORTEIO NA TELA ---
    function displaySorteioResult(data) {
        if (network) {
            network.destroy();
            network = null;
        }
        if (data.area_sorteada && data.pessoa1 && data.pessoa2) {
            sorteioInfo.textContent = `Última Área sorteada: ${data.area_sorteada}`;
            sorteioResultado.innerHTML = `Últimas Pessoas sorteadas: <span style="color:${corPessoa1}">${data.pessoa1}</span> e <span style="color:${corPessoa2}">${data.pessoa2}</span>!`;

            const nodes = new vis.DataSet([
                { id: data.pessoa1, label: data.pessoa1, shape: 'dot', size: 40, color: corPessoa1, font: { size: 25, color: '#333' } },
                { id: data.pessoa2, label: data.pessoa2, shape: 'dot', size: 40, color: corPessoa2, font: { size: 25, color: '#333' } },
                { id: data.area_sorteada, label: data.area_sorteada, shape: 'circle', size: 20, color: corAreaSorteada, font: { size: 22, color: 'black' } }
            ]);

            const edges = new vis.DataSet([
                { from: data.pessoa1, to: data.area_sorteada, width: 2, color: corArestasSorteio },
                { from: data.pessoa2, to: data.area_sorteada, width: 2, color: corArestasSorteio }
            ]);

            const visData = { nodes: nodes, edges: edges };

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

            network = new vis.Network(networkContainer, visData, options);
        } else {
            sorteioInfo.textContent = "Nenhum sorteio realizado ainda ou dados incompletos.";
            sorteioResultado.innerHTML = "";
            networkContainer.innerHTML = ""; 
        }
    }

    // --- FUNÇÃO PARA CHECAR E ATUALIZAR O RESULTADO DO SORTEIO (para "todos") ---
    function checkAndUpdateSorteioResult() {
        fetch('sorteio_resultado.json?t=' + new Date().getTime()) 
            .then(response => {
                if (!response.ok) {
                    console.warn("sorteio_resultado.json não encontrado ou erro ao carregar. Isso é normal se o arquivo não tiver sido criado ou estiver vazio inicialmente.");
                    return null; 
                }
                return response.json();
            })
            .then(data => {
                if (data && data.ultima_atualizacao && data.ultima_atualizacao !== lastSorteioUpdateTime) {
                    console.log("Novo resultado de sorteio detectado:", data);
                    displaySorteioResult(data);
                    lastSorteioUpdateTime = data.ultima_atualizacao;
                }
            })
            .catch(error => {
                console.error('Erro ao verificar atualização do sorteio:', error);
            });
    }

    // --- LÓGICA DE AUTENTICAÇÃO DO ADMINISTRADOR (NOVA) ---
    authBtn.addEventListener('click', function() {
        const enteredPassword = passwordInput.value; // Pega o valor do campo de senha
        if (enteredPassword === ADMIN_PASSWORD) {
            passwordContainer.style.display = 'none'; // Oculta o campo de senha
            sortearBtn.style.display = 'block';       // Mostra o botão de sorteio
            sorteioInfo.textContent = "Autenticação bem-sucedida! Pronto para sortear.";
            console.log("Admin autenticado.");
        } else {
            alert("Senha incorreta. Apenas administradores podem realizar o sorteio.");
            passwordInput.value = ''; // Limpa o campo de senha
            console.warn("Tentativa de login falhou.");
        }
    });

    // --- LÓGICA DO SORTEIO (AGORA SEM O PROMPT) ---
    sortearBtn.addEventListener('click', function() {
        console.log("Botão Sortear Dupla CLICADO!"); 

        if (pessoasData.length === 0) {
            sorteioInfo.textContent = "Aguarde, os dados ainda não foram carregados ou não há participantes.";
            return;
        }

        sorteioInfo.textContent = "";
        sorteioResultado.textContent = "";
        if (network) {
            network.destroy();
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

        const sorteioResultData = {
            ultima_atualizacao: new Date().toISOString(), 
            area_sorteada: areaSorteada,
            pessoa1: pessoa1,
            pessoa2: pessoa2
        };
        displaySorteioResult(sorteioResultData);

        console.warn("Atenção: Para que outros usuários vejam este sorteio, você deve EDITAR MANUALMENTE o arquivo 'sorteio_resultado.json' no seu disco com os dados do sorteio.");
        console.warn("Dados para copiar/colar no 'sorteio_resultado.json':", sorteioResultData);
    });

    setInterval(checkAndUpdateSorteioResult, 5000);

    loadGraphDataFromJson(); 

}, 200);