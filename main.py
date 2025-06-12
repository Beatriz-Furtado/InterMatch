import pandas as pd
import networkx as nx
from pyvis.network import Network
from collections import Counter
import re
import json # Importa a biblioteca json

# --- LEITURA DE CSV E CRIAÇÃO DO GRAFO NETWORKX (G) ---
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


# --- CONFIGURAÇÃO DA REDE PYVIS ---
net = Network(height='900px', width='100%', bgcolor='#CCCCCC', font_color='black', notebook=False, cdn_resources='remote')
net.barnes_hut(gravity=-10000, central_gravity=0.3, spring_length=50)

# Suas cores existentes
cores_pessoas_base = ['#a30161', '#f4cbc1', '#0097b2', '#fbb633', '#8A2BE2', '#DC143C', '#228B22', '#FF8C00']
cor_interesse = '#d52c01'
cor_arestas = '#1C133B'

# --- MAPEAMENTO DE PESSOAS PARA CORES (PYVIS) ---
pessoa_cores = {}
cor_index = 0
todas_as_pessoas = [node for node, data in G.nodes(data=True) if data['tipo'] == 'pessoa']
for pessoa in todas_as_pessoas:
    pessoa_cores[pessoa] = cores_pessoas_base[cor_index % len(cores_pessoas_base)]
    cor_index += 1

# --- ADIÇÃO DE NÓS E ARESTAS NO PYVIS COM ESTILIZAÇÃO ---
for node in G.nodes():
    tipo = G.nodes[node]['tipo']
    if tipo == 'interesse':
        net.add_node(node, label=node, shape='circle', size=35,
                     color=cor_interesse, font={'size': 26, 'bold': True, 'vadjust': 5, 'multi': 'md'})
    else: # É uma pessoa
        cor_pessoa = pessoa_cores[node] 
        net.add_node(node, label=node, shape='dot', size=30,
                     color=cor_pessoa, borderWidth=2, font={'size': 20, 'color': '#5D3B2E', 'face': 'arial', 'vadjust': 5, 'multi': 'md'})

for source, target in G.edges():
    net.add_edge(source, target, color=cor_arestas)

# --- CONFIGURAÇÃO DE FÍSICA E BOTÕES PYVIS ---
net.force_atlas_2based(gravity=-30)
net.show_buttons(filter_=['physics'])

# --- GERAÇÃO DO HTML DO GRAFO DE INTERESSES (PYVIS) ---
output_full_html_file_name = "grafo_interesses_full.html"
net.show(output_full_html_file_name)
print(f"HTML completo do grafo salvo em {output_full_html_file_name}")

# --- BLOCO: EXPORTAÇÃO DOS DADOS DO GRAFO PARA JSON ---
nodes_for_json = []
for node, data in G.nodes(data=True):
    node_id = str(node)
    node_label = str(node)

    node_data = {
        'id': node_id,
        'label': node_label,
        'tipo': data['tipo']
    }
    if data['tipo'] == 'pessoa':
        node_data['color'] = pessoa_cores.get(node_id)
        node_data['shape'] = 'dot'
    else: # Interesse
        node_data['color'] = cor_interesse
        node_data['shape'] = 'circle'
    
    nodes_for_json.append(node_data)

edges_for_json = []
for source, target in G.edges():
    edges_for_json.append({
        'from': str(source),
        'to': str(target)
    })

graph_data_json = {
    'nodes': nodes_for_json,
    'edges': edges_for_json
}

output_json_file_name = "graph_data.json"
with open(output_json_file_name, "w", encoding="utf-8") as f:
    json.dump(graph_data_json, f, indent=4) # indent para legibilidade
print(f"Dados do grafo exportados para {output_json_file_name}")