import pandas as pd
import networkx as nx
from pyvis.network import Network
from collections import Counter
import re

# (Seu código de leitura de CSV e criação do grafo G - NADA MUDOU AQUI)
df = pd.read_csv('ListaParticipantes_Elas.csv', sep=';')
df = df[['Nome', 'Quais áreas da tecnologia mais despertam seu interesse?']]
df = df.dropna(subset=['Nome', 'Quais áreas da tecnologia mais despertam seu interesse?'])

G = nx.Graph()
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


# Configuração da rede
net = Network(height='900px', width='100%', bgcolor='#CCCCCC', font_color='black', notebook=False, cdn_resources='remote')
net.barnes_hut(gravity=-10000, central_gravity=0.3, spring_length=50)

# Suas cores existentes
cores_pessoas_base = ['#a30161', '#f4cbc1', '#0097b2', '#fbb633', '#8A2BE2', '#DC143C', '#228B22', '#FF8C00'] # Adicionei mais algumas cores para ter mais variedade
cor_interesse = '#d52c01'
cor_arestas = '#1C133B'

# --- NOVO: Mapeamento de pessoas para cores ---
pessoa_cores = {} # Dicionário para armazenar a cor de cada pessoa
cor_index = 0     # Índice para ciclar pelas cores

# Primeiro, identifique todas as pessoas no grafo
todas_as_pessoas = [node for node, data in G.nodes(data=True) if data['tipo'] == 'pessoa']

# Atribua uma cor para cada pessoa de forma cíclica
for pessoa in todas_as_pessoas:
    pessoa_cores[pessoa] = cores_pessoas_base[cor_index % len(cores_pessoas_base)]
    cor_index += 1 # Avance para a próxima cor

# Adição de nós com estilização
for node in G.nodes():
    tipo = G.nodes[node]['tipo']
    if tipo == 'interesse':
        net.add_node(node, label=node, shape='circle', size=35,
                     color=cor_interesse, font={'size': 26, 'bold': True, 'vadjust': 5, 'multi': 'md'})
    else: # É uma pessoa
        # Use a cor atribuída do dicionário
        cor_pessoa = pessoa_cores[node] 
        net.add_node(node, label=node, shape='dot', size=30,
                     color=cor_pessoa, borderWidth=2, font={'size': 20, 'color': '#5D3B2E', 'face': 'arial', 'vadjust': 5, 'multi': 'md'})

# Adição das arestas (seu código existente)
for source, target in G.edges():
    net.add_edge(source, target, color=cor_arestas)

net.from_nx(G) # Mantém esta linha, mas ela pode ser redundante se você já adicionou todos os nós e arestas.
               # Se você já adicionou todos os nós e arestas manualmente, pode remover ou manter, não deve causar problema.
               # O importante é que a atribuição de cor para pessoas acontece antes.

net.force_atlas_2based(gravity=-30)
net.show_buttons(filter_=['physics'])

# (Seu código para gerar o grafo_interesses_full.html - NADA MUDOU AQUI)
output_full_html_file_name = "grafo_interesses_full.html"
net.show(output_full_html_file_name)
print(f"HTML completo do grafo salvo em {output_full_html_file_name}")