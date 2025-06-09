import pandas as pd
import networkx as nx
from pyvis.network import Network
from collections import Counter

# 1. Ler CSV
df = pd.read_csv('ListaParticipantes_Elas.csv', sep=';')
df = df[['Nome', 'Quais áreas da tecnologia mais despertam seu interesse?']]
df = df.dropna(subset=['Nome', 'Quais áreas da tecnologia mais despertam seu interesse?'])

# 2. Criar grafo
G = nx.Graph()
interesse_freq = Counter()

for _, row in df.iterrows():
    pessoa = row['Nome']
    interesses_raw = row['Quais áreas da tecnologia mais despertam seu interesse?']

    if pd.isna(interesses_raw):
        continue

    interesses = interesses_raw.split(';')
    for interesse in interesses:
        interesse = interesse.strip()
        G.add_node(pessoa, tipo='pessoa')
        G.add_node(interesse, tipo='interesse')
        G.add_edge(pessoa, interesse)

# Criação da visualização
net = Network(height='900px', width='100%', bgcolor='#CBBDBA', font_color='black', notebook=False, cdn_resources='remote')

# Física do grafo
net.barnes_hut(gravity=-10000, central_gravity=0.3, spring_length=50)

# Cores pastéis para estilo feminino
cores_pessoas = ['#F2A46C', '#C2A0C8', '#F2A46C', '#D78A94', '#F8D9DA', '#FF7F50', '#A0522D']
cor_interesse = '#3A4453'
cor_arestas = '#5D3B2E'

# Adição de nós com estilização
for node in G.nodes():
    tipo = G.nodes[node]['tipo']
    if tipo == 'interesse':
        net.add_node(node, label=node, shape='circle', size=35,
                     color=cor_interesse, font={'size': 26, 'bold': True, 'vadjust': 5, 'multi': 'md'})
    else:
        cor_pessoa = cores_pessoas[hash(node) % len(cores_pessoas)]
        net.add_node(node, label=node, shape='dot', size=60,
                     color=cor_pessoa, borderWidth=2, font={'size': 20, 'color': '#5D3B2E', 'face': 'arial', 'vadjust': 5, 'multi': 'md'})

# Adição das arestas
for source, target in G.edges():
    net.add_edge(source, target, color=cor_arestas)

net.from_nx(G)

net.force_atlas_2based(gravity=-30)
net.show_buttons(filter_=['physics'])
net.show("grafo_interesses.html")
