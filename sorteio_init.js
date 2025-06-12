// sorteio_init.js (Versão com campo de senha no HTML, Hash para a senha e Sincronização JSONBin.io)

setTimeout(function() { 
    const passwordContainer = document.getElementById('password-container');
    const passwordInput = document.getElementById('password-input');
    const authBtn = document.getElementById('auth-btn');
    const sortearBtn = document.getElementById('sortear-btn'); 

    if (sortearBtn) {
        console.log("SortearBtn encontrado! Adicionando listener...", sortearBtn);
    } else {
        console.error("ERRO GRAVE: Botão 'sortear-btn' NÃO ENCONTRADO no DOM do iframe. Verifique o HTML.");
        return; 
    }

    if (!passwordInput || !authBtn || !passwordContainer) {
        console.error("ERRO GRAVE: Elementos de autenticação (password-input, auth-btn, password-container) NÃO ENCONTRADOS. Verifique o HTML.");
        return;
    }


    const sorteioInfo = document.getElementById('sorteio-info');
    const sorteioResultado = document.getElementById('sorteio-resultado');
    const networkContainer = document.getElementById('mynetwork-sorteio');

    // !!! ATENÇÃO: COLOQUE AQUI O HASH SHA-256 DA SUA SENHA DE ADMINISTRADOR !!!
    const ADMIN_PASSWORD_HASH = "70634fbd18273fdc823c0e55d173d842e0ca16523fbebfbda0979b021e626530"; 

    // --- NOVAS VARIÁVEIS PARA JSONBIN.IO ---
    // !!! ATENÇÃO: COLOQUE SUA MASTER KEY REAL AQUI !!!
    const JSONBIN_MASTER_KEY = "$2a$10$Dqq7na7JDXk8dBFI/0a81uiQT7.YO5RgFhgzdbWwNrbaeaYio7oc."; 
    // !!! ATENÇÃO: COLOQUE SEU BIN ID REAL AQUI !!!
    const JSONBIN_BIN_ID = "684ad82d8561e97a5022ff63"; 
    const JSONBIN_API_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
    // ------------------------------------

    // Função assíncrona para gerar o hash SHA-256 de uma string
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hexHash;
    }

    let pessoasData = [];
    let network = null;
    let lastSorteioUpdateTime = null; 

    const corAreaSorteada = '#d52c01';
    const corPessoa1 = '#a30161';
    const corPessoa2 = '#0097b2';
    const corArestasSorteio = '#5D3B2E';

    // --- FUNÇÃO PARA CARREGAR DADOS DO GRAFO (DO JSON LOCAL) ---
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
                // Chamar checkAndUpdateSorteioResult para carregar o estado inicial do sorteio do JSONBin.io
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
        // Se data for null ou vazio, limpa a exibição
        if (!data || !data.area_sorteada || !data.pessoa1 || !data.pessoa2) {
            sorteioInfo.textContent = "Nenhum sorteio realizado ainda ou dados incompletos.";
            sorteioResultado.innerHTML = "";
            if (networkContainer) networkContainer.innerHTML = ""; 
            return; // Sai da função se não houver dados válidos para exibir
        }
        
        sorteioInfo.textContent = `Última Área sorteada: ${data.area_sorteada}`;
        sorteioResultado.innerHTML = `Últimas Pessoas sorteadas: <span style="color:#700041">${data.pessoa1}</span> e <span style="color:#700041">${data.pessoa2}</span>!`;

        const nodes = new vis.DataSet([
            { id: data.pessoa1, label: data.pessoa1, shape: 'dot', size: 60, color: corPessoa1, font: { size: 30, color: '#333' } },
            { id: data.pessoa2, label: data.pessoa2, shape: 'dot', size: 60, color: corPessoa2, font: { size: 30, color: '#333' } },
            { id: data.area_sorteada, label: data.area_sorteada, shape: 'circle', size: 8, color: corAreaSorteada, font: { size: 12, color: 'black' } }
        ]);

        const edges = new vis.DataSet([
            { from: data.pessoa1, to: data.area_sorteada, width: 4, color: corArestasSorteio },
            { from: data.pessoa2, to: data.area_sorteada, width: 4, color: corArestasSorteio }
        ]);

        const visData = { nodes: nodes, edges: edges };

        const options = {
            physics: {
                barnesHut: {
                    gravity: -30000,
                    centralGravity: 0.3,
                    springLength: 350,
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
    }

    // --- FUNÇÃO PARA LER O RESULTADO DO SORTEIO (DO JSONBIN.IO) ---
    function checkAndUpdateSorteioResult() {
        fetch(`${JSONBIN_API_URL}/latest?t=${new Date().getTime()}`, { // Adiciona um timestamp para evitar cache
            headers: {
                'X-Master-Key': JSONBIN_MASTER_KEY // Necessário se o bin for privado ou para evitar rate limits
            }
        })
        .then(response => {
            if (!response.ok) {
                // O status 404 pode significar que o bin está vazio ou não foi criado ainda.
                // Isso é aceitável na primeira carga.
                if (response.status === 404) {
                    console.warn("JSONBin não encontrado ou vazio. Isso é normal se o arquivo não tiver sido criado ou estiver vazio inicialmente.");
                    return null;
                }
                throw new Error(`Erro ao carregar dados do JSONBin: ${response.statusText} (Status: ${response.status})`);
            }
            return response.json();
        })
        .then(jsonBinResponse => {
            // JSONBin.io retorna os dados dentro de um objeto 'record'
            const data = jsonBinResponse ? jsonBinResponse.record : null; 
            
            if (data && data.ultima_atualizacao && data.ultima_atualizacao !== lastSorteioUpdateTime) {
                console.log("Novo resultado de sorteio detectado do JSONBin:", data);
                displaySorteioResult(data);
                lastSorteioUpdateTime = data.ultima_atualizacao;
            } else if (!data || !data.ultima_atualizacao) { // Se o bin estiver vazio ou sem dados de sorteio
                if (lastSorteioUpdateTime !== null) { // Apenas se já houve um sorteio exibido antes
                     console.log("JSONBin esvaziado ou sem dados de sorteio. Limpando exibição.");
                     displaySorteioResult({}); // Passa um objeto vazio para limpar a tela
                     lastSorteioUpdateTime = null;
                }
            }
        })
        .catch(error => {
            console.error('Erro ao verificar atualização do sorteio do JSONBin:', error);
            // sorteioInfo.textContent = `Erro ao carregar sorteio (JSONBin): ${error.message}`; // Comentado para não exibir se sorteioInfo estiver oculto
        });
    }

    // --- LÓGICA DE AUTENTICAÇÃO DO ADMINISTRADOR (AGORA COM HASH) ---
    authBtn.addEventListener('click', async function() { 
        const enteredPassword = passwordInput.value;
        const enteredPasswordHash = await sha256(enteredPassword);

        if (enteredPasswordHash === ADMIN_PASSWORD_HASH) {
            passwordContainer.style.display = 'none';
            sortearBtn.style.display = 'block';
            sorteioInfo.textContent = "Autenticação bem-sucedida! Pronto para sortear.";
            console.log("Admin autenticado.");
            // Opcional: force uma atualização imediata após a autenticação
            checkAndUpdateSorteioResult(); 
        } else {
            alert("Senha incorreta. Apenas administradores podem realizar o sorteio.");
            passwordInput.value = '';
            console.warn("Tentativa de login falhou.");
        }
    });

    // --- LÓGICA DO SORTEIO E ESCRITA (PARA O JSONBIN.IO) ---
    sortearBtn.addEventListener('click', function() {
        console.log("Botão Sortear Dupla CLICADO!"); 

        if (pessoasData.length === 0) {
            sorteioInfo.textContent = "Aguarde, os dados ainda não foram carregados ou não há participantes.";
            return;
        }

        sorteioInfo.textContent = ""; // Limpa antes de sortear
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

        const sorteioResultData = {
            ultima_atualizacao: new Date().toISOString(), 
            area_sorteada: areaSorteada,
            pessoa1: pessoa1,
            pessoa2: pessoa2
        };
        
        // Atualiza localmente imediatamente (para a tela do admin)
        displaySorteioResult(sorteioResultData);
        lastSorteioUpdateTime = sorteioResultData.ultima_atualizacao;


        // --- SALVA O RESULTADO NO JSONBIN.IO ---
        fetch(JSONBIN_API_URL, {
            method: 'PUT', // PUT para atualizar o Bin existente
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY, // A Master Key é crucial aqui para PERMISSÃO de escrita
                'X-Bin-Meta': false // Não atualiza meta-dados do bin, apenas o conteúdo
            },
            body: JSON.stringify(sorteioResultData)
        })
        .then(response => {
            if (!response.ok) {
                // Se a requisição falhar (ex: chave incorreta, Bin ID errado, limite de requisições)
                throw new Error(`Erro ${response.status} ao salvar sorteio no JSONBin: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Sorteio salvo com sucesso no JSONBin.io:", data);
            sorteioInfo.textContent = "Sorteio realizado e publicado!"; 
        })
        .catch(error => {
            console.error('Erro ao salvar sorteio no JSONBin.io:', error);
            alert("Erro ao publicar o sorteio online. Verifique o console.");
            // sorteioInfo.textContent = `Erro ao publicar sorteio: ${error.message}`; // Comentado para não exibir se sorteioInfo estiver oculto
        });
    });

    // Inicia a verificação periódica do JSONBin.io
    setInterval(checkAndUpdateSorteioResult, 5000); // Verifica a cada 5 segundos

    // Carrega os dados iniciais do grafo e então, o último sorteio do JSONBin.io
    loadGraphDataFromJson(); 

}, 200);